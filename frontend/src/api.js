const API_BASE = "http://localhost:8000"; // change if deployed

// Generic request helper
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    // Try to parse backend error JSON, fallback to status text
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }

  return res.json();
}

// --------------------
// Public Endpoints
// --------------------
export const getTeams = () => request("/teams");

export const getBracket = () => request("/tournament/bracket");

export const getMatch = (id) => request(`/matches/${id}`);

export const getTopScorers = () => request("/stats/topscorers");

// --------------------
// Federation Rep
// --------------------
export const createTeam = (data) =>
  request("/teams", { method: "POST", body: JSON.stringify(data) });

export const autofillTeam = (teamId) =>
  request(`/teams/${teamId}/autofill`, { method: "POST" });

// --------------------
// Admin
// --------------------
export async function adminLogin(username, password) {
  const credentials = btoa(`${username}:${password}`);
  return request("/admin/login", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}` },
  });
}

// helper to inject JWT into headers
function withAuth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const startTournament = (token) =>
  request("/tournament/start", { method: "POST", ...withAuth(token) });

export const resetTournament = (token) =>
  request("/tournament/reset", { method: "POST", ...withAuth(token) });

export const autoSimulateTournament = (token) =>
  request("/tournament/auto_simulate", { method: "POST", ...withAuth(token) });

export const simulateMatch = (matchId, token) =>
  request(`/matches/${matchId}/simulate`, { method: "POST", ...withAuth(token) });

export const replaceTeam = (removeId, data, token) =>
  request("/teams/replace", {
    method: "POST",
    ...withAuth(token),
    body: JSON.stringify({
      remove_team_id: removeId,
      ...data
    }),
  });

  export const removeAllTeams = (token) =>
  request("/admin/remove_all_teams", { method: "POST", ...withAuth(token) });

  export async function deleteTeam(teamId) {
  const token = localStorage.getItem("adminToken");
  const res = await fetch(`http://localhost:8000/teams/${teamId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw new Error("Failed to delete team");
  return res.json();
}

export async function getTeamById(id) {
  const res = await fetch(`http://localhost:8000/teams/${id}`);
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

export const seedDemoTeams = (token) =>
  request("/seed/create_demo_teams", { method: "POST", ...withAuth(token) });


export const seedAddDemoTeam = (token) =>
  request("/seed/add_demo_team", { method: "POST", ...withAuth(token) });

export const rebuildBracket = (token) =>
  request("/tournament/rebuild_bracket", { method: "POST", ...withAuth(token) });

export const getTournamentStatus = () => request("/tournament/status");






