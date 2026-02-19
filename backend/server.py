from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from scanner import VulnerabilityScanner
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

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
async def create_scan(scan_input: ScanCreate, background_tasks: BackgroundTasks):
    """Criar novo scan"""
    scan = Scan(
        name=scan_input.name,
        target=scan_input.target,
        scanType=scan_input.scanType,
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
        
        # Executar scan
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

@api_router.get("/scans", response_model=List[Scan])
async def get_scans():
    """Listar todos os scans"""
    scans = await db.scans.find({}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    for scan in scans:
        if scan.get('startedAt') and isinstance(scan['startedAt'], str):
            scan['startedAt'] = datetime.fromisoformat(scan['startedAt'])
        if scan.get('completedAt') and isinstance(scan['completedAt'], str):
            scan['completedAt'] = datetime.fromisoformat(scan['completedAt'])
        if isinstance(scan['createdAt'], str):
            scan['createdAt'] = datetime.fromisoformat(scan['createdAt'])
    return scans

@api_router.get("/scans/{scan_id}", response_model=Scan)
async def get_scan(scan_id: str):
    """Obter scan específico"""
    scan = await db.scans.find_one({"id": scan_id}, {"_id": 0})
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
async def get_vulnerabilities(scan_id: str):
    """Listar vulnerabilidades de um scan"""
    vulns = await db.vulnerabilities.find({"scan_id": scan_id}, {"_id": 0}).to_list(1000)
    for vuln in vulns:
        if isinstance(vuln['createdAt'], str):
            vuln['createdAt'] = datetime.fromisoformat(vuln['createdAt'])
    return vulns

@api_router.get("/stats")
async def get_stats():
    """Estatísticas gerais"""
    total_scans = await db.scans.count_documents({})
    total_vulns = await db.vulnerabilities.count_documents({})
    critical_vulns = await db.vulnerabilities.count_documents({"severity": "critical"})
    high_vulns = await db.vulnerabilities.count_documents({"severity": "high"})
    
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()