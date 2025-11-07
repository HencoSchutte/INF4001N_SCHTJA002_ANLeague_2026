import { useEffect, useState } from "react";
import { getTopScorers } from "../api";
import { countryToCode } from "../countryCodes";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X } from "lucide-react";

export default function TopScorers() {
  const [scorers, setScorers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null); // modal state
  const [selectedTeam, setSelectedTeam] = useState("All");
  const [selectedSeason, setSelectedSeason] = useState("2026");
  const [sortDir, setSortDir] = useState("desc"); // sorting goals
  



  useEffect(() => {
    getTopScorers()
      .then((data) => {
        setScorers(data);
        setFiltered(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filter as user types
  useEffect(() => {
  let data = [...scorers];

  // team filter
  if (selectedTeam !== "All") {
    data = data.filter((s) => s.team === selectedTeam);
  }

  // search filter
  if (search) {
    data = data.filter(
      (s) =>
        s.playerName.toLowerCase().includes(search.toLowerCase()) ||
        s.team.toLowerCase().includes(search.toLowerCase())
    );
  }

  // sort by goals
  data.sort((a, b) =>
    sortDir === "asc" ? a.goals - b.goals : b.goals - a.goals
  );

  setFiltered(data);
}, [search, scorers, selectedTeam, sortDir]);


  if (loading) return <p className="text-gray-500">Loading leaderboard...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!scorers.length) return <p className="text-gray-500">No top scorers yet.</p>;

  return (
    <div className="min-h-screen p-10 max-w-6xl mx-auto text-blue-100 relative 
      bg-gradient-to-br from-[#0a0f24] via-[#0b1a3a] to-[#081124]">
        
        <div
          className="absolute inset-0 pointer-events-none opacity-60"/>
        <div className="relative z-10 space-y-10">

      {/* Header with share button */}
      <div className="flex justify-between items-center mb-6">
        <h2
          className="text-3xl font-black uppercase italic tracking-wide 
                    text-blue-200 drop-shadow-[0_0_12px_rgba(20,130,255,0.55)]"
        >
          Top Scorers Leaderboard
        </h2>

        <button
            className="
              flex items-center space-x-1 px-5 py-2 rounded-xl 
              bg-white/10 backdrop-blur-xl border border-white/15 
              text-blue-200 font-semibold
              shadow-[0_0_14px_rgba(20,130,255,0.25)]
              hover:shadow-[0_0_22px_rgba(20,130,255,0.45)]
              hover:border-blue-300/40 hover:text-blue-300
              transition-all duration-300
            "
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Top Scorers", url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied!");
              }
            }}
          >

          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

            {/* TOP 3 SPOTLIGHT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
        {filtered.slice(0,3).map((s,i) => (
          <motion.div
            key={s._id}
            onClick={() => setSelectedPlayer(s)}
            whileHover={{ y: -6, scale: 1.03 }}
            className="
              cursor-pointer relative p-6 rounded-2xl
              bg-white/10 backdrop-blur-xl border border-white/20
              shadow-[0_0_26px_rgba(20,125,255,0.35)]
              flex flex-col items-center text-center
              hover:border-blue-400/40 hover:shadow-[0_0_32px_rgba(20,125,255,0.55)]
              transition
            "
          >
            <div className="absolute -top-4 px-4 py-[2px] rounded-full text-[10px] font-bold
              bg-gradient-to-r from-yellow-300 to-yellow-500 text-black shadow-[0_0_12px_rgba(255,215,0,0.55)]
            ">
              {i === 0 ? "GOLD" : i === 1 ? "SILVER" : "BRONZE"}
            </div>

            <p className="text-lg font-black text-blue-200 mt-5">{s.playerName}</p>

            <div className="flex items-center gap-2 mt-2 text-blue-100/80 text-sm">
              {s.team && countryToCode[s.team] && (
                <img
                  src={`https://flagcdn.com/w20/${countryToCode[s.team]}.png`}
                  className="w-5 h-4 border"
                />
              )}
              <span>{s.team}</span>
            </div>

            <motion.div
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mt-3 text-4xl font-black text-blue-300 drop-shadow-[0_0_12px_rgba(20,125,255,0.75)]"
            >
              {s.goals} ⚽
            </motion.div>
          </motion.div>
        ))}
      </div>


      {/* Search bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search player or team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full sm:w-1/3 px-4 py-2 rounded-xl
            bg-white/10 backdrop-blur-xl border border-white/15
            text-blue-100 placeholder-blue-200/40
            shadow-[0_0_14px_rgba(20,125,255,0.25)]
            focus:ring-2 focus:ring-blue-400/50 focus:outline-none
            transition-all duration-300
          "
        />
      </div>
            {/* Filters row */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Team Filter */}
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="
            px-4 py-2 rounded-xl
            bg-white/10 backdrop-blur-xl border border-white/15
            text-blue-100
            shadow-[0_0_12px_rgba(20,125,255,0.25)]
            focus:ring-2 focus:ring-blue-400/50 focus:outline-none
            transition-all duration-300
          "
        >
          {["All", ...new Set(scorers.map((s) => s.team))].map((t) => (
            <option key={t} value={t} className="text-black">
              {t}
            </option>
          ))}
        </select>

        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="
            px-4 py-2 rounded-xl
            bg-white/10 backdrop-blur-xl border border-white/15
            text-blue-100
            shadow-[0_0_12px_rgba(20,125,255,0.25)]
            focus:ring-2 focus:ring-blue-400/50 focus:outline-none
            transition-all duration-300
          "
        >
          {["2026", "2025", "2024"].map((s) => (
            <option key={s} value={s} className="text-black">
              Season {s}
            </option>
          ))}
        </select>

      </div>

      {/* Table view (desktop) */}
      <div className="overflow-x-auto hidden md:block">
        <table className="
          min-w-full 
          border border-white/10 
          rounded-2xl overflow-hidden
          bg-white/5 backdrop-blur-xl
          shadow-[0_0_18px_rgba(0,0,0,0.35)]
          ring-1 ring-white/10
        ">
          <thead className="bg-white/10 text-blue-200 uppercase text-sm font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-2 text-left">nr.</th>
              <th className="px-4 py-2 text-left">Player</th>
              <th className="px-4 py-2 text-left">Team</th>
              <th
              className="px-4 py-2 text-right cursor-pointer select-none"
              onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            >
              Goals {sortDir === "asc" ? "⬆️" : "⬇️"}
            </th>

            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((s, index) => (
                <motion.tr
                  key={s._id}
                  onClick={() => setSelectedPlayer(s)} // open modal
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0px 5px 15px rgba(0,0,0,0.1)",
                  }}
                  className="
                      bg-white/5 border-b border-white/10 
                      hover:bg-white/10 hover:shadow-[0_0_18px_rgba(20,125,255,0.35)]
                      transition cursor-pointer
                    "
                  >
                  <td className="px-4 py-3 font-black text-lg text-blue-200 drop-shadow-[0_0_6px_rgba(20,130,255,0.45)]">
                    {index + 1}
                    {index === 0 && <span className="ml-2">🥇</span>}
                    {index === 1 && <span className="ml-2">🥈</span>}
                    {index === 2 && <span className="ml-2">🥉</span>}
                  </td>
                  <td className="px-4 py-3">{s.playerName}</td>
                  <td className="px-4 py-3 flex items-center space-x-2">
                    {countryToCode[s.team] && (
                      <motion.img
                        src={`https://flagcdn.com/w20/${countryToCode[s.team]}.png`}
                        alt={s.team}
                        className="w-6 h-5 border rounded-[3px]"
                        animate={
                          index < 3
                            ? {
                                boxShadow: [
                                  `0 0 0px ${ index===0 ? '#FFD700' : index===1 ? '#C0C0C0' : '#CD7F32' }`,
                                  `0 0 16px ${ index===0 ? '#FFD700' : index===1 ? '#C0C0C0' : '#CD7F32' }`,
                                  `0 0 4px ${ index===0 ? '#FFD700' : index===1 ? '#C0C0C0' : '#CD7F32' }`,
                                ],
                              }
                            : {}
                        }
                        transition={{ duration: 1.7, repeat: Infinity, repeatType: "mirror" }}
                      />
                    )}
                    <span>{s.team}</span>
                  </td>
                  <motion.td 
                    className="px-4 py-3 font-black text-right text-blue-300 drop-shadow-[0_0_6px_rgba(20,130,255,0.45)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    {s.goals}
                  </motion.td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden mt-6">
        {filtered.map((s, index) => (
          <motion.div
            key={s._id}
            className="
              p-5 
              bg-white/5 backdrop-blur-xl 
              border border-white/10 
              rounded-2xl 
              shadow-[0_0_18px_rgba(0,0,0,0.35)]
              ring-1 ring-white/5 
              text-blue-100 
              hover:ring-blue-400/40 hover:shadow-[0_0_22px_rgba(20,125,255,0.35)]
              transition-all duration-300
            "
            onClick={() => setSelectedPlayer(s)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03, rotate: 0.4 }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-lg text-blue-200 drop-shadow-[0_0_8px_rgba(20,130,255,0.55)]">
                #{index + 1}{" "}
                {index === 0 && <span className="ml-2 text-yellow-300 drop-shadow-[0_0_10px_rgba(255,215,0,0.75)]">🥇</span>}
                {index === 1 && <span className="ml-2 text-gray-300 drop-shadow-[0_0_10px_rgba(200,200,200,0.65)]">🥈</span>}
                {index === 2 && <span className="ml-2 text-orange-300 drop-shadow-[0_0_10px_rgba(255,145,0,0.75)]">🥉</span>}
              </span>
              <span className="font-bold">{s.goals} ⚽</span>
            </div>
            <p className="font-semibold text-blue-200 drop-shadow-[0_0_6px_rgba(20,130,255,0.45)]">{s.playerName}</p>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {countryToCode[s.team] && (
                <motion.img
                  src={`https://flagcdn.com/w20/${countryToCode[s.team]}.png`}
                  alt={s.team}
                  className="w-6 h-5 border rounded-[3px]"
                  animate={
                    index < 3
                      ? {
                          boxShadow: [
                            `0 0 0px ${ index===0 ? '#FFD700' : index===1 ? '#C0C0C0' : '#CD7F32' }`,
                            `0 0 16px ${ index===0 ? '#FFD700' : index===1 ? '#C0C0C0' : '#CD7F32' }`,
                            `0 0 4px ${ index===0 ? '#FFD700' : index===1 ? '#C0C0C0' : '#CD7F32' }`,
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 1.7, repeat: Infinity, repeatType: "mirror" }}
                />
              )}
              <span>{s.team}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
        

      {/* Player Modal */}
<AnimatePresence>
  {selectedPlayer && (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]"

      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="
          bg-white/25 backdrop-blur-xl 
          border border-white/15 
          rounded-2xl p-8 max-w-md w-full
          shadow-[0_0_28px_rgba(20,125,255,0.45)]
          ring-1 ring-white/25
          text-blue-100
          transition-all duration-300
          relative
          "

        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          onClick={() => setSelectedPlayer(null)}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Player Image */}
        <div className="flex justify-center mb-4">
          <motion.img
            src={selectedPlayer.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"}
            alt={selectedPlayer.playerName}
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            animate={
              (() => {
                const idx = filtered.findIndex(p => p._id === selectedPlayer._id);
                if (idx === 0) return { boxShadow: ["0 0 4px #FFD700","0 0 18px #FFD700","0 0 6px #FFD700"] }
                if (idx === 1) return { boxShadow: ["0 0 4px #C0C0C0","0 0 18px #C0C0C0","0 0 6px #C0C0C0"] }
                if (idx === 2) return { boxShadow: ["0 0 4px #CD7F32","0 0 18px #CD7F32","0 0 6px #CD7F32"] }
                return {}
              })()
            }
            transition={{ duration: 1.7, repeat: Infinity, repeatType: "mirror" }}
          />

        </div>


        <h3 className="text-xl font-black mb-3 text-center uppercase tracking-wide text-blue-200 drop-shadow-[0_0_8px_rgba(20,130,255,0.55)]">{selectedPlayer.playerName}</h3>
        <div className="flex items-center justify-center space-x-2 mb-4">
          {selectedPlayer.team && countryToCode[selectedPlayer.team] && (
            <img
              src={`https://flagcdn.com/w40/${countryToCode[selectedPlayer.team]}.png`}
              alt={selectedPlayer.team}
              className="w-8 h-6 border"
            />
          )}
          <span className="font-medium">{selectedPlayer.team}</span>
        </div>

        <div className="space-y-2 text-center">
          <p><strong>⚽ Goals:</strong> {selectedPlayer.goals}</p>
          {selectedPlayer.matches && (
            <p><strong>🎯 Matches Played:</strong> {selectedPlayer.matches}</p>
          )}
          {selectedPlayer.rating && (
            <p><strong>⭐ Player Rating:</strong> {selectedPlayer.rating.toFixed(1)}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
    </div>
  );
}
