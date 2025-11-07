from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

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
    commentary: Optional[str] = None
    playedAt: Optional[datetime] = None
