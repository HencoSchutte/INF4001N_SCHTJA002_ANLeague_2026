"""
FastAPI Starter for "African Nations League" assignment

This single-file starter implements:
- MongoDB (Motor) async connection
- Pydantic models for User (Representative), Team, Player, Match, Tournament
- Auto-generation of players (23) with ratings per rules
- Team rating calculation (average of natural-position ratings)
- Match simulation endpoint using Poisson goals + scorer assignment
- Seed route to create 7 demo teams and a route to add an 8th
- Admin endpoints: start tournament (builds quarter-final bracket) and reset
- Randomized player generation (names + ratings) auto allocates names, ratings, and country.

Dependencies:
- fastapi
- uvicorn
- motor
- pydantic
- python-dotenv (optional, for local env vars)
- numpy

Install:
    pip install fastapi uvicorn motor python-dotenv numpy

Run (development):
    export MONGO_URI=mongodb+srv://hencoschutte2002_db_user:gUjPII0b1PTjvLWW@anl2026cluster.bjk4pzo.mongodb.net/?retryWrites=true&w=majority&appName=ANL2026Cluster

Endpoints summary (HTTP):
- POST /seed/create_demo_teams        -> creates 7 demo teams (returns team ids)
- POST /seed/add_demo_team            -> adds 8th demo team (returns team id)
- POST /teams                         -> create team (send JSON {country, managerName, representativeEmail})
- POST /teams/{team_id}/autofill      -> autofill 23 players for that team
- GET  /teams                         -> list teams
- POST /tournament/start              -> admin route to start tournament if 8 teams registered
- POST /matches/{match_id}/simulate  -> simulate the match and return result
- GET  /tournament/bracket            -> view bracket (basic)

StartUp
- uvicorn main:app --reload --port 8000
- ./venv/Scripts/Activate


"""

from fastapi import FastAPI, HTTPException, Body, BackgroundTasks, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials, HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from pydantic.types import SecretStr
from pymongo.errors import DuplicateKeyError
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from dotenv import load_dotenv
import random
import secrets
import numpy as np
import uuid
import jwt
import httpx
import json
import os


app = FastAPI(title="African Nations League - Backend Starter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://amazing-flan-d715e1.netlify.app",
        "https://inf4001n-schtja002-anleague-2026.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load environment variables ---
load_dotenv()

# MongoDB connection (Atlas)
MONGO_URI = os.getenv("MONGO_URI")  
DB_NAME = os.getenv("DATABASE_NAME", "african_nations") 
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is not set")


conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 2525)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)



# --- Database init ---
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]


security_basic = HTTPBasic()   # for /admin/login (username/password)
security_bearer = HTTPBearer() # for admin-only endpoints

# Load secrets/config from .env
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret_replace_me_with_long_random_string")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", "60"))

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

def create_jwt_token(subject: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=JWT_EXP_MINUTES)
    payload = {"sub": subject, "exp": exp}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token

def decode_jwt_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/admin/login")
def admin_login(credentials: HTTPBasicCredentials = Depends(security_basic)):
    username_ok = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    password_ok = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (username_ok and password_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    token = create_jwt_token(credentials.username)
    return {"token": token, "expires_in_minutes": JWT_EXP_MINUTES}

# Dependency for admin-only endpoints
async def admin_required(creds: HTTPAuthorizationCredentials = Depends(security_bearer)):
    token = creds.credentials
    payload = decode_jwt_token(token)
    if payload.get("sub") != ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="Forbidden")
    return payload


@app.on_event("startup")
async def startup_event():
    try:
        await client.admin.command("ping")
        print("MongoDB connected:", db.name)
        # indexes
        await db.players.create_index("teamId")
        await db.players.create_index("name")
        await db.teams.create_index("country", unique=True)
        await db.teams.create_index("teamName", unique=True)
        await db.matches.create_index("round")
        await db.matches.create_index("tournamentId")
        await db.tournaments.create_index("status")
    except Exception as e:
        print("MongoDB connection failed:", e)



# --- Helper constants ---
POSITIONS = ["GK", "DF", "MD", "AT"]

# Random names for autofill
FIRST_NAMES = [
    "Mohamed", "Samuel", "John", "Pierre", "Amin", "Ibrahim", "Daniel", "Kwame",
    "Youssef", "Abdou", "Hassan", "Michael", "Kofi", "Sibusiso", "Thabo", "Ali",
    "Omar", "Fatou", "Aisha", "Zainab", "Grace", "Linda", "Nana", "Elias"
]
LAST_NAMES = [
    "Mensah", "Kamara", "Diallo", "Smith", "Jones", "Okonkwo", "Ndlovu", "Touré",
    "Abebe", "Traoré", "Adams", "Johnson", "Mahmoud", "Sow", "Bouba", "Kone"
]
#African countries for dropdown
AFRICAN_COUNTRIES = [
    "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde",
    "Cameroon","Central African Republic","Chad","Comoros","Congo","DR Congo",
    "Côte d’Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini",
    "Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho",
    "Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco",
    "Mozambique","Namibia","Niger","Nigeria","Rwanda","São Tomé and Príncipe","Senegal",
    "Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania",
    "Togo","Tunisia","Uganda","Zambia","Zimbabwe"
]


# --- Pydantic models ---
class PlayerInDB(BaseModel):
    name: str
    naturalPosition: str
    ratings: Dict[str, int]
    isCaptain: bool = False
    imageUrl: Optional[str] = None 
    teamId: Optional[str] = None  # <-- default to None


class TeamInDB(BaseModel):
    country: str
    teamName: str
    managerName: str
    representativeEmail: str
    squad: List[str] = []  # list of player _id strings
    rating: float = 0.0
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    wins: int = 0
    losses: int = 0
    finalsHistory: List[Dict[str, Any]] = []     # finalists appearances (winner & runner-up)
    winnersHistory: List[Dict[str, Any]] = []    # tournament titles

class GoalEvent(BaseModel):
    minute: int
    teamId: str
    playerId: str

