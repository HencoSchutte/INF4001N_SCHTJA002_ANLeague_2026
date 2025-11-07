from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class TeamInDB(BaseModel):
    country: str
    managerName: str
    representativeEmail: str
    squad: List[str] = []  # list of player IDs
    rating: float = 0.0
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class CreateTeamPayload(BaseModel):
    country: str
    managerName: str
    representativeEmail: str
