from pydantic import BaseModel
from typing import List
from datetime import datetime

class TournamentInDB(BaseModel):
    status: str = "in_progress"
    bracket: List[str] = []
    teams: List[str] = []
    createdAt: datetime = datetime.utcnow()
