from pydantic import BaseModel
from typing import Optional, Dict

class PlayerInDB(BaseModel):
    name: str
    naturalPosition: str
    ratings: Dict[str, int]
    isCaptain: bool = False
    teamId: Optional[str] = None  # default to None

class UpdatePlayerPayload(BaseModel):
    name: Optional[str] = None
    naturalPosition: Optional[str] = None
    ratings: Optional[Dict[str, int]] = None
    isCaptain: Optional[bool] = None
    teamId: Optional[str] = None
