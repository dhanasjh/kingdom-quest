export type WeeklyEntry = { display_name: string; stars: number };
const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export async function submitWeeklyScore(playerId: string, displayName: string, stars: number, week: string) {
  if (!API) return false;
  try {
    const response = await fetch(`${API}/api/leaderboard/weekly`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, display_name: displayName, stars, week }),
    });
    return response.ok;
  } catch { return false; }
}

export async function fetchWeeklyScores(): Promise<{ week: string; entries: WeeklyEntry[] } | null> {
  if (!API) return null;
  try {
    const response = await fetch(`${API}/api/leaderboard/weekly`);
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}
export async function getMyWeeklyScore(playerId: string): Promise<WeeklyEntry | null> {
  if (!API) return null;
  try {
    const response = await fetch(`${API}/api/leaderboard/weekly/${encodeURIComponent(playerId)}`);
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.entry ?? null;
  } catch { return null; }
}





export function currentWeek() {
  const date = new Date();
  const iso = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = iso.getUTCDay() || 7;
  iso.setUTCDate(iso.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(iso.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((iso.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${iso.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
