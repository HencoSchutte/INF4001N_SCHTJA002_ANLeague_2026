import { useParams, Link} from "react-router-dom";
import { useEffect, useState } from "react";
import { getTeamById } from "../api";
import { countryToCode } from "../countryCodes";
import { motion, AnimatePresence } from "framer-motion";
import { getRegion } from "../countryRegions";
import PlayerModal from "../components/PlayerModal";


export default function TeamDetails() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [captain, setCaptain] = useState(null);
  const [nextMatch, setNextMatch] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [tournamentStatus, setTournamentStatus] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const regionColor = {
    North: "red",
    West: "green",
    East: "blue",
    Central: "purple",
    South: "orange",
    Africa: "teal"
};
const reg = team?.region ?? "Africa"; // fallback to Africa or any default

useEffect(() => {
  async function loadTeam() {
    try {
      const tRes = await fetch(`http://localhost:8000/teams/${id}?expand_players=true`);
        const tData = await tRes.json();
        setTeam(tData);

    } catch (err) {
      console.error("Error fetching team:", err);
    } finally {
      setLoading(false);
    }
  }

  loadTeam();
}, [id]);


  useEffect(() => {
  if (!nextMatch?.kickoffTime) return;  // Ensure nextMatch and kickoffTime are available

  const interval = setInterval(() => {
    const now = new Date();
    const diff = nextMatch.kickoffTime - now;

    if (diff <= 0) {
      setCountdown("Kickoff!");  // Set countdown to "Kickoff!" when the match time arrives
      clearInterval(interval);   // Clear the interval once the match is about to start
    } else {
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}m ${secs}s`);  // Update countdown every second
    }
  }, 1000);

  return () => clearInterval(interval);  // Clean up the interval on component unmount
}, [nextMatch]);  // Dependency array, runs whenever nextMatch changes


useEffect(() => {
  const fetchCaptain = async () => {
    const res = await fetch(`http://localhost:8000/teams/${id}?expand_players=true`);
    const t = await res.json();
    const cap = t.squad.find(p => p.isCaptain);
    setCaptain(cap);
  };
  fetchCaptain();
}, [id]);

useEffect(() => {
  const fetchTeamNextMatch = async () => {
    try {
      const res = await fetch("http://localhost:8000/tournament/bracket");
      if (!res.ok) return;
      const data = await res.json();
      const matches = data.matches || [];

      // Find next match for this team
      const nextMatchForTeam = matches.find(
        (match) =>
          (match.homeTeam === id || match.awayTeam === id) &&
          match.status === "pending"
      );

      if (nextMatchForTeam) {
        const kickoffTime = new Date(Date.now() + 5 * 60 * 1000); // Mocking time here
        setNextMatch({ ...nextMatchForTeam, kickoffTime });
      } else {
        setNextMatch(null); // If no match found
      }
    } catch (err) {
      console.error("Error fetching next match:", err);
    }
  };

  fetchTeamNextMatch();
}, [id]); // Dependency on `id` to fetch next match when the team changes


  if (loading) return <p className="text-blue-200">Loading...</p>;
  if (!team) return <p className="text-red-400">Team not found.</p>;
    console.log("TEAM OBJECT →", team);
  const region = getRegion(team.country); 

  return (
  <div className=" min-h-screen text-blue-100 bg-gradient-to-br from-[#0a0f24] via-[#0b1a3a] to-[#081124] pb-20">

    <div className="max-w-6xl mx-auto pt-10 px-4 flex flex-col md:flex-row gap-8 items-start">

      {/* LEFT SIDE - Flag + Country */}
      <div className="md:w-[45%]">

        {/* Hero flag */}
        <div 
          className="relative h-[300px] w-full overflow-hidden flex items-center justify-center rounded-2xl"
          style={{
            backgroundImage: `url(https://flagcdn.com/${countryToCode[team.country]}.svg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
          <div className="relative z-10 text-center px-1">
            <h1 className="text-4xl font-black uppercase tracking-wide text-blue-50 drop-shadow-[0_0_18px_rgba(20,130,255,0.6)] italic">
              {team.country}
            </h1>

            {team.teamName && (
              <p className="mt-1 text-blue-200/80 text-sm tracking-wide uppercase">
                "{team.teamName}"
              </p>
            )}
          </div>
        </div>
        
                {/* Team Identity / National Personality */}
        <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_0_18px_rgba(0,0,0,0.45)] ring-1 ring-white/5 space-y-3">
        <h3 className="text-lg font-black uppercase tracking-wide text-blue-200 drop-shadow-[0_0_10px_rgba(20,130,255,0.55)] italic">
            Team Identity
        </h3>

        <p className="text-sm text-blue-200/70 leading-relaxed">
            This national team represents {team.country} on the continental stage and fights to carry the pride, culture and competitive legacy of the nation. Every match is more than football — it is a symbol of strength, unity and national spirit.
        </p>

        <div className="mt-3 flex gap-3 text-[11px] uppercase tracking-widest text-blue-200/60">
            <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-xl">
            Physical
            </span>
            <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-xl">
            High Press
            </span>
            <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-xl">
            Counter Attack
            </span>
        </div>
        </div>

        {/* Tactical Identity */}
        <div className={`mt-6 bg-${regionColor[region]}-500/20 border border-${regionColor[region]}-400/30 rounded-2xl p-6 shadow-[0_0_22px_rgba(0,0,0,0.45)]`}>

        <h3 className="text-lg font-black uppercase tracking-wide text-blue-200 drop-shadow-[0_0_10px_rgba(20,130,255,0.55)] italic mb-3">
            Tactical Profile
        </h3>

        <p className="text-sm text-blue-200/70 leading-relaxed mb-4">
            {team.country} is historically known for a unique brand of football shaped by regional identity, player culture and stylistic legacy.
        </p>

        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-widest">
            {(team.tacticalStyles ?? ["Physical", "Counter Press", "Direct Passing"]).map((tag,i) => (
        <span key={i} className={`px-3 py-1 ${regionColor[reg]?.pill} rounded-xl text-blue-200/90`}>
            {tag}
        </span>
        ))}
        </div>
        </div>


        {/* Next Match or No Upcoming Match*/}
        <div className="max-w-6xl mx-auto px-4">
        {nextMatch ? (
            <section
            className="mt-10 bg-gradient-to-r from-blue-900 to-blue-500 backdrop-blur-xl
                border border-white/20 rounded-2xl p-8 text-center shadow-lg ring-2 ring-white/10
                hover:ring-blue-400/40 hover:shadow-[0_0_26px_rgba(20,125,255,0.35)] transition-all duration-300"
            >
            <h3
                className="text-center font-black text-xl uppercase italic tracking-[0.12em] text-white drop-shadow-[0_0_8px_rgba(20,130,255,0.60)] mb-6"
            >
                ⚽ Next Match
                <span className="block mx-auto mt-1 h-1 w-10 bg-blue-300/80 rounded-full animate-pulse"></span>
            </h3>

        <div className="flex items-center justify-center gap-6 md:gap-10">
            {/* Home */}
            <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-white">{nextMatch.homeTeamName}</span>
            {nextMatch.homeTeamName && (
                <img
                src={`https://flagcdn.com/w40/${countryToCode[nextMatch.homeTeamName]}.png`}
                alt={nextMatch.homeTeamName}
                className="w-14 h-10 mt-3 border border-white/20 rounded"
                />
            )}
            </div>

            {/* VS Pill */}
            <motion.span
            className="px-4 py-2 text-white/90 font-black tracking-widest uppercase text-sm
                        rounded-xl border border-white/25 bg-white/10 backdrop-blur-xl"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.08, rotate: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 12 }}
            >
            vs
            </motion.span>

            {/* Away */}
            <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-white">{nextMatch.awayTeamName}</span>
            {nextMatch.awayTeamName && (
                <img
                src={`https://flagcdn.com/w40/${countryToCode[nextMatch.awayTeamName]}.png`}
                alt={nextMatch.awayTeamName}
                className="w-14 h-10 mt-3 border border-white/20 rounded"
                />
            )}
            </div>
        </div>

        {/* Meta */}
        <div className="mt-5 space-y-1">
            <p className="text-xs text-blue-100/80">{nextMatch.round} Round</p>
            <p className="text-xs text-blue-100/70">
            Scheduled for: {new Date(nextMatch.kickoffTime).toLocaleString()}
            </p>
        </div>

        {/* Countdown */}
        {countdown && (
            <motion.p
            className="mt-4 font-black text-2xl tracking-widest text-blue-100 drop-shadow-[0_0_10px_rgba(0,145,255,0.55)]"
            animate={{
                opacity: [0.7, 1, 0.7],
                scale: [0.98, 1.05, 0.98],
                rotate: countdown === "Kickoff!" ? [0, 2, -2, 0] : 0,
            }}
            transition={{
                duration: countdown === "Kickoff!" ? 0.45 : 1.4,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            >
            {countdown === "Kickoff!" ? (
                <span className="text-red-400 drop-shadow-[0_0_14px_rgba(255,0,0,0.65)]">
                🔴 LIVE
                </span>
            ) : (
                <>
                <span className="text-blue-300">⏳</span> {countdown}
                </>
            )}
            </motion.p>
        )}
        </section>
    ) : (
        /* Fallback: No upcoming match */
        <section
        className="mt-10 bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-8 text-center
                    shadow-[0_0_18px_rgba(0,0,0,0.35)] ring-1 ring-white/5"
        >
        <h3 className="text-center font-black text-xl uppercase italic tracking-[0.12em] text-blue-200 mb-4">
            No Upcoming Match
        </h3>
        <p className="text-blue-200/75">
            This team has no fixture scheduled yet. Check back soon or{' '}
            <Link to="/bracket" className="text-blue-300 font-semibold hover:text-blue-200 transition">
            View the bracket {' '}
            </Link>
            for updates.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl
                        border border-blue-300/25 bg-gradient-to-br from-blue-900/30 to-blue-600/20">
            <span>📅</span>
            <span className="text-sm tracking-wide text-blue-100/80">Awaiting next draw</span>
        </div>
        </section>
    )}
        </div>
        </div>


      {/* RIGHT SIDE BODY */}
      <div className="flex-1 space-y-10">

        {/* Basic Info Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_0_18px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-blue-200/60">Manager</p>
              <p className="font-semibold text-blue-200 mt-1">{team.managerName || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-blue-200/60">Rating</p>
              <p className="font-semibold text-blue-200 mt-1">{(team.rating ?? 0).toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-blue-200/60">Region</p>
              <p className="font-semibold text-blue-200 mt-1">{getRegion(team.country)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-blue-200/60">Founded</p>
              <p className="font-semibold text-blue-200 mt-1">
                {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Historical Stats */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_0_18px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
        <h2 className="uppercase tracking-widest text-blue-200/80 text-xs font-bold mb-4">
            Team History Achievements
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 text-center gap-6">
            <div>
            <p className="text-3xl font-black text-blue-200 drop-shadow-[0_0_10px_rgba(20,125,255,0.55)]">
                {team.wins}
            </p>
            <p className="text-blue-200/60 text-[11px] mt-1 uppercase font-semibold tracking-wide">
                All Time Wins
            </p>
            </div>

            <div>
            <p className="text-3xl font-black text-blue-200 drop-shadow-[0_0_10px_rgba(255,50,50,0.55)]">
                {team.losses}
            </p>
            <p className="text-blue-200/60 text-[11px] mt-1 uppercase font-semibold tracking-wide">
                All Time Losses
            </p>
            </div>

            <div>
            <p className="text-3xl font-black text-yellow-300 drop-shadow-[0_0_10px_rgba(255,195,20,0.55)]">
                {team.finalsHistory?.length ?? 0}
            </p>
            <p className="text-blue-200/60 text-[11px] mt-1 uppercase font-semibold tracking-wide">
                Finals Reached
            </p>
            </div>

            <div>
            <p className="text-3xl font-black text-yellow-200 drop-shadow-[0_0_10px_rgba(255,215,100,0.55)]">
                {team.winnersHistory?.length ?? 0}
            </p>
            <p className="text-blue-200/60 text-[11px] mt-1 uppercase font-semibold tracking-wide">
                Titles Won
            </p>
            </div>
        </div>
        </div>

        {/* Captain Featured Card */}
        {captain && (
        <div className="
            bg-gradient-to-br from-yellow-500/25 via-yellow-500/15 to-yellow-300/10
            border border-yellow-500/40
            rounded-2xl p-6 mt-6 
            shadow-[0_0_32px_rgba(255,205,50,0.45)]
            ring-1 ring-yellow-300/25
            backdrop-blur-xl
            ">
                <div className="flex items-center gap-4">

                    <div className="relative flex items-center justify-center w-12 h-12 rounded-full 
                                    bg-[#0f172a] border border-yellow-400 
                                    shadow-[0_0_20px_rgba(255,220,50,0.65)] overflow-hidden group">
                        <span className="text-yellow-300 font-extrabold text-lg tracking-wider">C</span>

                        {/* shine overlay */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr 
                                        from-yellow-200/30 via-yellow-500/20 to-transparent 
                                        opacity-60 group-hover:opacity-95 transition-all duration-300"></div>
                    </div>

                    <div>
                        <p className="uppercase text-xs tracking-widest text-yellow-200/80">Team Captain</p>
                        <p className="text-lg font-bold text-yellow-200">{captain.name}</p>
                        <p className="text-yellow-300/70 text-xs mt-1">Natural Position: {captain.naturalPosition}</p>
                    </div>

                </div>
            </div>

        )}

        {/* Squad Section */}
        {team.squad && Array.isArray(team.squad) && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_0_18px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
            <h3 className="text-lg font-black uppercase tracking-wide text-blue-200 drop-shadow-[0_0_10px_rgba(20,130,255,0.55)] italic mb-4">
            Squad (23 Man)
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {team.squad.map(player => (
                <div
                key={player._id}
                onClick={() => setSelectedPlayer(player)}
                className="
                    cursor-pointer bg-white/5 hover:bg-white/10 transition rounded-xl p-3 
                    border border-white/10 hover:border-blue-400/30 
                    hover:shadow-[0_0_12px_rgba(20,130,255,0.35)]
                    hover:translate-y-[-2px]
                "
                >
                <p className="font-semibold text-blue-100 text-sm">{player.name}</p>
                <p className="text-[10px] text-blue-300/70 uppercase tracking-wide mt-1">
                    {player.naturalPosition}
                </p>
                </div>


            ))}
            </div>
        </div>
        )}

        {/* View Players / Squad CTA */}
        <div className="flex justify-center mt-6">
        <Link
            to={`/team/${id}/squad`}
            className="group inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                    bg-gradient-to-br from-[#2f3f87]/70 to-[#1f2a5a]/70
                    border border-white/15 ring-1 ring-white/5
                    hover:from-[#3750b2]/80 hover:to-[#24347a]/80
                    shadow-[0_8px_24px_rgba(0,0,0,0.35)]
                    transition-all"
        >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md
                            bg-white/10 border border-white/15">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                <path fill="currentColor" d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7.5 9a7.5 7.5 0 0115 0v1h-15v-1z"/>
            </svg>
            </span>
            <span className="font-semibold tracking-wide text-blue-100">
            View Players
            </span>
            <svg
            className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
            viewBox="0 0 24 24"
            >
            <path fill="currentColor" d="M13 5l7 7-7 7v-4H4v-6h9V5z"/>
            </svg>
        </Link>
        </div>

        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />




        {/* Placeholder future sections */}
        <div className="text-blue-200/50 italic text-center">
          More coming below — matches, roster, stats, badges, achievements etc...
        </div>

      </div>
    </div>
    </div>
  );
}
