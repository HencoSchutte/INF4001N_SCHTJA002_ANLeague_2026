import os
import httpx

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

async def generate_ai_commentary(home_team, away_team, events, winner_name):
    """Calls DeepSeek API to generate realistic match commentary."""
    if not DEEPSEEK_API_KEY:
        return "AI commentary service not configured."

    prompt = f"""
    Generate live football commentary for the match {home_team} vs {away_team}.
    Include goal events: {events}.
    End with the winner: {winner_name}.
    """

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json={"model": "deepseek-chat", "messages": [{"role": "user", "content": prompt}]}
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]
