from fastapi import APIRouter
from app.database import db
from app.utils import make_id
from datetime import datetime
import random

router = APIRouter(prefix="/seed", tags=["Seed"])

@router.post("/create_demo_teams")
async def create_demo_teams():
    await db.teams.delete_many({})
    demo_countries = ["Ghana", "Senegal", "Egypt", "Morocco", "Algeria", "Nigeria", "Cameroon"]
    created = []
    for c in demo_countries:
        team_id = make_id("team")
        team = {
            "_id": team_id,
            "country": c,
            "managerName": f"Manager {c}",
            "representativeEmail": f"rep_{c.lower()}@example.com",
            "squad": [],
            "rating": 0,
            "createdAt": datetime.utcnow()
        }
        await db.teams.insert_one(team)
        created.append(team_id)
    return {"created": created}

@router.post("/add_demo_team")
async def add_demo_team():
    country = f"DemoLand{random.randint(1,999)}"
    team_id = make_id("team")
    await db.teams.insert_one({
        "_id": team_id,
        "country": country,
        "managerName": f"Manager {country}",
        "representativeEmail": f"rep_{country.lower()}@example.com",
        "squad": [],
        "rating": 0,
        "createdAt": datetime.utcnow()
    })
    return {"teamId": team_id, "country": country}
