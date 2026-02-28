from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid
from auth import hash_password, verify_password, create_access_token, get_current_user
from models.user import UserCreate, UserLogin, UserResponse, TokenResponse
import os

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# MongoDB connection
client = AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.getenv('DB_NAME', 'olhos_de_deus')]
users_collection = db['users']

@router.post("/register", response_model=TokenResponse)
async def register(user: UserCreate):
    """Register new user"""
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Create new user
    user_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    user_dict = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "hashed_password": hash_password(user.password),
        "created_at": now,
        "last_login": now
    }
    
    await users_collection.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id, "email": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user.email,
            "name": user.name,
            "created_at": now
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user"""
    # Find user
    user = await users_collection.find_one({"email": credentials.email})
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
    access_token = create_access_token(data={"sub": user['id'], "email": user['email']})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
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
        "name": user['name'],
        "created_at": user['created_at']
    }

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user (client should remove token)"""
    return {"message": "Logout realizado com sucesso"}
