from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URI, DB_NAME

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

async def init_db():
    try:
        await client.admin.command("ping")
        print(f"MongoDB connected: {DB_NAME}")

        # indexes
        await db.players.create_index("teamId")
        await db.players.create_index("name")
        await db.teams.create_index("country", unique=True)
        await db.matches.create_index("round")
        await db.matches.create_index("tournamentId")
        await db.tournaments.create_index("status")
    except Exception as e:
        print("MongoDB connection failed:", e)