class MatchInDB(BaseModel):
    round: str
    homeTeam: str
    awayTeam: str
    status: str = "pending"  # pending | simulated
    score: Dict[str, int] = Field(default_factory=lambda: {"home": 0, "away": 0})
    goalEvents: List[GoalEvent] = []
    winner: Optional[str] = None
    commentary: List[str] = Field(default_factory=list)
    playedAt: Optional[datetime] = None

class CreateTeamPayload(BaseModel):
    country: str
    teamName: str
    managerName: str
    representativeEmail: str

class ReplaceTeamPayload(BaseModel):
    remove_team_id: str
    country: str
    teamName: str
    managerName: str
    representativeEmail: str

# --- Utility functions ---
def rand_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

# --- Utility: compute team rating efficiently ---
async def compute_team_rating(team_id: str) -> float:
    team = await db.teams.find_one({"_id": team_id})
    if not team or not team.get("squad"):
        return 0.0
    players = await db.players.find({"_id": {"$in": team["squad"]}}).to_list(length=None)
    ratings = []
    for p in players:
        pos = p.get("naturalPosition")
        r = p.get("ratings", {}).get(pos)
        if pos and r is not None:
            ratings.append(r)
    return float(sum(ratings)/len(ratings)) if ratings else 0.0



async def insert_player(player: PlayerInDB) -> str:
    doc = player.dict()
    res = await db.players.insert_one(doc)
    return str(res.inserted_id)


# --- Player auto-generation abiding by rating rules ---
def generate_player(natural_pos: Optional[str] = None, make_captain=False) -> PlayerInDB:
    if natural_pos is None:
        natural_pos = random.choices(POSITIONS, weights=[2, 7, 8, 6], k=1)[0]
    ratings = {}
    for pos in POSITIONS:
        if pos == natural_pos:
            ratings[pos] = random.randint(50, 100)
        else:
            ratings[pos] = random.randint(0, 50)
    return PlayerInDB(
    name=rand_name(),
    naturalPosition=natural_pos,
    ratings=ratings,
    isCaptain=make_captain,
    imageUrl=None  # default
    )

# --- Unique ID helpers ---
def make_id(prefix: str) -> str:
    """Generates a random, collision-resistant ID with a prefix."""
    # secrets.token_hex(8) gives 16 random hex chars (8 bytes = 64 bits of entropy)
    return f"{prefix}_{secrets.token_hex(8)}"

# --- Team creation endpoint ---
@app.post("/teams")
async def create_team(payload: CreateTeamPayload):
    # validate country
    if payload.country not in AFRICAN_COUNTRIES:
        raise HTTPException(status_code=400, detail="Invalid country. Must be one of the predefined African countries.")

    # ensure country not already taken
    existing = await db.teams.find_one({"country": payload.country})
    if existing:
        raise HTTPException(status_code=400, detail="A team for this country already exists.")
    
    # check team name uniqueness
    existing_name = await db.teams.find_one({"teamName": payload.teamName})
    if existing_name:
        raise HTTPException(status_code=400, detail="A team with this name already exists.")
    
    # create team
    team = TeamInDB(
        country=payload.country,
        teamName=payload.teamName,
        managerName=payload.managerName,
        representativeEmail=payload.representativeEmail
    )
    tdoc = team.dict()
    tdoc["_id"] = make_id("team")
    await db.teams.insert_one(tdoc)
    return {
        "teamId": tdoc["_id"],
        "message": f"Team '{payload.teamName}' from {payload.country} created successfully."
    }

