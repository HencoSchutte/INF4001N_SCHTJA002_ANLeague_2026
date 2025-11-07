from fastapi import APIRouter, HTTPException, Body
from app.database import db
from app.models import UpdatePlayerPayload
from app.utils import compute_team_rating

router = APIRouter(prefix="/players", tags=["Players"])

@router.get("")
async def list_players():
    return await db.players.find({}).to_list(None)

@router.get("/{player_id}")
async def get_player(player_id: str):
    player = await db.players.find_one({"_id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.put("/{player_id}")
async def update_player(player_id: str, payload: UpdatePlayerPayload = Body(...)):
    player = await db.players.find_one({"_id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    await db.players.update_one({"_id": player_id}, {"$set": update_data})
    if "ratings" in update_data or "naturalPosition" in update_data:
        team_id = player.get("teamId")
        if team_id:
            rating = await compute_team_rating(team_id)
            await db.teams.update_one({"_id": team_id}, {"$set": {"rating": rating}})
    return {"message": "Player updated"}

@router.delete("/{player_id}")
async def delete_player(player_id: str):
    player = await db.players.find_one({"_id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    await db.players.delete_one({"_id": player_id})
    return {"message": "Player deleted"}
