from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from scanner import VulnerabilityScanner
import asyncio

# Import auth routes and utilities
from routes.auth_routes import router as auth_router
from auth import get_current_user

# Import security middleware
from security_middleware import SecurityMiddleware, validate_text_input, validate_url_input


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Shared DB connection
from db_connection import client, db

# Create the main app without a prefix
app = FastAPI()
handler = app # Alias for Vercel

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket manager
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

ws_manager = WebSocketManager()


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ScanCreate(BaseModel):
    name: str
    target: str
    scanType: str = "web"

class Scan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None  # ID do usuário que criou o scan
    name: str
    target: str
    scanType: str
    status: str = "pending"
    progress: int = 0
    currentTask: str = "Initializing..."
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Vulnerability(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scan_id: str
    severity: str
    title: str
    description: str
    category: str
    endpoint: str
    payload: str
    evidence: str
    recommendation: str
    cve: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scanId: str
    title: str
    format: str = "txt"
    content: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Pentester & OSINT Toolkit API"}

# Status check routes (legacy)
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Scanner routes
@api_router.post("/scans", response_model=Scan)
async def create_scan(scan_input: ScanCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Criar novo scan (autenticado)"""
    
    # 🛡️ Validar inputs contra payloads maliciosos
    validated_name = validate_text_input(scan_input.name, "scan name", max_length=200)
    validated_target = validate_url_input(scan_input.target)
    validated_scan_type = validate_text_input(scan_input.scanType, "scan type", max_length=50)
    
    scan = Scan(
        name=validated_name,
        target=validated_target,
        scanType=validated_scan_type,
        user_id=current_user["id"],  # Associar ao usuário autenticado
        status="pending",
        startedAt=datetime.now(timezone.utc)
    )
    
    doc = scan.model_dump()
    doc['startedAt'] = doc['startedAt'].isoformat()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.scans.insert_one(doc)
    
    # Iniciar scan em background
    background_tasks.add_task(run_scan, scan.id, scan.target, scan.scanType)
    
    return scan

async def run_scan(scan_id: str, target: str, scan_type: str):
    """Executar scan em background"""
    try:
        # Atualizar status para running
        await db.scans.update_one(
            {"id": scan_id},
            {"$set": {"status": "running", "progress": 0}}
        )
        await ws_manager.broadcast({
            "type": "scan-update",
            "scanId": scan_id,
            "update": {"status": "running", "progress": 0}
        })
        
        # Executar scan rápido com o VulnerabilityScanner (scanner.py)
        scanner = VulnerabilityScanner(ws_manager)
        
        async def status_callback(update):
            await db.scans.update_one({"id": scan_id}, {"$set": update})
            await ws_manager.broadcast({
                "type": "scan-update",
                "scanId": scan_id,
                "update": update
            })
        
        vulnerabilities = await scanner.scan_target(scan_id, target, scan_type, status_callback)
        
        # Salvar vulnerabilidades
        for vuln in vulnerabilities:
            vuln_doc = vuln.copy()
            vuln_doc['id'] = str(uuid.uuid4())
            vuln_doc['createdAt'] = datetime.now(timezone.utc).isoformat()
            await db.vulnerabilities.insert_one(vuln_doc)
            
            await ws_manager.broadcast({
                "type": "vulnerability-found",
                "scanId": scan_id,
                "vulnerability": vuln_doc
            })
        
        # Finalizar scan
        await db.scans.update_one(
            {"id": scan_id},
            {"$set": {
                "status": "completed",
                "progress": 100,
                "currentTask": "Scan completed",
                "completedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        await ws_manager.broadcast({
            "type": "scan-update",
            "scanId": scan_id,
            "update": {"status": "completed", "progress": 100}
        })
        
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        await db.scans.update_one(
            {"id": scan_id},
            {"$set": {"status": "failed", "currentTask": f"Error: {str(e)}"}}
        )

@api_router.get("/scans")
async def get_scans(
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 20,
    sort_by: str = "createdAt",
    order: str = "desc"
):
    """
    Listar scans do usuário autenticado com paginação
    
    Args:
        page: Número da página (default: 1)
        limit: Itens por página (default: 20, max: 100)
        sort_by: Campo para ordenação (default: createdAt)
        order: Ordem (asc/desc, default: desc)
    """
    # 🛡️ Validar parâmetros
    page = max(1, min(page, 10000))  # Entre 1 e 10000
    limit = max(1, min(limit, 100))  # Entre 1 e 100
    sort_order = -1 if order == "desc" else 1
    
    # Campos permitidos para ordenação
    allowed_sort_fields = ["createdAt", "name", "status", "target"]
    sort_field = sort_by if sort_by in allowed_sort_fields else "createdAt"
    
    # Calcular skip
    skip = (page - 1) * limit
    
    # Contar total de scans
    total_scans = await db.scans.count_documents({"user_id": current_user["id"]})
    
    # Buscar scans com paginação
    scans = await db.scans.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
    
    # Processar datas
    for scan in scans:
        if scan.get('startedAt') and isinstance(scan['startedAt'], str):
            scan['startedAt'] = datetime.fromisoformat(scan['startedAt'])
        if scan.get('completedAt') and isinstance(scan['completedAt'], str):
            scan['completedAt'] = datetime.fromisoformat(scan['completedAt'])
        if isinstance(scan['createdAt'], str):
            scan['createdAt'] = datetime.fromisoformat(scan['createdAt'])
    
    # Calcular metadados de paginação
    total_pages = (total_scans + limit - 1) // limit  # Ceiling division
    
    return {
        "scans": scans,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_scans,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }

@api_router.get("/scans/{scan_id}", response_model=Scan)
async def get_scan(scan_id: str, current_user: dict = Depends(get_current_user)):
    """Obter scan específico (apenas do usuário)"""
    scan = await db.scans.find_one({"id": scan_id, "user_id": current_user["id"]}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.get('startedAt') and isinstance(scan['startedAt'], str):
        scan['startedAt'] = datetime.fromisoformat(scan['startedAt'])
    if scan.get('completedAt') and isinstance(scan['completedAt'], str):
        scan['completedAt'] = datetime.fromisoformat(scan['completedAt'])
    if isinstance(scan['createdAt'], str):
        scan['createdAt'] = datetime.fromisoformat(scan['createdAt'])
    return scan

@api_router.get("/scans/{scan_id}/vulnerabilities", response_model=List[Vulnerability])
async def get_vulnerabilities(scan_id: str, current_user: dict = Depends(get_current_user)):
    """Listar vulnerabilidades de um scan (apenas do usuário)"""
    # Verificar se o scan pertence ao usuário
    scan = await db.scans.find_one({"id": scan_id, "user_id": current_user["id"]})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    vulns = await db.vulnerabilities.find({"scan_id": scan_id}, {"_id": 0}).to_list(1000)
    for vuln in vulns:
        if isinstance(vuln['createdAt'], str):
            vuln['createdAt'] = datetime.fromisoformat(vuln['createdAt'])
    return vulns

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Estatísticas do usuário autenticado"""
    # Buscar IDs dos scans do usuário
    user_scans = await db.scans.find({"user_id": current_user["id"]}, {"id": 1}).to_list(1000)
    scan_ids = [s["id"] for s in user_scans]
    
    total_scans = len(scan_ids)
    total_vulns = await db.vulnerabilities.count_documents({"scan_id": {"$in": scan_ids}})
    critical_vulns = await db.vulnerabilities.count_documents({"scan_id": {"$in": scan_ids}, "severity": "critical"})
    high_vulns = await db.vulnerabilities.count_documents({"scan_id": {"$in": scan_ids}, "severity": "high"})
    
    return {
        "totalScans": total_scans,
        "totalVulnerabilities": total_vulns,
        "criticalVulnerabilities": critical_vulns,
        "highVulnerabilities": high_vulns
    }

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for now
            await websocket.send_json({"type": "pong", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# Include the router in the main app
app.include_router(api_router)

# ========================================
# 🛡️ SECURITY MIDDLEWARE - DDoS/DoS/Payload Protection
# ========================================
app.add_middleware(SecurityMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Include auth routes
app.include_router(auth_router)

# Import and include tools routes
from routes.tools_routes import router as tools_router
app.include_router(tools_router, prefix="/api/tools", tags=["tools"])

# Import and include admin routes
from routes.admin_routes import router as admin_router
app.include_router(admin_router)

@app.on_event("startup")
async def start_telegram_bot():
    """Lança o Telegram bot como thread dentro do processo do backend"""
    import threading
    def run_bot():
        try:
            from telegram_bot import main as bot_main
            bot_main()
        except Exception as e:
            logger.error(f"Telegram bot error: {e}")
    
    bot_thread = threading.Thread(target=run_bot, daemon=True, name="TelegramBot")
    bot_thread.start()
    logger.info("🤖 Telegram bot started as background thread")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)