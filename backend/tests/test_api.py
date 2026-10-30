"""Regression tests for the Kingdom Quest API that do not require MongoDB."""

import asyncio
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

import server


def test_health_endpoint_returns_ok():
    assert asyncio.run(server.health()) == {"status": "ok"}


@pytest.mark.parametrize(
    "overrides",
    [
        {"player_id": "short"},
        {"stars": -1},
        {"stars": 1_000_001},
        {"week": "not-a-week"},
    ],
)
def test_leaderboard_entry_rejects_invalid_values(overrides):
    values = {
        "player_id": "player_identifier_123",
        "display_name": "Brave Lion",
        "stars": 12,
        "week": "2026-W44",
    }
    values.update(overrides)

    with pytest.raises(ValidationError):
        server.LeaderboardEntry(**values)


def test_weekly_score_submission_requires_database(monkeypatch):
    monkeypatch.setattr(server, "db", None)
    entry = server.LeaderboardEntry(
        player_id="player_identifier_123",
        display_name="Brave Lion",
        stars=12,
        week="2026-W44",
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(server.submit_weekly_score(entry))

    assert error.value.status_code == 503
    assert error.value.detail == "Leaderboard storage is not configured"


def test_weekly_score_submission_sanitizes_name_before_storage(monkeypatch):
    stored = {}

    class FakeLeaderboard:
        async def update_one(self, query, update, upsert):
            stored["query"] = query
            stored["document"] = update["$set"]
            stored["upsert"] = upsert

    class FakeDatabase:
        weekly_leaderboard = FakeLeaderboard()

    monkeypatch.setattr(server, "db", FakeDatabase())
    iso = datetime.now(timezone.utc).isocalendar()
    current_week = f"{iso.year}-W{iso.week:02d}"
    entry = server.LeaderboardEntry(
        player_id="player_identifier_123",
        display_name="<Brave>\x00 Lion",
        stars=12,
        week=current_week,
    )

    result = asyncio.run(server.submit_weekly_score(entry))

    assert result == {"ok": True}
    assert stored["document"]["display_name"] == "Brave Lion"
    assert stored["upsert"] is True


def test_weekly_score_submission_rejects_old_week_before_storage(monkeypatch):
    monkeypatch.setattr(server, "db", object())
    entry = server.LeaderboardEntry(
        player_id="player_identifier_123",
        display_name="Brave Lion",
        stars=12,
        week="2000-W01",
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(server.submit_weekly_score(entry))

    assert error.value.status_code == 400
    assert error.value.detail == "Scores can only be submitted for the current week"


def test_status_endpoint_reports_database_not_configured(monkeypatch):
    monkeypatch.setattr(server, "db", None)

    with pytest.raises(HTTPException) as error:
        asyncio.run(server.create_status_check(server.StatusCheckCreate(client_name="pytest")))

    assert error.value.status_code == 503
    assert error.value.detail == "Database is not configured"
