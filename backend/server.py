from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime, timezone
import re


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url) if mongo_url else None
db = client[os.environ.get('DB_NAME', 'kingdom_quest')] if client else None

# Create the main app without a prefix
app = FastAPI()

# Probe endpoint for the deployer and pod health checks: root-level (not /api), no DB call.
@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

class LeaderboardEntry(BaseModel):
    player_id: str = Field(min_length=12, max_length=64)
    display_name: str = Field(min_length=1, max_length=24)
    stars: int = Field(ge=0, le=1000000)
    week: str = Field(pattern=r"^\d{4}-W\d{2}$")

@api_router.post("/leaderboard/weekly")
async def submit_weekly_score(entry: LeaderboardEntry):
    if db is None:
        raise HTTPException(status_code=503, detail="Leaderboard storage is not configured")
    now = datetime.now(timezone.utc)
    iso = now.isocalendar()
    current_week = f"{iso.year}-W{iso.week:02d}"
    if entry.week != current_week:
        raise HTTPException(status_code=400, detail="Scores can only be submitted for the current week")
    name = re.sub(r"[<>\x00-\x1f]", "", entry.display_name).strip()[:24]
    if not name:
        raise HTTPException(status_code=422, detail="Display name is required")
    doc = {"player_id": entry.player_id, "display_name": name, "stars": entry.stars, "week": entry.week, "updated_at": now}
    try:
        await db.weekly_leaderboard.update_one({"player_id": entry.player_id, "week": entry.week}, {"$set": doc}, upsert=True)
    except Exception as exc:
        logger.exception("Weekly leaderboard write failed")
        raise HTTPException(status_code=503, detail="Leaderboard database is unavailable") from exc
    return {"ok": True}

@api_router.get("/leaderboard/weekly")
async def get_weekly_scores():
    iso = datetime.now(timezone.utc).isocalendar()
    week = f"{iso.year}-W{iso.week:02d}"
    if db is None:
        raise HTTPException(status_code=503, detail="Leaderboard storage is not configured")
    try:
        rows = await db.weekly_leaderboard.find({"week": week}, {"_id": 0, "player_id": 0, "week": 0}).sort([("stars", -1), ("display_name", 1)]).limit(100).to_list(100)
    except Exception as exc:
        logger.exception("Weekly leaderboard read failed")
        raise HTTPException(status_code=503, detail="Leaderboard database is unavailable") from exc
    return {"week": week, "entries": rows}

@api_router.get("/leaderboard/weekly/{player_id}")
async def get_player_weekly_score(player_id: str):
    if db is None:
        raise HTTPException(status_code=503, detail="Leaderboard storage is not configured")
    iso = datetime.now(timezone.utc).isocalendar()
    week = f"{iso.year}-W{iso.week:02d}"
    try:
        row = await db.weekly_leaderboard.find_one({"player_id": player_id, "week": week}, {"_id": 0, "player_id": 0})
    except Exception as exc:
        logger.exception("Player leaderboard read failed")
        raise HTTPException(status_code=503, detail="Leaderboard database is unavailable") from exc
    return {"week": week, "entry": row}


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    if db is None:
        raise HTTPException(status_code=503, detail="Database is not configured")
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if db is None:
        raise HTTPException(status_code=503, detail="Database is not configured")
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
