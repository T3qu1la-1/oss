"""
👑 ROTAS DE ADMINISTRADOR - Painel Completo
Admin login separado via JSON, com stats de sistema, gerenciamento de usuários,
status do bot e alarmes de DDoS.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from auth import get_current_admin
import os
import json
import psutil
from datetime import datetime
from pathlib import Path
import time
from db_connection import db, users_collection, telegram_users_collection, scans_collection

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Contadores em memória (persistidos via endpoint)
_visit_counter = {"total": 0, "last_reset": datetime.utcnow().isoformat()}
_ddos_alerts = []
_request_tracker = {}  # IP -> [timestamps]

DDOS_THRESHOLD = 100  # requests por minuto por IP
DDOS_WINDOW = 60      # janela de 60 segundos


def get_project_size():
    """Calcula o tamanho total do projeto em MB"""
    project_dir = Path(__file__).parent.parent
    total = 0
    for p in project_dir.rglob("*"):
        if p.is_file() and "node_modules" not in str(p) and ".git" not in str(p):
            total += p.stat().st_size
    return round(total / (1024 * 1024), 2)


@router.post("/login")
async def admin_login(request: Request):
    """Login exclusivo do admin via arquivo JSON separado"""
    body = await request.json()
    email = str(body.get("email", ""))
    password = str(body.get("password", ""))

    creds_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "admin_credentials.json")
    try:
        with open(creds_path, 'r') as f:
            admin_creds = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Arquivo de credenciais admin não encontrado")

    if email != admin_creds["email"] or password != admin_creds["password"]:
        raise HTTPException(status_code=401, detail="Credenciais de admin inválidas")

    from auth import create_access_token
    token = create_access_token(data={"sub": admin_creds["email"], "role": "admin"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "admin",
        "username": admin_creds["username"]
    }


@router.get("/users")
async def get_all_users(current_admin: dict = Depends(get_current_admin)):
    """Listar todos os usuários com emails e dados"""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    telegram_users = await db.telegram_users.find({}, {"_id": 0}).to_list(1000)

    return {
        "total": len(users) + len(telegram_users),
        "regular_users": users,
        "telegram_users": telegram_users
    }


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Deletar usuário"""
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        result = await db.telegram_users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"message": "Usuário deletado com sucesso", "user_id": user_id}


@router.get("/stats")
async def get_system_stats(current_admin: dict = Depends(get_current_admin)):
    """Stats completo: CPU, RAM, disco, projeto, visitas, DB"""
    cpu_percent = psutil.cpu_percent(interval=0.5)
    cpu_count = psutil.cpu_count()

    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    # Processo atual do backend
    process = psutil.Process(os.getpid())
    backend_memory_mb = round(process.memory_info().rss / (1024 * 1024), 2)
    backend_cpu = round(process.cpu_percent(interval=0.3), 2)

    total_users = await db.users.count_documents({})
    total_telegram_users = await db.telegram_users.count_documents({})
    total_scans = await db.scans.count_documents({})

    project_size_mb = get_project_size()

    return {
        "system": {
            "cpu": {"usage_percent": round(cpu_percent, 2), "cores": cpu_count},
            "memory": {
                "total_gb": round(memory.total / (1024 ** 3), 2),
                "used_gb": round(memory.used / (1024 ** 3), 2),
                "percent": round(memory.percent, 2)
            },
            "storage": {
                "total_gb": round(disk.total / (1024 ** 3), 2),
                "used_gb": round(disk.used / (1024 ** 3), 2),
                "percent": round(disk.percent, 2)
            }
        },
        "backend_process": {
            "memory_mb": backend_memory_mb,
            "cpu_percent": backend_cpu
        },
        "project": {
            "size_mb": project_size_mb
        },
        "database": {
            "users": total_users,
            "telegram_users": total_telegram_users,
            "scans": total_scans,
            "engine": "RocksDB"
        },
        "visits": _visit_counter,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/telegram/status")
async def get_telegram_bot_status(current_admin: dict = Depends(get_current_admin)):
    """Verificar status do bot do Telegram"""
    import httpx

    bot_token = "8797087932:AAHpK-rhf5m3osBSB4PYJiwoaa-aAv_KSs4"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client_http:
            r = await client_http.get(f"https://api.telegram.org/bot{bot_token}/getMe")
            me_data = r.json() if r.status_code == 200 else {}

            r2 = await client_http.get(f"https://api.telegram.org/bot{bot_token}/getWebhookInfo")
            webhook_data = r2.json() if r2.status_code == 200 else {}

        is_online = me_data.get("ok", False)
        bot_info = me_data.get("result", {})
        pending_updates = webhook_data.get("result", {}).get("pending_update_count", 0)

        return {
            "online": is_online,
            "bot_username": bot_info.get("username", "N/A"),
            "bot_name": bot_info.get("first_name", "N/A"),
            "pending_updates": pending_updates,
            "registered_users": await db.telegram_users.count_documents({})
        }
    except Exception as e:
        return {"online": False, "error": str(e)}


@router.get("/ddos/alerts")
async def get_ddos_alerts(current_admin: dict = Depends(get_current_admin)):
    """Retornar alarmes de DDoS/DoS"""
    return {
        "active_alerts": len(_ddos_alerts),
        "threshold": f"{DDOS_THRESHOLD} req/min per IP",
        "alerts": _ddos_alerts[-20:]  # últimos 20
    }


@router.post("/visits/track")
async def track_visit(request: Request):
    """Registrar uma visita ao site (chamado pelo frontend)"""
    _visit_counter["total"] += 1
    
    # Rastrear possível DDoS por IP
    ip = request.client.host if request.client else "unknown"
    now = time.time()

    if ip not in _request_tracker:
        _request_tracker[ip] = []

    _request_tracker[ip].append(now)
    # Limpar timestamps antigos
    _request_tracker[ip] = [t for t in _request_tracker[ip] if now - t < DDOS_WINDOW]

    if len(_request_tracker[ip]) > DDOS_THRESHOLD:
        alert = {
            "ip": ip,
            "requests_per_minute": len(_request_tracker[ip]),
            "timestamp": datetime.utcnow().isoformat(),
            "severity": "HIGH" if len(_request_tracker[ip]) > DDOS_THRESHOLD * 2 else "MEDIUM"
        }
        _ddos_alerts.append(alert)
        # Manter apenas os últimos 100 alerts
        if len(_ddos_alerts) > 100:
            _ddos_alerts.pop(0)

    return {"visits": _visit_counter["total"]}


@router.get("/scans/all")
async def get_all_scans(current_admin: dict = Depends(get_current_admin)):
    """Listar todos os scans do sistema"""
    scans = await db.scans.find({}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return {"total": len(scans), "scans": scans}
