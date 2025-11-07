import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getTopScorers } from "../api";
import { countryToCode } from "../countryCodes";

export default function Home() {
  const [stats, setStats] = useState({
    teams: 0,
    matches: 0,
    topScorer: null,
  });
  const [nextMatch, setNextMatch] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [tournamentStatus, setTournamentStatus] = useState(null);
  

  useEffect(() => {
    async function fetchStats() {
      try {
        const teamsRes = await fetch(`${import.meta.env.VITE_API_URL}/teams`);
        const teams = await teamsRes.json();

        let matchesPlayed = 0;
        try {
          const statusRes = await fetch(`${import.meta.env.VITE_API_URL}/tournament/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            matchesPlayed = statusData.matches_played || 0;
            setTournamentStatus(statusData);
          }
        } catch {
          matchesPlayed = 0;
        }

        const scorers = await getTopScorers();

        setStats({
          teams: teams.length,
          matches: matchesPlayed,
          topScorer: scorers.length
            ? `${scorers[0].playerName} (${scorers[0].goals})`
            : "—",
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    }

    async function fetchNextAndResults() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/tournament/bracket`);
        if (!res.ok) return;
        const data = await res.json();
        const matches = data.matches || [];

        // Next pending match
        const upcoming = matches.find((m) => m.status === "pending");
        if (upcoming) {
          const kickoffTime = new Date(Date.now() + 5 * 60 * 1000); 
          setNextMatch({ ...upcoming, kickoffTime });
        }

        // Recent simulated matches
        const finished = matches
          .filter((m) => m.status === "simulated")
          .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
          .slice(0, 3);
        setRecentResults(finished);
      } catch (err) {
        console.error("Error fetching matches:", err);
      }
    }

    fetchStats();
    fetchNextAndResults();
  }, []);

  // Countdown effect
  useEffect(() => {
    if (!nextMatch?.kickoffTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextMatch.kickoffTime - now;
      if (diff <= 0) {
        setCountdown("Kickoff!");
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdown(`${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextMatch]);

  const stages = ["QuarterFinal", "SemiFinal", "Final"];
  const currentStageIndex = tournamentStatus
    ? stages.indexOf(tournamentStatus.current_round)
    : -1;

  return (
    <div className="relative space-y-12 min-h-screen bg-gradient-to-br from-[#0a0f24] via-[#0b1a3a] to-[#081124] text-blue-100 pt-10 pb-20 px-4 sm:px-0">
      {/* Background Hex Pattern */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-[0.30]"
          style={{
            backgroundImage: "url('/home-hex.svg')",
            backgroundSize: "1450px",
            backgroundPosition: "center",
            backgroundRepeat: "repeat",
            filter: "drop-shadow(0 0 10px rgba(0,140,255,0.12))",
          }}
        />

         {/* Hero */}
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-20 shadow-[0_0_26px_rgba(20,125,255,0.25)]">
        <div className="max-w-4xl mx-auto text-center">
         {/* Trophy Icon */}
        <div className="flex justify-center mb-8">
          <img 
            src="/home-trophy.svg"
            className="w-32 h-32 opacity-90 drop-shadow-[0_0_18px_rgba(20,130,255,0.45)]"
            alt="AFNL Trophy"
          />
        </div>

          <motion.h1
           className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-wide text-blue-200 drop-shadow-[0_0_18px_rgba(20,130,255,0.55)] italic"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            African Nations League 2026
          </motion.h1>
          <p className="mb-8 text-lg text-blue-100/75">
            The ultimate battle of nations. Witness the best African football talent.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
           <Link
              to="/bracket"
              className="
                bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-300
                text-black font-bold px-7 py-3 rounded-xl 
                shadow-[0_0_18px_rgba(255,210,0,0.55)]
                hover:shadow-[0_0_28px_rgba(255,225,0,0.75)]
                transition-all duration-300 hover:brightness-125 hover:-translate-y-[2px]
                active:translate-y-[1px]
              "
            >
              View Bracket
            </Link>

            <Link
              to={localStorage.getItem("adminToken") ? "/register" : "/account/login"}
              className="
                bg-white/80 text-blue-900 font-bold 
                px-7 py-3 rounded-xl 
                shadow-[0_0_14px_rgba(255,255,255,0.55)]
                border border-blue-300/20
                hover:bg-white hover:shadow-[0_0_22px_rgba(255,255,255,0.75)]
                hover:-translate-y-[2px]
                transition-all duration-300
                active:translate-y-[1px]
              "
            >
              Register a Team
            </Link>

          </div>
        </div>
      </section>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent my-14 opacity-60" />

      {/* Quick Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <motion.div
          whileHover={{ scale: 1.04, rotate: 0.4 }}
          className="
            bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center
            shadow-[0_0_18px_rgba(0,0,0,0.45)]
            ring-1 ring-white/5
            hover:ring-blue-400/40 hover:shadow-[0_0_22px_rgba(20,125,255,0.35)]
            transition-all duration-300
          "
        >
          <p className="text-2xl sm:text-3xl font-bold text-blue-200 drop-shadow-[0_0_10px_rgba(20,125,255,0.55)]">{stats.teams}</p>
          <p className="text-blue-200/70 text-sm mt-1 tracking-wide uppercase font-semibold">
            Teams Registered
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.04, rotate: 0.4 }}
          className="
            bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center
            shadow-[0_0_18px_rgba(0,0,0,0.45)]
            ring-1 ring-white/5
            hover:ring-blue-400/40 hover:shadow-[0_0_22px_rgba(20,125,255,0.35)]
            transition-all duration-300
          "
        >
          <p className="text-2xl sm:text-3xl font-bold text-blue-200 drop-shadow-[0_0_10px_rgba(20,125,255,0.55)]">{stats.matches}</p>
          <p className="text-blue-200/70 text-sm mt-1 tracking-wide uppercase font-semibold">
            Matches Played
          </p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.04, rotate: 0.4 }}
          className="
            bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center
            shadow-[0_0_18px_rgba(0,0,0,0.45)]
            ring-1 ring-white/5
            hover:ring-blue-400/40 hover:shadow-[0_0_22px_rgba(20,125,255,0.35)]
            transition-all duration-300
          "
        >
          <p className="text-2xl sm:text-3xl font-bold text-blue-200 drop-shadow-[0_0_10px_rgba(20,125,255,0.55)]">{stats.topScorer}</p>
          <p className="text-blue-200/70 text-sm mt-1 tracking-wide uppercase font-semibold">
            Top Scorer
          </p>
        </motion.div>
      </section>

{/* Tournament Progress */}
{tournamentStatus && (
        <section className="
        max-w-3xl mx-auto
        bg-white/20 backdrop-blur-2xl
        border border-white/30
        rounded-2xl
        shadow-[0_0_26px_rgba(255,255,255,0.35)]
        p-6 relative
        text-blue-900
        dark:text-blue-200
      ">
    <h3 className="text-xl font-black uppercase italic mb-6 text-center tracking-[0.12em] text-blue-200 drop-shadow-[0_0_8px_rgba(20,130,255,0.60)]">
      🏆 Tournament Progress
    </h3>
    <div className="relative flex justify-between items-center z-10">
      {stages.map((stage, idx) => {
        const isActive = idx === currentStageIndex;
        const isCompleted = idx <= currentStageIndex;

        return (
          <div key={stage} className="flex flex-col items-center flex-1">
            <motion.div
              initial={{ scale: 1 }}
              animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border z-20 relative transition-all
                ${isCompleted
                  ? "bg-blue-600/80 border-blue-300 text-white shadow-[0_0_10px_rgba(0,145,255,0.65)]"
                  : "bg-blue-900/20 border-white/15 text-gray-400"
                }
              `}

            >
              {idx + 1}
            </motion.div>
            <span className={`mt-2 text-[11px] font-semibold tracking-wide ${
              isActive ? "text-blue-300 drop-shadow-[0_0_6px_rgba(0,145,255,0.45)]" : "text-blue-200/40"
            }`}>
              {stage}
            </span>
          </div>
        );
      })}
    </div>

    {/* Background line */}
    <div className="absolute left-0 right-0 top-[57%] -translate-y-1/2 h-[3px] bg-white/10 backdrop-blur-sm rounded-full"></div>

    {/* Progress line */}
    <div
      className="absolute left-0 right-0 top-[57%] -translate-y-1/2 h-[3px] bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_12px_rgba(0,145,255,0.55)] rounded-full transition-all duration-800"
      style={{
        width: `calc(${(currentStageIndex / (stages.length - 1)) * 100}%)`,
      }}
    ></div>
  </section>
)}


      {/* Next Match */}
      {nextMatch && (
        <section className="
          max-w-3xl mx-auto 
          bg-white/5 backdrop-blur-xl
          border border-white/10 
          rounded-2xl p-8 text-center
          shadow-[0_0_18px_rgba(0,0,0,0.45)]
          ring-1 ring-white/5 
          hover:ring-blue-400/40 hover:shadow-[0_0_26px_rgba(20,125,255,0.35)]
          transition-all duration-300
        ">
          <h3 
            className="text-center font-black text-xl uppercase italic tracking-[0.12em] text-blue-200 drop-shadow-[0_0_8px_rgba(20,130,255,0.60)] mb-6"
          >
            ⚽ Next Match
            <span className="block mx-auto mt-1 h-1 w-10 bg-blue-500 rounded-full animate-pulse"></span>
          </h3>

          <motion.div whileHover={{ scale: 1.02 }} className="flex flex-col sm:flex-row justify-between items-center gap-6 text-lg font-semibold text-blue-200 drop-shadow-[0_0_6px_rgba(20,130,255,0.45)]">
            <div className="flex flex-col items-center">
              <span className="text-lg">{nextMatch.homeTeamName}</span>
              {nextMatch.homeTeamName && (
                <img
                  src={`https://flagcdn.com/w40/${countryToCode[nextMatch.homeTeamName]}.png`}
                  alt={nextMatch.homeTeamName}
                  className="w-16 h-10 mt-4 border"
                />
              )}
            </div>
            <motion.span
              className="text-blue-300 text-2xl font-black select-none cursor-default opacity-80 inline-block"
              initial={{ rotate: 0, y: 0, scale: 1 }}
              whileHover={{
                rotate: [0, 0, 180, 360],
                y: [0, -10, -4, 0],
                scale: [1, 1.25, 1.15, 1],
              }}
              animate={{ rotate: 0, y: 0, scale: 1 }}   // <- this forces return to neutral
              transition={{ duration: 0.9, ease: "easeInOut" }}
            >
              vs
            </motion.span>



            <div className="flex flex-col items-center">
              <span className="text-lg">{nextMatch.awayTeamName}</span>
              {nextMatch.awayTeamName && (
                <img
                  src={`https://flagcdn.com/w40/${countryToCode[nextMatch.awayTeamName]}.png`}
                  alt={nextMatch.awayTeamName}
                  className="w-16 h-10 mt-4 border"
                />
              )}
            </div>
          </motion.div>
         <p 
            className="
              inline-block mx-auto mt-4
              px-3 py-[6px] 
              text-[11px] font-black uppercase tracking-[0.14em]
              bg-white/5 backdrop-blur-xl 
              border border-blue-300/20 
              rounded-xl 
              text-blue-200 
              drop-shadow-[0_0_8px_rgba(20,130,255,0.45)]
              shadow-[inset_0_0_12px_rgba(0,145,255,0.25)]
            "
          >
            Round: {nextMatch.round}
          </p>


{countdown && (
  <motion.p
    className="mt-3 font-black text-[17px] tracking-widest text-blue-200 drop-shadow-[0_0_10px_rgba(0,145,255,0.55)]"
    animate={{
      opacity: [0.7, 1, 0.7],
      scale: [0.98, 1.05, 0.98],
      rotate: countdown === "Kickoff!" ? [0, 2, -2, 0] : 0
    }}
    transition={{
      duration: countdown === "Kickoff!" ? 0.45 : 1.4,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    {countdown === "Kickoff!" ? (
      <span className="text-red-400 drop-shadow-[0_0_14px_rgba(255,0,0,0.65)]">
        🔴 LIVE
      </span>
    ) : (
      <>
        <span className="text-blue-400">⏳</span> {countdown}
      </>
    )}
  </motion.p>
)}

<Link
  to={`/matches/${nextMatch._id}`}
  className="
    mt-4 inline-block
    px-6 py-3
    font-black uppercase tracking-wide text-[12px]
    rounded-2xl
    text-blue-200
    bg-gradient-to-br from-blue-900/40 via-blue-500/30 to-blue-900/40
    border border-blue-300/25
    shadow-[0_0_18px_rgba(0,145,255,0.35)]
    backdrop-blur-xl
    transition-all duration-300
    hover:shadow-[0_0_30px_rgba(20,130,255,0.65)]
    hover:border-blue-400/40
    hover:brightness-125
    hover:translate-y-[-2px]
    active:translate-y-[1px]
  "
>
  View Match →
</Link>


        </section>
      )}
      

      {/* Featured Links */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {[
          { label: "Bracket", to: "/bracket", desc: "See the live tournament bracket." },
          { label: "Top Scorers", to: "/topscorers", desc: "Check the current leaderboard." },
          { label: "Register", to: "/register", desc: "Sign up your team for glory." },
        ].map((card, idx) => (
          <motion.div 
            key={idx} 
            whileHover={{ y: -5, scale: 1.035 }} 
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_18px_rgba(0,0,0,0.35)] p-6 text-blue-100 hover:shadow-[0_0_28px_rgba(20,125,255,0.35)] transition"
          >
            <h3 className="text-xl font-black text-blue-200 drop-shadow-[0_0_6px_rgba(20,130,255,0.45)] mb-2 tracking-wide uppercase"> </h3>
            <p className="text-blue-100/70 text-sm mb-4">{card.desc}</p>
            <Link to={card.to} className="text-blue-400 font-semibold hover:drop-shadow-[0_0_8px_rgba(20,130,255,0.55)] transition">
              Explore →
            </Link>
          </motion.div>
        ))}
      </section>

        {/* Recent Results */}
<section className="max-w-4xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.35)] p-6 text-blue-100">
  <h3 className="text-xl font-bold mb-6 text-center">Recent Results</h3>

  {recentResults.length > 0 ? (
    <div className="space-y-4">
      <AnimatePresence>
        {recentResults.map((match, idx) => (
          <Link key={match._id} to={`/matches/${match._id}`} className="block">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="grid grid-cols-3 items-center p-4 border border-white/10 rounded-xl text-center hover:shadow-[0_0_18px_rgba(0,145,255,0.35)] hover:bg-white/5 backdrop-blur-xl transition cursor-pointer"
            >
              {/* Home */}
              <div className="flex flex-col items-center">
                <span className="font-semibold text-blue-200 drop-shadow-[0_0_6px_rgba(20,130,255,0.45)]">{match.homeTeamName}</span>
                {match.homeTeamName && (
                  <img
                    src={`https://flagcdn.com/w40/${countryToCode[match.homeTeamName]}.png`}
                    alt={match.homeTeamName}
                    className="w-10 h-7 mt-2 border"
                  />
                )}
              </div>

              {/* Score */}
              <div className="text-lg font-bold">
                {match.score?.home} - {match.score?.away}
              </div>

              {/* Away */}
              <div className="flex flex-col items-center">
                <span className="font-semibold text-blue-200 drop-shadow-[0_0_6px_rgba(20,130,255,0.45)]">{match.awayTeamName}</span>
                {match.awayTeamName && (
                  <img
                    src={`https://flagcdn.com/w40/${countryToCode[match.awayTeamName]}.png`}
                    alt={match.awayTeamName}
                    className="w-10 h-7 mt-2 border"
                  />
                )}
              </div>
            </motion.div>
          </Link>
        ))}
      </AnimatePresence>

      {/* View All Link */}
      <div className="text-center mt-6">
        <Link
          to="/bracket"
          className="text-blue-600 font-semibold hover:underline"
        >
          View All Matches →
        </Link>
      </div>

    </div>
  ) : (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 text-center 
      bg-white/5 backdrop-blur-xl 
      border border-blue-300/20 
      rounded-2xl 
      text-blue-200 
      shadow-[0_0_18px_rgba(0,145,255,0.25)]
      drop-shadow-[0_0_6px_rgba(20,130,255,0.45)]"
    >
      <p className="text-lg font-bold tracking-wide uppercase text-blue-300">
        No Results Yet
      </p>
      <p className="text-sm mt-2 text-blue-200/70">
        Results will appear here once matches have been played.
      </p>
    </motion.div>

  )}
</section>

    </div>
  );
}
