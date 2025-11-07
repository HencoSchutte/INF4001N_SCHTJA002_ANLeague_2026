// src/pages/Teams.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { countryToCode } from "../countryCodes";
import { getRegion } from "../countryRegions";
import { getTeams, deleteTeam } from "../api";
import ConfirmModal from "../components/ConfirmModal";




export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("created"); // created | rating | name
  const [sortDir, setSortDir] = useState("desc");    // asc | desc
  const [regionFilter, setRegionFilter] = useState("");
  const [adminToken] = useState(() => localStorage.getItem("adminToken"));
  const isAdmin = !!adminToken;
  const [tournamentActive, setTournamentActive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [animatingDelete, setAnimatingDelete] = useState(null);



 useEffect(() => {
  (async () => {
    try {
      const res = await fetch("http://localhost:8000/tournament/status");
      if (!res.ok) {
        setTournamentActive(false);
        return;
      }
      const data = await res.json();
      setTournamentActive(data.status === "in_progress");
    } catch {
      setTournamentActive(false);
    }
  })();
}, []);




  useEffect(() => {
    (async () => {
      try {
        const data = await getTeams();
        setTeams(data);
        setFiltered(data);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // search + sort
  useEffect(() => {
    let list = [...teams];

    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (t) =>
          t.country.toLowerCase().includes(needle) ||
          (t.teamName || "").toLowerCase().includes(needle) ||
          (t.managerName || "").toLowerCase().includes(needle)
      );
    }

    if (regionFilter) {
        list = list.filter((t) => getRegion(t.country) === regionFilter);
    }



    list.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;

      if (sortKey === "rating") {
        return mul * ((a.rating || 0) - (b.rating || 0));
      }
      if (sortKey === "name") {
        return mul * a.country.localeCompare(b.country);
      }
      // created
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return mul * (da - db);
    });

    setFiltered(list);
  }, [q, sortKey, sortDir, regionFilter, teams]);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  if (loading) return <p className="text-blue-200">Loading teams…</p>;
  if (err) return <p className="text-red-400">Error: {err}</p>;
  if (!filtered.length && teams.length === 0)
    return <p className="text-blue-200/80">No teams yet.</p>;

  return (
    <div className="min-h-screen text-blue-100 relative">
        {/* Background Decorative Africa Map */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.07] flex items-center justify-center">
            <img 
                src="/africa-map-outline.svg" 
                className="max-w-[60%] blur-sm saturate-[1.8] drop-shadow-[0_0_40px_rgba(0,145,255,0.35)]" 
            />
            </div>

      {/* Header + Controls */}
      <div className="max-w-6xl mx-auto mb-8">
        <h2 className="text-3xl font-black uppercase tracking-widest text-blue-200 drop-shadow-[0_0_14px_rgba(20,130,255,0.5)]">
          Teams
        </h2>
        <p className="text-blue-200/60 mt-1">
          Browse all registered national teams.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search country, nickname or manager…"
            className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/15 placeholder-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
          <div className="flex gap-2">
            <button
              onClick={() => toggleSort("created")}
              className={`px-3 py-2 rounded-xl border ${
                sortKey === "created"
                  ? "border-blue-400/50 bg-blue-500/20"
                  : "border-white/10 bg-white/5"
              }`}
              title="Sort by newest"
            >
              Newest {sortKey === "created" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              onClick={() => toggleSort("rating")}
              className={`px-3 py-2 rounded-xl border ${
                sortKey === "rating"
                  ? "border-blue-400/50 bg-blue-500/20"
                  : "border-white/10 bg-white/5"
              }`}
              title="Sort by rating"
            >
              Rating {sortKey === "rating" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              onClick={() => toggleSort("name")}
              className={`px-3 py-2 rounded-xl border ${
                sortKey === "name"
                  ? "border-blue-400/50 bg-blue-500/20"
                  : "border-white/10 bg-white/5"
              }`}
              title="Sort A→Z"
            >
              A–Z {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
          </div>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-[#0f172a]/60 border border-blue-400/20 text-blue-200/90 text-sm
                        backdrop-blur-xl shadow-[0_0_14px_rgba(0,145,255,0.20)]
                        focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition cursor-pointer"
            >
            <option className="bg-[#0f172a] text-blue-200" value="">All Regions</option>
            <option className="bg-[#0f172a] text-blue-200" value="North">North</option>
            <option className="bg-[#0f172a] text-blue-200" value="West">West</option>
            <option className="bg-[#0f172a] text-blue-200" value="Central">Central</option>
            <option className="bg-[#0f172a] text-blue-200" value="South">South</option>
            <option className="bg-[#0f172a] text-blue-200" value="East">East</option>
            <option className="bg-[#0f172a] text-blue-200" value="Africa">Other Africa</option>
        </select>


        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t) => (
          <Link
            key={t._id}
            to={`/teams/${t._id}`}
            className={`group relative rounded-2xl p-5 bg-[#0e142f]/70 border border-white/10 backdrop-blur-xl shadow-[0_0_18px_rgba(0,0,0,0.45)] ring-1 ring-white/5 hover:ring-blue-400/40 hover:shadow-[0_0_26px_rgba(20,125,255,0.35)] transition ${animatingDelete === t._id ? "fadeOutCard" : ""}`}
          >
            {/* glow line */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent opacity-60" />

            <div className="flex items-center gap-3">
              {countryToCode[t.country] ? (
                <img
                  className="w-10 h-7 border rounded-[3px]"
                  src={`https://flagcdn.com/w40/${countryToCode[t.country]}.png`}
                  alt={t.country}
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-7 border rounded-[3px] bg-white/10" />
              )}

              {/* Title (Country) & subtitle (teamName) */}
              <div>
                <div className="text-lg font-black text-blue-200 tracking-wide">
                  {t.country}
                </div>
                <div className="text-[12px] text-blue-200/60">
                  {t.teamName || "—"}
                </div>
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-4 flex items-center justify-between text-xs text-blue-200/70">
              <span className="inline-flex items-center gap-1">
                ⭐ <strong className="font-bold">{(t.rating ?? 0).toFixed(1)}</strong>
              </span>
              <span className="inline-flex items-center gap-1">
                👤 {t.managerName || "—"}
              </span>
            </div>
            <div className="mt-3">
                <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-md text-[10px] font-bold uppercase tracking-wider text-blue-200/90">
                {getRegion(t.country)}
                </span>
            </div>


            {/* hover shimmer */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300"
                 style={{
                   background:
                     "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.08) 50%, transparent 80%)",
                   mixBlendMode: "screen",
                 }}
            />

            {/* waving full flag background on hover */}
            <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-40 transition-all duration-700 flag-wave"
                style={{
                    backgroundImage: countryToCode[t.country]
                    ? `url(https://flagcdn.com/w320/${countryToCode[t.country]}.png)`
                    : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center center",
                    backgroundRepeat: "no-repeat",
                }}
                />




            {isAdmin && (
            <div className="mt-4 flex justify-end">
                {tournamentActive ? (
                <div className="flex flex-col items-end gap-1 opacity-45 cursor-not-allowed">
                    <button
                    disabled
                    className="text-red-400 text-[11px] underline"
                    >
                    Remove Team (Locked)
                    </button>
                    <span className="text-[10px] text-red-400/70 italic">
                    Tournament already started
                    </span>
                </div>
                ) : (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setDeleteTarget({ id: t._id, country: t.country });
                    }}
                    className="text-red-400 text-[11px] underline hover:text-red-300"
                    >
                    Remove Team
                </button>

                )}
            </div>
            )}
          </Link>
        ))}
        {isAdmin && (
            <Link
                to="/register"
                className="group relative rounded-2xl p-5 bg-[#0e142f]/40 border border-white/10 backdrop-blur-xl
                        shadow-[0_0_12px_rgba(0,0,0,0.3)] ring-1 ring-white/5 hover:ring-blue-400/40 hover:bg-[#0e142f]/60
                        flex items-center justify-center transition"
            >
                <div className="flex flex-col items-center gap-2 text-blue-300">
                <span className="text-5xl font-black drop-shadow-[0_0_14px_rgba(20,130,255,0.5)]">
                    +
                </span>
                <span className="text-[11px] uppercase text-blue-200/60 tracking-wider">
                    Add New Team
                </span>
                </div>

                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent opacity-60" />
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300"
                    style={{
                        background:
                        "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.06) 50%, transparent 80%)",
                        mixBlendMode: "screen",
                    }}
                />
            </Link>
            )}
      </div>

      {/* Footer count */}
      <div className="max-w-6xl mx-auto mt-6 text-right text-xs text-blue-200/50">
        Showing {filtered.length} of {teams.length}
      </div>
      {deleteTarget && (
        <ConfirmModal
            title="Confirm Team Removal"
            message={`Are you sure you want to permanently delete ${deleteTarget.country}'s team? This cannot be undone.`}
            confirmLabel="Delete Team"
            cancelLabel="Cancel"
            
            onCancel={() => setDeleteTarget(null)}
            
            onConfirm={async () => {
                setDeleting(true);
                setAnimatingDelete(deleteTarget.id);  // trigger anim

                try {
                await deleteTeam(deleteTarget.id);

                // wait the animation duration before removing from state
                setTimeout(() => {
                    setTeams(prev => prev.filter(x => x._id !== deleteTarget.id));
                    setAnimatingDelete(null);
                }, 350);

                } catch (err) {
                alert(err.message);
                setAnimatingDelete(null);
                } finally {
                setDeleting(false);
                setDeleteTarget(null);
                }
            }}


        />
        )}
        {deleting && (
        <div className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[#0f172a]/80 px-6 py-4 rounded-xl border border-blue-400/30 text-blue-200 shadow-[0_0_26px_rgba(20,125,255,0.35)] font-bold uppercase tracking-wider text-sm">
            Processing Deletion…
            </div>
        </div>
        )}


    </div>
  );
}
