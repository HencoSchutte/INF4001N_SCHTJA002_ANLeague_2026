from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_indexes, ping_db
from .routes import admin, teams, players, tournament, matches, seed


app = FastAPI(title="African Nations League - Backend")


app.add_middleware(
CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await ping_db()
    await init_indexes()


app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(teams.router, prefix="/teams", tags=["teams"])
app.include_router(players.router, prefix="/players", tags=["players"])
app.include_router(tournament.router, prefix="/tournament", tags=["tournament"])
app.include_router(matches.router, prefix="/matches", tags=["matches"])
app.include_router(seed.router, prefix="/seed", tags=["seed"])


@app.get("/")
async def home():
    return {"message": "African Nations League - Backend. See /docs for API docs."}