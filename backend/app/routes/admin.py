from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials, HTTPBearer, HTTPAuthorizationCredentials
import secrets
import os
import jwt
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])

security_basic = HTTPBasic()
security_bearer = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", "60"))
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

def create_jwt_token(subject: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=JWT_EXP_MINUTES)
    payload = {"sub": subject, "exp": exp}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token if isinstance(token, str) else token.decode("utf-8")

def decode_jwt_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/login")
def login(credentials: HTTPBasicCredentials = Depends(security_basic)):
    username_ok = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    password_ok = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (username_ok and password_ok):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"token": create_jwt_token(credentials.username), "expires_in_minutes": JWT_EXP_MINUTES}

async def admin_required(creds: HTTPAuthorizationCredentials = Depends(security_bearer)):
    token = creds.credentials
    payload = decode_jwt_token(token)
    if payload.get("sub") != ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="Forbidden")
    return payload
