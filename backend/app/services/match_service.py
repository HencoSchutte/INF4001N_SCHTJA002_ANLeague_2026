import random
import numpy as np
from datetime import datetime
from fastapi import HTTPException
from app.database import db
from app.models import MatchInDB
from app.services.team_service import compute_team_rating, make_id

def poisson_sample(lam: float) -> int:
    lam = max(0.01, lam)
    return int(np.random.poisson(lam))

async def assign_goal_scorers(team_id: str, num_goals: int):
    if num_goals <= 0:
        return []
    squad = await db.players.find({"teamId": team_id}).to_list(None)
    if not squad:
        return []
    weights = []
    for p in squad:
        w = p["ratings"]["AT"] + 0.3 * p["ratings"]["MD"]
        if p.get("isCaptain"):
            w *= 1.08
        weights.append(max(0.1, w))
    probs = [w/sum(weights) for w in weights]
    chosen = np.random.choice(range(len(squad)), size=num_goals, replace=True, p=probs)
    return sorted([{"minute": random.randint(1, 90), "teamId": team_id, "playerId": squad[i]["_id"]} for i in chosen], key=lambda x: x["minute"])

async def simulate_match_logic(match_id: str):
    match = await db.matches.find_one({"_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.get("status") == "simulated":
        return match

    home = await db.teams.find_one({"_id": match["homeTeam"]})
    away = await db.teams.find_one({"_id": match["awayTeam"]})
    if not home or not away:
        raise HTTPException(status_code=400, detail="Teams missing")

    r1, r2 = home.get("rating", 50.0), away.get("rating", 50.0)
    adv, base = (r1 - r2) / 20.0, 1.2
    lam1, lam2 = max(0.1, min(4.0, base + adv)), max(0.1, min(4.0, base - adv))
    g1, g2 = poisson_sample(lam1), poisson_sample(lam2)

    winner_id, went_extra, penalty_result = None, False, None
    if g1 == g2:
        went_extra = True
        g1 += poisson_sample(lam1 * 0.35)
        g2 += poisson_sample(lam2 * 0.35)
        if g1 == g2:
            winner_id = home["_id"] if random.random() < 0.5 else away["_id"]
            penalty_result = {"winner": winner_id}
        else:
            winner_id = home["_id"] if g1 > g2 else away["_id"]
    else:
        winner_id = home["_id"] if g1 > g2 else away["_id"]

    events = await assign_goal_scorers(home["_id"], g1) + await assign_goal_scorers(away["_id"], g2)
    events.sort(key=lambda x: x["minute"])

    winner_team = await db.teams.find_one({"_id": winner_id})
    winner_name = winner_team["country"] if winner_team else "Unknown"

    commentary = [f"{home['country']} {g1} - {g2} {away['country']}"]
    for ev in events:
        player = await db.players.find_one({"_id": ev["playerId"]})
        if player:
            team_name = home["country"] if ev["teamId"] == home["_id"] else away["country"]
            commentary.append(f"{ev['minute']}' - {player['name']} ({team_name})")
    if went_extra:
        commentary.append("Match went into extra time.")
    commentary.append("Winner: " + winner_name)

    await db.matches.update_one({"_id": match_id}, {"$set": {
        "status": "simulated",
        "score": {"home": g1, "away": g2},
        "goalEvents": events,
        "winner": winner_id,
        "winnerName": winner_name,
        "commentary": "\n".join(commentary),
        "playedAt": datetime.utcnow()
    }})

    return await db.matches.find_one({"_id": match_id})
