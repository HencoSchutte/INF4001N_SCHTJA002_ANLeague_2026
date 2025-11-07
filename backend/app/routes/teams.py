from fastapi import APIRouter, HTTPException, Body
from app.database import db
from app.models import TeamInDB, CreateTeamPayload
from app.utils import make_id, compute_team_rating, generate_player, POSITIONS
import random

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.post("")
async def create_team(payload: CreateTeamPayload):
    existing = await db.teams.find_one({"country": payload.country})
    if existing:
        raise HTTPException(status_code=400, detail="Team already exists")
    team_doc = TeamInDB(**payload.dict()).dict()
    team_doc["_id"] = make_id("team")
    await db.teams.insert_one(team_doc)
    return {"teamId": team_doc["_id"], "message": "Team created"}

@router.post("/{team_id}/autofill")
async def autofill_team(team_id: str):
    team = await db.teams.find_one({"_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    squad_ids, gk_positions = [], ["GK", "GK"]
    other_positions = random.choices(POSITIONS, weights=[0,7,8,6], k=21)
    positions = gk_positions + other_positions
    random.shuffle(positions)

    cap_idx = random.randrange(23)
    for i, pos in enumerate(positions):
        player = generate_player(pos, make_captain=(i == cap_idx))
        pid = make_id("pl")
        p_doc = player.dict()
        p_doc["_id"] = pid
        p_doc["teamId"] = team_id
        await db.players.insert_one(p_doc)
        squad_ids.append(pid)

    team_rating = await compute_team_rating(team_id)
    await db.teams.update_one({"_id": team_id}, {"$set": {"squad": squad_ids, "rating": team_rating}})
    return {"teamId": team_id, "squadCount": 23, "teamRating": team_rating}

@router.get("")
async def list_teams():
    return await db.teams.find({}).to_list(None)

@router.get("/{team_id}")
async def get_team(team_id: str):
    team = await db.teams.find_one({"_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team
