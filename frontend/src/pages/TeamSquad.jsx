import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { countryToCode } from "../countryCodes";

const avatarFor = (player) => {
  if (player?.photoUrl) return player.photoUrl;
  const seed = encodeURIComponent(player?.name || "Player");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&radius=50&fontSize=40`;
};

function CaptainStar() {
  return (
    <div className="absolute -top-2 -left-2 h-8 w-8 rounded-full bg-yellow-400/95 shadow-[0_0_18px_rgba(255,215,0,0.8)] flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-black/80">
        <path fill="currentColor" d="M12 2l2.9 6.26L22 9.27l-5 4.88L18.2 22 12 18.56 5.8 22 7 14.15l-5-4.88 7.1-1.01L12 2z"/>
      </svg>
    </div>
  );
}

export default function TeamSquad() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("ALL");
  const [sort, setSort] = useState("name"); // name | ratingAT | ratingALL

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`http://localhost:8000/teams/${id}?expand_players=true`);
        const data = await res.json();
        if (!alive) return;
        setTeam(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const players = useMemo(() => {
    if (!team?.squad) return [];
    let list = [...team.squad];

    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(term));
    }
    if (pos !== "ALL") {
      list = list.filter(p => p.naturalPosition === pos);
    }

    if (sort === "name") {
      list.sort((a,b) => a.name.localeCompare(b.name));
    } else if (sort === "ratingAT") {
      list.sort((a,b) => (b.ratings?.AT ?? 0) - (a.ratings?.AT ?? 0));
    } else if (sort === "ratingALL") {
      const avg = p => {
        const r = p.ratings || {};
        const vals = ["GK","DF","MD","AT"].map(k => r[k] ?? 0);
        return vals.reduce((s,v)=>s+v,0)/4;
      };
      list.sort((a,b) => avg(b) - avg(a));
    }

    return list;
  }, [team, q, pos, sort]);

  if (loading) return <div className="p-8 text-blue-200">Loading squad…</div>;
  if (!team) return <div className="p-8 text-red-400">Team not found.</div>;

  return (
    <div className="min-h-screen text-blue-100 bg-gradient-to-br from-[#0a0f24] via-[#0b1a3a] to-[#081124] pb-20">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={`https://flagcdn.com/w40/${countryToCode[team.country]}.png`}
              alt={team.country}
              className="h-7 w-10 rounded border border-white/20"
            />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wide">{team.country}</h1>
              <p className="text-xs text-blue-200/70 uppercase tracking-wider">
                "{team.teamName}" — Squad
              </p>
            </div>
          </div>

          <Link
            to={`/teams/${id}`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 transition"
          >
            ← Back to team
          </Link>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search player name…"
            className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 outline-none focus:ring-2 focus:ring-blue-400/40"
          />
          <select
            value={pos}
            onChange={e=>setPos(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/15"
          >
            <option value="ALL">All positions</option>
            <option value="GK">GK</option>
            <option value="DF">DF</option>
            <option value="MD">MD</option>
            <option value="AT">AT</option>
          </select>
          <select
            value={sort}
            onChange={e=>setSort(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/15"
          >
            <option value="name">Sort: Name</option>
            <option value="ratingAT">Sort: Attack rating</option>
            <option value="ratingALL">Sort: Avg rating</option>
          </select>
        </div>
      </div>

      {/* Grid (A: 4-up desktop) */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {players.map((p) => {
            const isCaptain = !!p.isCaptain;
            return (
              <motion.div
                key={p._id}
                whileHover={{ y: -4, scale: 1.01 }}
                className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 ring-1 ring-white/5 shadow-[0_0_18px_rgba(0,0,0,0.45)]"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar with gold glow for captain */}
                  <motion.div
                    className="relative"
                    animate={isCaptain ? { boxShadow: ["0 0 0px rgba(255,215,0,0)", "0 0 18px rgba(255,215,0,0.8)", "0 0 0px rgba(255,215,0,0)"] } : {}}
                    transition={isCaptain ? { duration: 2, repeat: Infinity } : {}}
                  >
                    {isCaptain && <CaptainStar />}
                    <img
                      src={avatarFor(p)}
                      alt={p.name}
                      className={`h-16 w-16 rounded-full object-cover bg-black/30 border ${isCaptain ? "border-yellow-400 ring-2 ring-yellow-300/60" : "border-white/20"}`}
                    />
                  </motion.div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold truncate">{p.name}</p>
                      {isCaptain && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-300/40 text-yellow-200 uppercase tracking-wider">
                          Captain
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-200/70 mt-0.5">
                      Position: <span className="font-semibold">{p.naturalPosition}</span>
                    </p>
                    <div className="mt-2 grid grid-cols-4 gap-1 text-[11px]">
                      {["GK","DF","MD","AT"].map(k => (
                        <div key={k} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-center">
                          <span className="opacity-70">{k}</span>
                          <div className="font-semibold">{p.ratings?.[k] ?? 0}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {players.length === 0 && (
          <div className="mt-12 text-center text-blue-200/70">
            No players found with current filters.
          </div>
        )}
      </div>
    </div>
  );
}
