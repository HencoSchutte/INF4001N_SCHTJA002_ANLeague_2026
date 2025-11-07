import random, secrets
from datetime import datetime
from app.database import db

POSITIONS = ["GK", "DF", "MD", "AT"]

FIRST_NAMES = [
    "Mohamed", "Samuel", "John", "Pierre", "Amin", "Ibrahim", "Daniel", "Kwame",
    "Youssef", "Abdou", "Hassan", "Michael", "Kofi", "Sibusiso", "Thabo", "Ali",
    "Omar", "Fatou", "Aisha", "Zainab", "Grace", "Linda", "Nana", "Elias"
]
LAST_NAMES = [
    "Mensah", "Kamara", "Diallo", "Smith", "Jones", "Okonkwo", "Ndlovu", "Touré",
    "Abebe", "Traoré", "Adams", "Johnson", "Mahmoud", "Sow", "Bouba", "Kone"
]

def make_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"

def rand_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def generate_player(natural_pos: str, make_captain=False):
    ratings = {}
    for pos in POSITIONS:
        if pos == natural_pos:
            ratings[pos] = random.randint(50, 100)
        else:
            ratings[pos] = random.randint(0, 50)
    return {
        "name": rand_name(),
        "naturalPosition": natural_pos,
        "ratings": ratings,
        "isCaptain": make_captain
    }

async def compute_team_rating(team_id: str) -> float:
    team = await db.teams.find_one({"_id": team_id})
    if not team or not team.get("squad"):
        return 0.0
    players = await db.players.find({"_id": {"$in": team["squad"]}}).to_list(None)
    ratings = []
    for p in players:
        pos = p.get("naturalPosition")
        r = p.get("ratings", {}).get(pos)
        if pos and r is not None:
            ratings.append(r)
    return float(sum(ratings)/len(ratings)) if ratings else 0.0
