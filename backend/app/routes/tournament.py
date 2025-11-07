from fastapi import APIRouter, HTTPException, Depends
from app.database import db
from app.utils import build_quarter_bracket
from app.routes.admin import admin_required

router = APIRouter(prefix="/tournament", tags=["Tournament"])

@router.post("/start")
async def start_tournament(admin=Depends(admin_required)):
    count = await db.teams.count_documents({})
    if count < 8:
        raise HTTPException(status_code=400, detail="Need at least 8 teams")
    return {"tournament": await build_quarter_bracket()}

@router.get("/bracket")
async def get_bracket():
    tour = await db.tournaments.find_one({})
    if not tour:
        return {"message": "No tournament yet"}
    matches = await db.matches.find({"tournamentId": tour["_id"]}).to_list(None)
    return {"tournament": tour, "matches": matches}