# --- Team autofill endpoint ---
@app.post("/teams/{team_id}/autofill")
async def autofill_team(team_id: str):
    team = await db.teams.find_one({"_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    # create 23 players ensuring at least 2 GK
    squad_ids = []
    # ensure GK count 2
    gk_positions = ["GK", "GK"]
    other_positions = []
    # fill remaining 21 positions with weighted distribution
    other_positions.extend(random.choices(POSITIONS, weights=[0, 7, 8, 6], k=21))
    positions = gk_positions + other_positions
    random.shuffle(positions)
    # pick random captain index
    cap_idx = random.randrange(23)
    for i, pos in enumerate(positions):
        p = generate_player(natural_pos=pos, make_captain=(i == cap_idx))
        pid = make_id("pl")
        p_doc = p.dict()
        p_doc["_id"] = pid
        p_doc["teamId"] = team_id
        await db.players.insert_one(p_doc)
        squad_ids.append(pid)
    # update team
    await db.teams.update_one({"_id": team_id}, {"$set": {"squad": squad_ids}})
    # recompute rating using helper
    team_rating = await compute_team_rating(team_id)
    await db.teams.update_one({"_id": team_id}, {"$set": {"rating": team_rating}})

    return {"teamId": team_id, "squadCount": len(squad_ids), "teamRating": team_rating}

# --- Team list endpoint ---
@app.get("/teams")
async def list_teams():
    cursor = db.teams.find({})
    res = []
    async for doc in cursor:
        res.append(doc)
    return res

# --- Team CRUD Endpoints ---
@app.get("/teams/{team_id}")
async def get_team(team_id: str, expand_players: bool = False):
    """
    Get a team by ID.
    expand_players=True will include full player objects instead of just IDs.
    """
    team = await db.teams.find_one({"_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team_copy = team.copy()
    if expand_players and team.get("squad"):
        players = await db.players.find({"_id": {"$in": team["squad"]}}).to_list(length=None)
        team_copy["squad"] = players

    return team_copy
from pymongo.errors import DuplicateKeyError

@app.put("/teams/{team_id}")
async def update_team(team_id: str, payload: CreateTeamPayload = Body(...)):
    """
    Update country, teamName, managerName, or representativeEmail of a team.
    Both country and teamName must remain unique.
    """
    team = await db.teams.find_one({"_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # OPTIONAL: normalize inputs (trim)
    country = payload.country.strip()
    team_name = payload.teamName.strip()

    # Pre-checks (exclude self to avoid false positives)
    if country != team["country"]:
        existing_country = await db.teams.find_one({
            "country": country,
            "_id": {"$ne": team_id}
        })
        if existing_country:
            raise HTTPException(status_code=400, detail="Another team with this country already exists")

    if team_name != team["teamName"]:
        existing_name = await db.teams.find_one({
            "teamName": team_name,
            "_id": {"$ne": team_id}
        })
        if existing_name:
            raise HTTPException(status_code=400, detail="Another team with this name already exists")

    try:
        await db.teams.update_one(
            {"_id": team_id},
            {"$set": {
                "country": country,
                "teamName": team_name,
                "managerName": payload.managerName,
                "representativeEmail": payload.representativeEmail
            }}
        )
    except DuplicateKeyError as e:
        # In case of concurrent updates slipping through pre-checks
        msg = "A team with this name already exists."
        if "country" in str(e):
            msg = "Another team with this country already exists"
        raise HTTPException(status_code=400, detail=msg)

    return {
        "teamId": team_id,
        "message": "Team updated successfully",
        "updatedTeam": {
            "country": country,
            "teamName": team_name,
            "managerName": payload.managerName,
            "representativeEmail": payload.representativeEmail
        }
    }


# --- Admin: Remove a team and players ---
@app.delete("/teams/{team_id}")
async def delete_team(team_id: str):
    """
    Delete a team and all its players.
    NOT allowed once tournament starts.
    """

    # block deletion if tournament already started
    active = await db.tournaments.find_one({"status": "in_progress"})
    if active:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove a team after the tournament has started."
        )

    team = await db.teams.find_one({"_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # delete players
    await db.players.delete_many({"teamId": team_id})
    # delete team
    await db.teams.delete_one({"_id": team_id})

    return {"teamId": team_id, "message": "Team and its players deleted successfully"}



# --- Admin: Replace a team before tournament starts ---
@app.post("/teams/replace")
async def replace_team(payload: ReplaceTeamPayload, admin=Depends(admin_required)):
    # 1) Check if tournament has already started
    active = await db.tournaments.find_one({"status": "in_progress"})
    if active:
        raise HTTPException(status_code=400, detail="Cannot replace teams after tournament has started")

    # 2) Delete existing team + players
    team = await db.teams.find_one({"_id": payload.remove_team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team to remove not found")

    await db.players.delete_many({"teamId": payload.remove_team_id})
    await db.teams.delete_one({"_id": payload.remove_team_id})

    # 3) Create new team using same validation logic (copy from create_team)
    if payload.country not in AFRICAN_COUNTRIES:
        raise HTTPException(status_code=400, detail="Invalid country.")

    existing = await db.teams.find_one({"country": payload.country})
    if existing:
      raise HTTPException(status_code=400, detail="A team for this country already exists.")

    existing_name = await db.teams.find_one({"teamName": payload.teamName})
    if existing_name:
      raise HTTPException(status_code=400, detail="A team with this name already exists.")

    new_team = TeamInDB(
        country=payload.country,
        teamName=payload.teamName,
        managerName=payload.managerName,
        representativeEmail=payload.representativeEmail
    )

    doc = new_team.dict()
    new_team_id = make_id("team")
    doc["_id"] = new_team_id
    await db.teams.insert_one(doc)

    return {
        "old_team_removed": payload.remove_team_id,
        "new_team_id": new_team_id,
        "message": f"Team replaced successfully. {payload.teamName} created."
    }

# --- Admin: Remove all teams and players ---
@app.post("/admin/remove_all_teams")
async def remove_all_teams(admin=Depends(admin_required)):
    """
    Removes ALL teams and their players from the system.
    """
    # Delete all players first
    await db.players.delete_many({})
    # Delete all teams
    await db.teams.delete_many({})
    return {"message": "All teams and players have been removed successfully."}


# --- Search teams by country name ---
@app.get("/teams/search")
async def search_teams(query: str):
    """
    Search for teams by partial country name (case-insensitive).
    Example: /teams/search?query=ni
    """
    cursor = db.teams.find({"country": {"$regex": query, "$options": "i"}})
    results = await cursor.to_list(length=None)
    return results

@app.get("/teams/{team_id}/stats")
async def get_team_stats(team_id: str):
    team = await db.teams.find_one({"_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    wins = team.get("wins", 0)
    losses = team.get("losses", 0)
    finals = team.get("finalsHistory", [])
    winners = team.get("winnersHistory", [])

    return {
        "teamId": team_id,
        "country": team.get("country"),
        "teamName": team.get("teamName"),
        "wins": wins,
        "losses": losses,
        "finalsCount": len(finals),
        "titlesCount": len(winners),
        "finalsHistory": finals,
        "winnersHistory": winners
    }

@app.post("/admin/backfill_team_stats")
async def backfill_team_stats(admin=Depends(admin_required)):
    cursor = db.teams.find({})
    async for t in cursor:
        updates = {}
        if "wins" not in t: updates["wins"] = 0
        if "losses" not in t: updates["losses"] = 0
        if "finalsHistory" not in t: updates["finalsHistory"] = []
        if "winnersHistory" not in t: updates["winnersHistory"] = []
        if updates:
            await db.teams.update_one({"_id": t["_id"]}, {"$set": updates})
    return {"message": "Backfill complete"}


@app.get("/meta/countries")
async def list_countries():
    return {"countries": AFRICAN_COUNTRIES}

@app.get("/meta/countries/available")
async def list_available_countries():
    taken = await db.teams.distinct("country")
    available = [c for c in AFRICAN_COUNTRIES if c not in set(taken)]
    return {"available": available, "taken": taken}

# --- Player CRUD Endpoints ---

class UpdatePlayerPayload(BaseModel):
    name: Optional[str] = None
    naturalPosition: Optional[str] = None
    ratings: Optional[Dict[str, int]] = None
    isCaptain: Optional[bool] = None
    imageUrl: Optional[str] = None
    teamId: Optional[str] = None

@app.get("/players")
async def list_players():
    """
    List all players.
    """
    cursor = db.players.find({})
    players = await cursor.to_list(length=None)
    return players

@app.get("/players/{player_id}")
async def get_player(player_id: str):
    """
    Get a player by ID.
    """
    player = await db.players.find_one({"_id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@app.put("/players/{player_id}")
async def update_player(player_id: str, payload: UpdatePlayerPayload = Body(...)):
    """
    Update a player's info.
    """
    player = await db.players.find_one({"_id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}

    if "ratings" in update_data:
        # ensure all ratings are between 0 and 100
        update_data["ratings"] = {pos: max(0, min(100, val)) for pos, val in update_data["ratings"].items()}

    if not update_data:
        return {"message": "No changes provided"}

        
    await db.players.update_one({"_id": player_id}, {"$set": update_data})

    # If ratings or naturalPosition changed, recompute team rating using helper
    if "ratings" in update_data or "naturalPosition" in update_data:
        team_id = player.get("teamId")
        if team_id:
            team_rating = await compute_team_rating(team_id)
            await db.teams.update_one({"_id": team_id}, {"$set": {"rating": team_rating}})


    updated_player = await db.players.find_one({"_id": player_id})
    return {"player": updated_player, "message": "Player updated successfully"}

@app.delete("/players/{player_id}")
async def delete_player(player_id: str):
    """
    Delete a player and update their team's rating.
    """
    player = await db.players.find_one({"_id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    team_id = player.get("teamId")
    await db.players.delete_one({"_id": player_id})

    # Update team squad and rating using helper
    if team_id:
        await db.teams.update_one({"_id": team_id}, {"$pull": {"squad": player_id}})
        team_rating = await compute_team_rating(team_id)
        await db.teams.update_one({"_id": team_id}, {"$set": {"rating": team_rating}})


    return {"playerId": player_id, "message": "Player deleted successfully"}

# --- Search players by name ---
@app.get("/players/search")
async def search_players(query: str):
    """
    Search for players by partial name (case-insensitive).
    Example: /players/search?query=mohamed
    """
    cursor = db.players.find({"name": {"$regex": query, "$options": "i"}})
    results = await cursor.to_list(length=None)
    return results

# --- Tournament management ---
@app.post("/seed/create_demo_teams")
async def seed_create_demo_teams(admin=Depends(admin_required)):
    await db.teams.drop()  # removes all previous teams
    await db.players.delete_many({})
    # create 7 demo teams with autofilled squads
    created = []
    demo_data = [
        {"country": "Ghana", "teamName": "Black Stars"},
        {"country": "Senegal", "teamName": "Lions of Teranga"},
        {"country": "Egypt", "teamName": "Pharaohs"},
        {"country": "Morocco", "teamName": "Atlas Lions"},
        {"country": "Algeria", "teamName": "Desert Foxes"},
        {"country": "Nigeria", "teamName": "Super Eagles"},
        {"country": "Cameroon", "teamName": "Indomitable Lions"},
    ]

    for data in demo_data:
        tdoc = {
            "_id": make_id("team"),
            "country": data["country"],
            "teamName": data["teamName"],   # NEW
            "managerName": f"Manager {data['country']}",
            "representativeEmail": f"rep_{data['country'].lower()}@example.com",
            "squad": [],
            "rating": 0.0,
            "createdAt": datetime.utcnow()
        }
        await db.teams.insert_one(tdoc)
        await autofill_team(tdoc["_id"])
        created.append(tdoc["_id"])

    return {"created": created}

@app.post("/seed/add_demo_team")
async def seed_add_demo_team(admin=Depends(admin_required)):
    # get all taken countries
    taken = await db.teams.distinct("country")
    available = [c for c in AFRICAN_COUNTRIES if c not in set(taken)]

    if not available:
        raise HTTPException(status_code=400, detail="No available African countries left to assign a demo team.")

    # pick one random available African country
    country = random.choice(available)

    # create a teamName based on the country (more realistic)
    team_name = f"{country} Demo XI"

    tdoc = {
        "_id": make_id("team"),
        "country": country,
        "teamName": team_name,
        "managerName": f"Manager {country}",
        "representativeEmail": f"{country.lower().replace(' ', '_')}@example.com",
        "squad": [],
        "rating": 0.0,
        "createdAt": datetime.utcnow()
    }

    await db.teams.insert_one(tdoc)
    await autofill_team(tdoc["_id"])

    return {"teamId": tdoc["_id"], "country": country, "teamName": team_name}



# Helper: build quarter-final bracket when exactly 8 teams
async def build_quarter_bracket():
    teams = []
    async for t in db.teams.find({}):
        teams.append(t)
    if len(teams) < 8:
        raise HTTPException(status_code=400, detail="Need at least 8 teams to build bracket")

    # pick 8 teams (if more exist, pick top 8 by createdAt or randomize)
    teams = sorted(teams, key=lambda x: x.get('createdAt'))[:8]
    random.shuffle(teams)

    
    tournament_doc = {
        "_id": make_id("tournament"),
        "status": "in_progress",
        "bracket": [],
        "teams": [t["_id"] for t in teams],
        "createdAt": datetime.utcnow()
    }
    await db.tournaments.insert_one(tournament_doc)

    matches = []
    for i in range(0, 8, 2):
        m_id = make_id("match")
        match_doc = MatchInDB(
            round="QuarterFinal",
            homeTeam=teams[i]["_id"],
            awayTeam=teams[i+1]["_id"]
        ).dict()
        match_doc["_id"] = m_id
        match_doc["tournamentId"] = tournament_doc["_id"]  
        await db.matches.insert_one(match_doc)
        matches.append(m_id)

    
    await db.tournaments.update_one(
        {"_id": tournament_doc["_id"]},
        {"$set": {"bracket": matches}}
    )

    tournament_doc = await db.tournaments.find_one({"_id": tournament_doc["_id"]})
    return tournament_doc


@app.post("/tournament/start")
async def start_tournament(admin=Depends(admin_required)):
    count = await db.teams.count_documents({})
    if count < 8:
        raise HTTPException(status_code=400, detail="At least 8 teams required to start tournament")
    # ensure no existing tournament in progress
    existing = await db.tournaments.find_one({"status": "in_progress"})
    if existing:
        raise HTTPException(status_code=400, detail="A tournament is already in progress")
    tour = await build_quarter_bracket()
    return {"tournament": tour}

@app.get("/tournament/bracket")
async def get_bracket():
    tour = await db.tournaments.find_one({})
    if not tour:
        return {"message": "No tournament yet"}

    matches = []
    for mid in tour.get("bracket", []):
        m = await db.matches.find_one({"_id": mid})
        if m:
            # Attach team docs
            home_team = await db.teams.find_one({"_id": m["homeTeam"]})
            away_team = await db.teams.find_one({"_id": m["awayTeam"]})

            m["homeTeamName"] = home_team["country"] if home_team else m["homeTeam"]
            m["awayTeamName"] = away_team["country"] if away_team else m["awayTeam"]
            m["homeRating"]   = float(home_team.get("rating", 0)) if home_team else 0.0
            m["awayRating"]   = float(away_team.get("rating", 0)) if away_team else 0.0

            # Expected-win quick model (ratings are 0–100)
            # logistic on rating diff; tweak divisor for sharpness
            import math
            diff = m["homeRating"] - m["awayRating"]
            p_home = 1.0 / (1.0 + math.exp(-diff / 8.0))
            m["expectedHomeWin"] = round(p_home * 100, 1)
            m["expectedAwayWin"] = round((1 - p_home) * 100, 1)

            if m.get("winner"):
                winner_team = await db.teams.find_one({"_id": m["winner"]})
                m["winnerName"] = winner_team["country"] if winner_team else m["winner"]

            matches.append(m)

    return {"tournament": tour, "matches": matches}



@app.get("/tournament/status")
async def tournament_status():
    tournament = await db.tournaments.find_one({"status": {"$in": ["in_progress", "finished"]}})
    if not tournament:
        raise HTTPException(status_code=404, detail="No active tournament")

    matches = await db.matches.find({"tournamentId": tournament["_id"]}).to_list(None)

    winner_id = tournament.get("winner")
    winner_name = None
    if winner_id:
        team = await db.teams.find_one({"_id": winner_id})
        if team:
            winner_name = team.get("country")

    return {
        "status": tournament["status"],
        "current_round": tournament.get("current_round", "QuarterFinal"),
        "teams_remaining": len(tournament.get("teams", [])),
        "matches_played": len([m for m in matches if m["status"] == "simulated"]),
        "winner": winner_id,
        "winner_name": winner_name
    }


# --- Match simulation logic ---

def poisson_sample(lam: float) -> int:
    # use numpy's poisson
    lam = max(0.01, lam)
    return int(np.random.poisson(lam))

async def assign_goal_scorers(team_id: str, num_goals: int) -> List[Dict[str, Any]]:
    if num_goals <= 0:
        return []
    # fetch players for team
    team = await db.teams.find_one({"_id": team_id})
    if not team or not team.get("squad"):
        return []
    squad = []
    async for p in db.players.find({"teamId": team_id}):
        squad.append(p)
    if not squad:
        return []
    # weight by attacking capability: use AT rating primarily, but include MD
    weights = []
    for p in squad:
        w = p["ratings"]["AT"] + 0.3 * p["ratings"]["MD"]
        # captains get small boost
        if p.get("isCaptain"):
            w *= 1.08
        weights.append(max(0.1, w))
    total = sum(weights)
    probs = [w / total for w in weights]
    chosen = np.random.choice(range(len(squad)), size=num_goals, replace=True, p=probs)
    events = []
    for idx in chosen:
        minute = random.randint(1, 90)
        events.append({"minute": minute, "teamId": team_id, "playerId": squad[idx]["_id"]})
    # sort by minute
    events.sort(key=lambda x: x["minute"])
    return events

# AI generation with line-by-line processing
async def generate_ai_commentary(home, away, events, went_extra, penalty_result, winner_name):
    # Build a simple summary of key events
    goals_summary = []
    for ev in events:
        player = await db.players.find_one({"_id": ev["playerId"]})
        if player:
            team_name = home["country"] if ev["teamId"] == home["_id"] else away["country"]
            goals_summary.append(f"{ev['minute']}' - {player['name']} ({team_name})")

    # Create the commentary prompt
    prompt = f"""
    You are a lively football commentator.
    Generate exciting commentary for a knockout match:
    {home['country']} vs {away['country']}.

    Goals:
    {chr(10).join(goals_summary) if goals_summary else "No goals yet"}

    Extra time: {"Yes" if went_extra else "No"}
    Penalties: {"Yes" if penalty_result else "No"}
    Winner: {winner_name}

    Rules:
    - Start with kickoff
    - Mention goals with excitement
    - Add variety (near misses, atmosphere, tension)
    - End with final whistle and winner
    - Keep it 8–12 sentences, short and punchy
    """

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                "http://localhost:11434/api/generate",
                json={
                    "model": "gemma:2b",
                    "prompt": prompt,
                    "options": {"temperature": 0.7, "num_predict": 300}
                }
            ) as resp:
                commentary_text = ""
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        if "response" in data:
                            commentary_text += data["response"]
                    except Exception:
                        continue

        if commentary_text.strip():
            sentences = [s.strip() for s in commentary_text.split(".") if s.strip()]
            return [s + "." for s in sentences]

    except Exception as e:
        print("Ollama failed, using fallback:", e)

    # fallback
    commentary = [f"Kickoff between {home['country']} and {away['country']}!"]
    commentary.extend(goals_summary)
    commentary.append(f"Final whistle. Winner: {winner_name}")
    return commentary


# --- Helper: automatically progress the tournament when a round finishes ---
async def advance_tournament_round(tournament_id: str):
    tournament = await db.tournaments.find_one({"_id": tournament_id})
    if not tournament:
        return

    round_order = ["QuarterFinal", "SemiFinal", "Final"]
    current_round = tournament.get("current_round", "QuarterFinal")
    current_index = round_order.index(current_round)

    # Fetch all matches for this round
    current_matches = await db.matches.find({
        "tournamentId": tournament_id,
        "round": current_round
    }).to_list(None)

    # Only proceed if all matches are simulated
    if all(m["status"] == "simulated" for m in current_matches):
        winners = [m["winner"] for m in current_matches if m.get("winner")]

        if current_index + 1 < len(round_order):
            next_round = round_order[current_index + 1]
            # check if next round matches already exist for this tournament
            existing_next = await db.matches.count_documents({
                "tournamentId": tournament_id,
                "round": next_round
            })
            if existing_next > 0:
                print(f"Skipping creation of {next_round}, already exists.")
                return

            new_matches = []

            for i in range(0, len(winners), 2):
                if i + 1 < len(winners):
                    new_match = MatchInDB(
                        round=next_round,
                        homeTeam=winners[i],
                        awayTeam=winners[i + 1]
                    ).dict()
                    new_match["_id"] = make_id("match")
                    new_match["tournamentId"] = tournament_id
                    new_matches.append(new_match)

            if new_matches:
                await db.matches.insert_many(new_matches)
                await db.tournaments.update_one(
                    {"_id": tournament_id},
                    {
                        "$set": {"current_round": next_round},
                        "$push": {"bracket": {"$each": [m["_id"] for m in new_matches]}}
                    }
                )
                print(f"✅ Advanced to {next_round}")
        else:
            # Tournament is finished after final
            final_match = await db.matches.find_one({
                "round": "Final",
                "tournamentId": tournament_id
            })
            if final_match:
                await db.tournaments.update_one(
                    {"_id": tournament_id},
                    {"$set": {"status": "finished", "winner": final_match["winner"]}}
                )
                print("🏁 Tournament finished!")


# --- Core match simulation logic (no token check) ---
async def simulate_match_logic(match_id: str) -> dict:
    match = await db.matches.find_one({"_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.get("status") == "simulated":
        return match

    # fetch teams
    home = await db.teams.find_one({"_id": match["homeTeam"]})
    away = await db.teams.find_one({"_id": match["awayTeam"]})
    if not home or not away or not home.get("squad") or not away.get("squad"):
        raise HTTPException(status_code=400, detail="Teams or players missing")

    # ratings → lambdas
    r1, r2 = home.get("rating", 50.0), away.get("rating", 50.0)
    adv, base = (r1 - r2) / 20.0, 1.2
    lam1, lam2 = max(0.1, min(4.0, base + adv)), max(0.1, min(4.0, base - adv))

    # simulate goals
    g1, g2 = poisson_sample(lam1), poisson_sample(lam2)
    went_extra = False
    penalty_result = None

    # knockout tiebreakers
    if g1 == g2:
        went_extra = True
        lam1e, lam2e = lam1 * 0.35, lam2 * 0.35
        g1 += poisson_sample(lam1e)
        g2 += poisson_sample(lam2e)
        if g1 == g2:
            p_bias = max(0.05, min(0.95, 0.5 + (r1 - r2)/200))
            winner_id = home["_id"] if random.random() < p_bias else away["_id"]
            penalty_result = {"winner": winner_id}
        else:
            winner_id = home["_id"] if g1 > g2 else away["_id"]
    else:
        winner_id = home["_id"] if g1 > g2 else away["_id"]

    loser_id = home["_id"] if winner_id != home["_id"] else away["_id"]
    await db.teams.update_one({"_id": winner_id}, {"$inc": {"wins": 1}})
    await db.teams.update_one({"_id": loser_id}, {"$inc": {"losses": 1}})

    # assign scorers
    events_home = await assign_goal_scorers(home["_id"], g1)
    events_away = await assign_goal_scorers(away["_id"], g2)
    events = sorted(events_home + events_away, key=lambda x: x["minute"])

    # commentary
    winner_team = await db.teams.find_one({"_id": winner_id})
    winner_name = winner_team["country"] if winner_team else winner_id

    
    commentary = await generate_ai_commentary(
        home, away, events, went_extra, penalty_result, winner_name
    )

    await db.matches.update_one(
    {"_id": match_id},
    {"$set": {
        "status": "simulated",
        "score": {"home": g1, "away": g2},
        "goalEvents": events,
        "winner": winner_id,
        "winnerName": winner_name,
        # save as list instead of a single string
        "commentary": commentary,  
        "playedAt": datetime.utcnow()
    }}
)
    
    # Automatically progress the tournament if a round has finished
    await advance_tournament_round(match["tournamentId"])

     # if Final, persist finalists & winner history with opponent + score
    if match["round"] == "Final":
        home_country = home["country"]
        away_country = away["country"]

        # Score string from the perspective of the display order (home-away)
        score_str = f"{g1}-{g2}"

        # Identify loser for history
        loser_id = home["_id"] if winner_id != home["_id"] else away["_id"]
        loser_team = home if loser_id == home["_id"] else away
        loser_country = loser_team["country"]

        # Winner's opponent is the loser; runner-up's opponent is the winner
        winner_opponent = loser_country
        loser_opponent = winner_name  # winner_name was computed above

        # Common payload fields
        history_date = datetime.utcnow()
        tour_id = match["tournamentId"]

        # Push to both teams' finals history
        finals_entry_winner = {
            "tournamentId": tour_id,
            "date": history_date,
            "opponent": winner_opponent,
            "score": score_str,
            "result": "winner"
        }
        finals_entry_runner_up = {
            "tournamentId": tour_id,
            "date": history_date,
            "opponent": loser_opponent,
            "score": score_str,
            "result": "runner-up"
        }

        await db.teams.update_one(
            {"_id": winner_id},
            {
                "$push": {
                    "finalsHistory": finals_entry_winner,
                    "winnersHistory": {
                        "tournamentId": tour_id,
                        "date": history_date,
                        "opponent": winner_opponent,
                        "score": score_str
                    }
                }
            }
        )
        await db.teams.update_one(
            {"_id": loser_id},
            {"$push": {"finalsHistory": finals_entry_runner_up}}
        )


    # If this was a Final, update tournament winner field
    if match["round"] == "Final":
        await db.tournaments.update_one(
            {"_id": match["tournamentId"]},
            {"$set": {"status": "finished", "winner": winner_id, "winnerName": winner_name}}
        )

    # --- Send emails to federations ---
    try:
        fm = FastMail(conf)
        subject = f"Match Result: {home['country']} vs {away['country']}"
        body = f"""
        Final Score: {home['country']} {g1} - {g2} {away['country']}

        {' | '.join(commentary)}

        Winner: {winner_name}

        """
        message = MessageSchema(
            subject=subject,
            recipients=[home["representativeEmail"], away["representativeEmail"]],
            body=body,
            subtype="plain"
        )
        await fm.send_message(message)
    except Exception as e:
        print("Email sending failed:", e)

    return await db.matches.find_one({"_id": match_id})

@app.post("/matches/{match_id}/simulate")
async def simulate_match(match_id: str, admin=Depends(admin_required)):
    updated_match = await simulate_match_logic(match_id)
    return {"match": updated_match}

@app.get("/matches/{match_id}")
async def get_match(match_id: str):
    """
    Fetch a match by its ID, including attached team names.
    """
    match = await db.matches.find_one({"_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Attach team names
    home_team = await db.teams.find_one({"_id": match["homeTeam"]})
    away_team = await db.teams.find_one({"_id": match["awayTeam"]})

    match["homeTeamName"] = home_team["country"] if home_team else match["homeTeam"]
    match["awayTeamName"] = away_team["country"] if away_team else match["awayTeam"]

    # Attach winner name if exists
    if match.get("winner"):
        winner_team = await db.teams.find_one({"_id": match["winner"]})
        match["winnerName"] = winner_team["country"] if winner_team else match["winner"]

    return match

@app.get("/matches/{match_id}/details")
async def get_match_details(match_id: str):
    match = await db.matches.find_one({"_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    home = await db.teams.find_one({"_id": match["homeTeam"]})
    away = await db.teams.find_one({"_id": match["awayTeam"]})
    homeName = home["country"] if home else match["homeTeam"]
    awayName = away["country"] if away else match["awayTeam"]

    # enrich goal events with player names + team name
    enriched_events = []
    for ev in match.get("goalEvents", []):
        p = await db.players.find_one({"_id": ev["playerId"]})
        enriched_events.append({
            "minute": ev["minute"],
            "playerName": p["name"] if p else ev["playerId"],
            "teamName": homeName if ev["teamId"] == match["homeTeam"] else awayName
        })

    return {
        "matchId": match_id,
        "round": match["round"],
        "homeTeamName": homeName,
        "awayTeamName": awayName,
        "score": match.get("score", {"home": 0, "away": 0}),
        "commentary": match.get("commentary", []),
        "scorers": enriched_events
    }

    
# public match viewing
@app.get("/matches/{match_id}/commentary")
async def stream_commentary(match_id: str):
    match = await db.matches.find_one({"_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
     # If commentary already exists, stream it back directly
    if match.get("commentary"):
        async def replay_existing():
            for line in match["commentary"]:
                yield f"data: {line}\n\n"
        return StreamingResponse(replay_existing(), media_type="text/event-stream")

    home = await db.teams.find_one({"_id": match["homeTeam"]})
    away = await db.teams.find_one({"_id": match["awayTeam"]})

    # Build goals summary for prompt
    goals_summary = []
    for ev in match.get("goalEvents", []):
        player = await db.players.find_one({"_id": ev["playerId"]})
        if player:
            team_name = home["country"] if ev["teamId"] == home["_id"] else away["country"]
            goals_summary.append(f"{ev['minute']}' - {player['name']} ({team_name})")

    winner_name = match.get("winnerName") or "Undecided"

    prompt = f"""
    You are a lively football commentator.
    Generate exciting commentary for a knockout match:
    {home['country']} vs {away['country']}.

    Goals:
    {chr(10).join(goals_summary) if goals_summary else "No goals yet"}

    Extra time: {"Yes" if match.get("wentExtra") else "No"}
    Penalties: {"Yes" if match.get("penalty_result") else "No"}
    Winner: {winner_name}

    Rules:
    - Start with kickoff
    - Mention goals with excitement
    - Add variety (near misses, atmosphere, tension)
    - End with final whistle and winner
    - Keep it 8–12 sentences, short and punchy
    """

    async def event_generator():
        buffer = ""
        commentary_lines = []

        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream(
                "POST",
                "http://localhost:11434/api/generate",
                json={
                    "model": "gemma:2b",
                    "prompt": prompt,
                    "options": {"temperature": 0.7, "num_predict": 300}
                }
            ) as resp:
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        if "response" in data:
                            buffer += data["response"]

                            # Check if sentence-ending punctuation exists
                            while any(p in buffer for p in [".", "!", "?"]):
                                for punct in [".", "!", "?"]:
                                    if punct in buffer:
                                        sentence, buffer = buffer.split(punct, 1)
                                        sentence = sentence.strip()
                                        if sentence:
                                            full_sentence = sentence + punct
                                            commentary_lines.append(full_sentence)
                                            yield f"data: {full_sentence}\n\n"
                    except:
                        continue

        # Save finished commentary to DB
        if commentary_lines:
            await db.matches.update_one(
                {"_id": match_id},
                {"$set": {"commentary": commentary_lines}}
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# public leaderboard functionality
@app.get("/stats/topscorers")
async def get_top_scorers(limit: int = 10):
    pipeline = [
        {"$unwind": "$goalEvents"},
        {"$group": {"_id": "$goalEvents.playerId", "goals": {"$sum": 1}}},
        {"$sort": {"goals": -1}},
        {"$limit": limit}
    ]
    results = await db.matches.aggregate(pipeline).to_list(length=None)
    # attach player + team names
    for r in results:
        player = await db.players.find_one({"_id": r["_id"]})
        if player:
            r["playerName"] = player["name"]
            team = await db.teams.find_one({"_id": player["teamId"]})
            r["team"] = team["country"] if team else None
    return results


# Reset tournament to quarter finals (clears matches and tournament doc)
@app.post("/tournament/reset")
async def reset_tournament(admin=Depends(admin_required)):
    await db.matches.delete_many({})
    await db.tournaments.delete_many({})
    return {"message": "Tournament reset to initial state (quarterfinals cleared)."}

#Auto simulate tournaments
@app.post("/tournament/auto_simulate")
async def auto_simulate_tournament(admin=Depends(admin_required)):

    # Get the current tournament
    tournament = await db.tournaments.find_one({"status": "in_progress"})
    if not tournament:
        raise HTTPException(status_code=404, detail="No tournament in progress")

    current_round = tournament.get("current_round", "QuarterFinal")

    # Define round order
    round_order = ["QuarterFinal", "SemiFinal", "Final"]

    # Find current matches that aren’t simulated yet
    current_matches = await db.matches.find(
        {"round": current_round, "status": {"$ne": "simulated"}}
    ).to_list(None)

    if not current_matches:
        # If no matches left in current round, advance
        current_index = round_order.index(current_round)
        if current_index + 1 < len(round_order):
            next_round = round_order[current_index + 1]
            await db.tournaments.update_one(
                {"_id": tournament["_id"]},
                {"$set": {"current_round": next_round}}
            )
            return {"message": f"Advanced to {next_round}."}
        else:
            # No more rounds = tournament finished
            tournament = await db.tournaments.find_one({"_id": tournament["_id"]})
            return {"message": "Tournament finished.", "tournament": tournament}

    # Simulate each match using match logic
    results = []
    winners = []
    for match in current_matches:
        match_id = str(match["_id"])
        simulated = await simulate_match_logic(match_id)
        winner_id = simulated.get("winner")
        winners.append(winner_id)
        results.append({
            "match_id": match_id,
            "round": current_round,
            "winner": winner_id
        })

        # Remove losing teams from tournament
        loser_id = match["homeTeam"] if winner_id != match["homeTeam"] else match["awayTeam"]
        await db.tournaments.update_one(
            {"_id": tournament["_id"]},
            {"$pull": {"teams": loser_id}}
        )

    # After all matches are simulated, build next round if needed
    current_index = round_order.index(current_round)
    if current_index + 1 < len(round_order):
        next_round = round_order[current_index + 1]
        
        # prevent duplicate creation of next round
        existing_next = await db.matches.count_documents({
            "tournamentId": tournament["_id"],
            "round": next_round
        })
        if existing_next > 0:
            print(f"Skipping creation of {next_round}, already exists.")
            return {"message": f"{next_round} already created previously. No duplicates made."}

        new_matches = []
        for i in range(0, len(winners), 2):
            if i + 1 < len(winners):
                new_match = MatchInDB(
                    round=next_round,
                    homeTeam=winners[i],
                    awayTeam=winners[i + 1]
                ).dict()
                new_match["_id"] = make_id("match")
                new_match["tournamentId"] = tournament["_id"]  
                new_matches.append(new_match)

        if new_matches:
            await db.matches.insert_many(new_matches)
            await db.tournaments.update_one(
                {"_id": tournament["_id"]},
                {
                    "$set": {"current_round": next_round},
                    "$push": {"bracket": {"$each": [m["_id"] for m in new_matches]}} 
                }
            )
            return {"message": f"Advanced to {next_round}."}

    # If we reach here, the final has already been simulated by simulate_match_logic
    final_match = await db.matches.find_one({"round": "Final", "tournamentId": tournament["_id"]})
    if final_match:
        winner_name = final_match.get("winnerName")
        return {"message": "Tournament finished.", "winner": winner_name}

    return {"message": "Tournament finished, but no final match found."}

@app.post("/tournament/rebuild_bracket")
async def rebuild_bracket(admin=Depends(admin_required)):
    """
    Wipes current tournament + matches, then rebuilds a new tournament bracket
    with the TOP 8 teams by rating (descending). Requires at least 8 teams.
    """
    # 1) wipe current tournaments + matches
    await db.matches.delete_many({})
    await db.tournaments.delete_many({})

    # 2) fetch teams and sort by rating desc
    teams = await db.teams.find({}).to_list(length=None)
    if len(teams) < 8:
        raise HTTPException(status_code=400, detail="At least 8 teams are required to rebuild the bracket")

    teams_sorted = sorted(teams, key=lambda t: float(t.get("rating", 0.0)), reverse=True)
    top8 = teams_sorted[:8]

    # 3) create new tournament doc
    tournament_id = make_id("tournament")
    tournament_doc = {
        "_id": tournament_id,
        "status": "in_progress",
        "current_round": "QuarterFinal",
        "bracket": [],
        "teams": [t["_id"] for t in top8],
        "createdAt": datetime.utcnow()
    }
    await db.tournaments.insert_one(tournament_doc)

    # 4) pair up and insert quarter-final matches
    random.shuffle(top8)  
    match_ids = []
    for i in range(0, 8, 2):
        m_id = make_id("match")
        m = MatchInDB(round="QuarterFinal", homeTeam=top8[i]["_id"], awayTeam=top8[i+1]["_id"]).dict()
        m["_id"] = m_id
        m["tournamentId"] = tournament_id
        await db.matches.insert_one(m)
        match_ids.append(m_id)

    # 5) update tournament with bracket
    await db.tournaments.update_one({"_id": tournament_id}, {"$set": {"bracket": match_ids}})

    # return bracket like /tournament/bracket does
    tour = await db.tournaments.find_one({"_id": tournament_id})
    matches = []
    for mid in match_ids:
        m = await db.matches.find_one({"_id": mid})
        if not m:
            continue
        home_team = await db.teams.find_one({"_id": m["homeTeam"]})
        away_team = await db.teams.find_one({"_id": m["awayTeam"]})
        m["homeTeamName"] = home_team["country"] if home_team else m["homeTeam"]
        m["awayTeamName"] = away_team["country"] if away_team else m["awayTeam"]
        m["homeRating"]   = float(home_team.get("rating", 0)) if home_team else 0.0
        m["awayRating"]   = float(away_team.get("rating", 0)) if away_team else 0.0

        import math
        diff = m["homeRating"] - m["awayRating"]
        p_home = 1.0 / (1.0 + math.exp(-diff / 8.0))
        m["expectedHomeWin"] = round(p_home * 100, 1)
        m["expectedAwayWin"] = round((1 - p_home) * 100, 1)

        matches.append(m)

    return {"message": "Bracket rebuilt from top 8 by rating.", "tournament": tour, "matches": matches}


@app.post("/test-email")
async def test_email(background_tasks: BackgroundTasks):
    message = MessageSchema(
        subject="Test Email from African Nations League",
        recipients=["test@example.com"],  
        body="Hello! This is a test email from your FastAPI backend.",
        subtype="plain"
    )
    fm = FastMail(conf)
    background_tasks.add_task(fm.send_message, message)
    return {"message": "Email sent (check Mailtrap inbox)"}

# Quick home route
@app.get("/")
async def home():
    return {"message": "African Nations League - Backend Starter. See /docs for API docs."}
