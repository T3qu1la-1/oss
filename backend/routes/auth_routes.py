from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime
import uuid
from auth import hash_password, verify_password, create_access_token, get_current_user, check_admin_credentials, ADMIN_CREDENTIALS
from models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from security_middleware import validate_email_input, validate_text_input
import os
from db_connection import db, users_collection, telegram_users_collection, scans_collection

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(user: UserCreate):
    """Register new user with input validation and unique email/username check"""
    
    # 🛡️ Validar inputs contra payloads maliciosos
    validated_email = validate_email_input(user.email)
    validated_username = validate_text_input(user.username, "username", max_length=100)
    
    # Validar senha (comprimento mínimo)
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter no mínimo 6 caracteres")
    if len(user.password) > 128:
        raise HTTPException(status_code=400, detail="Senha muito longa (máximo 128 caracteres)")
    
    # ✅ VERIFICAR SE EMAIL JÁ EXISTE (em TODOS os tipos de usuários)
    existing_email = await users_collection.find_one({"email": validated_email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # ✅ VERIFICAR SE USERNAME JÁ EXISTE (único no sistema)
    existing_username = await users_collection.find_one({"username": validated_username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Nome de usuário já está em uso")
    
    # Create new user
    user_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    user_dict = {
        "id": user_id,
        "email": validated_email,
        "username": validated_username,
        "hashed_password": hash_password(user.password),
        "role": "user",
        "created_at": now,
        "last_login": now
    }
    
    await users_collection.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id, "email": validated_email, "role": "user"})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": validated_email,
            "username": validated_username,
            "role": "user",
            "created_at": now
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user with input validation"""
    
    # 🛡️ Validar inputs
    validated_email = validate_email_input(credentials.email)
    
    # 👑 VERIFICAR SE É ADMIN PRIMEIRO
    if check_admin_credentials(validated_email, credentials.password):
        # Login como admin
        admin_id = "admin_master_001"
        access_token = create_access_token(data={
            "sub": admin_id, 
            "email": validated_email,
            "role": "admin"
        })
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": admin_id,
                "email": validated_email,
                "username": ADMIN_CREDENTIALS.get('username', 'Admin Master'),
                "role": "admin",
                "created_at": datetime.utcnow()
            }
        }
    
    # Find user normal
    user = await users_collection.find_one({"email": validated_email})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    # Verify password
    if not verify_password(credentials.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    # Update last login
    await users_collection.update_one(
        {"id": user['id']},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create access token
    access_token = create_access_token(data={
        "sub": user['id'], 
        "email": user['email'],
        "role": user.get('role', 'user')
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "email": user['email'],
            "username": user['username'],
            "role": user.get('role', 'user'),
            "created_at": user['created_at']
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user = await users_collection.find_one({"id": current_user['id']})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {
        "id": user['id'],
        "email": user['email'],
        "username": user['username'],
        "created_at": user['created_at']
    }

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user (client should remove token)"""
    return {"message": "Logout realizado com sucesso"}

# ============================================
# 📱 TELEGRAM AUTHENTICATION
# ============================================

telegram_users_collection = db['telegram_users']

@router.post("/telegram/login")
async def telegram_login(data: dict, request: Request):
    """Login via Telegram ID + senha + IP (capturado automaticamente)"""
    telegram_id = data.get("telegram_id")
    password = data.get("password")

    if not isinstance(telegram_id, str) or not isinstance(password, str):
        raise HTTPException(status_code=400, detail="Entradas inválidas. O Telegram ID e senha devem ser texto.")
    
    # Capturar IP do request
    ip_address = request.client.host
    
    if not telegram_id or not password:
        raise HTTPException(status_code=400, detail="Telegram ID e senha são obrigatórios")
    
    # Buscar usuário do Telegram
    telegram_user = await telegram_users_collection.find_one({"telegram_id": str(telegram_id)})
    
    if not telegram_user:
        raise HTTPException(status_code=401, detail="Telegram ID não encontrado. Use /start no bot para se registrar.")
    
    # Verificar senha (comparação direta, pois foi salva em texto pelo bot)
    if telegram_user.get('password') != password:
        raise HTTPException(status_code=401, detail="Senha incorreta")
    
    # Verificar IP (se já tiver IPs registrados)
    user_ips = telegram_user.get('ips', [])
    
    # Se for o primeiro login, adicionar IP
    if len(user_ips) == 0:
        await telegram_users_collection.update_one(
            {"telegram_id": str(telegram_id)},
            {
                "$push": {"ips": ip_address},
                "$set": {"last_login": datetime.utcnow()}
            }
        )
    elif ip_address not in user_ips:
        # IP diferente, mas permitir e adicionar
        await telegram_users_collection.update_one(
            {"telegram_id": str(telegram_id)},
            {
                "$push": {"ips": ip_address},
                "$set": {"last_login": datetime.utcnow()}
            }
        )
    else:
        # IP já registrado, atualizar last_login
        await telegram_users_collection.update_one(
            {"telegram_id": str(telegram_id)},
            {"$set": {"last_login": datetime.utcnow()}}
        )
    
    # Criar token
    user_id = telegram_user['id']
    access_token = create_access_token(data={
        "sub": user_id,
        "email": f"telegram_{telegram_id}@telegram.user",
        "telegram_id": str(telegram_id),
        "role": "telegram_user"
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "telegram_id": str(telegram_id),
            "username": telegram_user.get('telegram_username', 'telegram_user'),
            "first_name": telegram_user.get('first_name', 'User'),
            "role": "telegram_user",
            "created_at": telegram_user.get('created_at')
        }
    }

@router.get("/telegram/check/{telegram_id}")
async def check_telegram_user(telegram_id: str):
    """Verificar se Telegram ID já está registrado"""
    
    # Prevenir NoSQLi via query params convertidos para dict pelo framework
    telegram_id = str(telegram_id)
    
    user = await telegram_users_collection.find_one({"telegram_id": telegram_id})
    
    if user:
        return {
            "registered": True,
            "telegram_id": telegram_id,
            "username": user.get('telegram_username', 'User')
        }
    else:
        return {
            "registered": False,
            "telegram_id": telegram_id,
            "message": "Use /start no bot @MarfinnoBot para se registrar"
        }

