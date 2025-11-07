from fastapi import APIRouter, HTTPException, Depends
from app.database import db
from app.utils import simulate_match_logic
from app.routes.admin import admin_required

router = APIRouter(prefix="/matches", tags=["Matches"])

@router.get("/{match_id}")
async def get_match(match_id: str):
    match = await db.matches.find_one({"_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

@router.post("/{match_id}/simulate")
async def simulate_match(match_id: str, admin=Depends(admin_required)):
    updated_match = await simulate_match_logic(match_id)
    return {"match": updated_match}
