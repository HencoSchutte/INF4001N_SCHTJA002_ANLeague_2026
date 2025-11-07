import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { countryToCode } from "../countryCodes";

export default function MatchDetails() {
  const { id } = useParams();
  const location = useLocation();
  const auto = new URLSearchParams(location.search).get("auto") === "1";
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [spineFlash, setSpineFlash] = useState(false);
  const [goalPopup, setGoalPopup] = useState(null);
  const [tensionPulse, setTensionPulse] = useState(false);
  const [goalShockwave, setGoalShockwave] = useState(false);
  const [rippleMinute, setRippleMinute] = useState(null);
  const [momentum, setMomentum] = useState(0); // -1 away to +1 home



  // simple sfx play helper
function playSfx(name) {
  const audio = new Audio(`/${name}.mp3`);
  audio.volume = 0.5;
  audio.play();
}

function duckAmbience(tempVol = 0.25, ms = 3000) {
  const audios = document.querySelectorAll("audio");
  audios.forEach(a => {
    if (a.src.includes("ambience")) {
      const original = a.volume;
      a.volume = tempVol;
      setTimeout(() => (a.volume = original), ms);
    }
  });
}


  function getCountryCode(name) {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    return countryToCode[name] || countryToCode[key] || null;
  }

  const {
    round,
    homeTeamName,
    awayTeamName,
    score = { home: 0, away: 0 },
    commentary = [],
    scorers = [],
  } = details || {};
  const scoreDiff = Math.abs(score.home - score.away);
  const tensionFactor = scoreDiff >= 3 ? 0 : scoreDiff === 2 ? 0.35 : 0.65;


  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/matches/${id}/details`
        );
        if (!res.ok) throw new Error(`Failed to load match details`);
        const data = await res.json();
        if (!aborted) setDetails(data);
      } catch (e) {
        if (!aborted) setErr(e.message);
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [id]);

   useEffect(() => {
  if (!playing) return;

  let delay = 1000; // default 1x = 1 second per minute
  if (speed === 0.5) delay = 2000;
  if (speed === 2) delay = 500;

  const t = setInterval(() => {
    setCurrentMinute((m) => {
      if (m >= 120) {
        setPlaying(false);
        playSfx("final_whistle");
        return 120;
      }
      return m + 1; // ALWAYS +1
    });
  }, delay);

  return () => clearInterval(t);
}, [playing, speed]);


  

useEffect(() => {
  if (!loading && !err && details && auto) {
    // user still needs to interact once in page (like clicking Play)
    playSfx("start_match");
    playSfx("happy_crowd_spike");
    setPlaying(true);
  }
}, [loading, err, details, auto]);


  const homeFlag = getCountryCode(homeTeamName);
  const awayFlag = getCountryCode(awayTeamName);

  // MUST be above early returns — fixes hook order crash
  const timeline = useMemo(() => {
    const items = (commentary || []).map((text, idx) => ({
      type: "comment",
      text,
      minute: null,
      team: idx % 2 === 0 ? "home" : "away",
    }));

    const scorerEvents = (scorers || []).map((s) => ({
      type: "goal",
      text: `${s.playerName} scores for ${s.teamName}`,
      minute: s.minute,
      team: s.teamName === homeTeamName ? "home" : "away",
    }));

    return [...items, ...scorerEvents].sort((a, b) => {
      const am = Number(a.minute) || Infinity;
      const bm = Number(b.minute) || Infinity;
      return am - bm;
    });
  }, [commentary, scorers, homeTeamName, awayTeamName]);

  useEffect(() => {
  if (!timeline || !playing) return;

  const recent = timeline
    .filter(e => e.minute != null && e.minute <= currentMinute)
    .slice(-6);

  let score = 0;
  recent.forEach(e => {
    if (e.type === "goal") {
      // massively swing momentum for goals
      score += e.team === "home" ? 3 : -3;
    } else {
      // small effect from regular commentary lines
      score += e.team === "home" ? 0.3 : -0.3;
    }
  });


  const target = Math.max(-1, Math.min(1, score / 3));

  setMomentum(prev => prev + (target - prev) * 0.1);

}, [currentMinute, timeline, playing]);


    // flash spine when goal minute activates
useEffect(() => {
  if (!timeline) return;

  const anyGoalActivated = timeline.some(
    (e) => e.type === "goal" && e.minute != null && e.minute === currentMinute
  );

  if (anyGoalActivated) {
    setSpineFlash(true);
    setTimeout(() => {
      setSpineFlash(false);
    }, 300);
  }
}, [currentMinute, timeline]);

// popup goal moment when that minute hits
useEffect(() => {
  const g = timeline.find(
    (e) => e.type === "goal" && e.minute === currentMinute
  );
  if (g) {
  playSfx("goal");
  setGoalPopup(g);

  setGoalShockwave(true);
  setTimeout(() => setGoalShockwave(false), 600);

  setTimeout(() => setGoalPopup(null), 2500);
}


}, [currentMinute, timeline]);

// shockwave ripple only when a goal minute *just* activates
useEffect(() => {
  const hasGoalNow = timeline.some(
    (e) => e.type === "goal" && e.minute === currentMinute
  );
  if (!hasGoalNow) return;

  setRippleMinute(currentMinute);
  const t = setTimeout(() => setRippleMinute(null), 700);
  return () => clearTimeout(t);
}, [currentMinute, timeline]);


// ambience loop only while match is playing
const ambienceRef = useRef(null);

useEffect(() => {
  let ambience;

  if (playing) {
    ambience = new Audio("/ambience.mp3");
    ambience.volume = 0.25;
    ambience.loop = true;
    ambience.play();
    ambienceRef.current = ambience;
  }

  return () => {
    if (ambience) {
      ambience.pause();
      ambienceRef.current = null;
    }
  };
}, [playing]);


// pre-goal tension dip 2 seconds before a goal minute
useEffect(() => {
  if (!playing || !timeline) return;

  const nextGoal = timeline.find(
    (e) => e.type === "goal" && e.minute > currentMinute
  );

  if (!nextGoal || !ambienceRef.current) return;

  const diff = nextGoal.minute - currentMinute;

  if (diff === 2 || diff === 1) {
  ambienceRef.current.volume = diff === 2 ? 0.12 : 0.10;
  setTensionPulse(true);
  setTimeout(() => setTensionPulse(false), 600);
}

if (diff === 0) {
  ambienceRef.current.volume = 0.25;
}

}, [currentMinute, playing, timeline]);



// random tension spikes (only while playing + not goal minute)
useEffect(() => {
  if (!playing) return;

  let timeout;

  function scheduleNextSpike() {
    // random delay between 20s and 45s
    const delay = Math.floor(Math.random() * (25000 - 14000 + 1)) + 14000; // 14-25 seconds

    timeout = setTimeout(() => {
      const goalNow = timeline.some(e => e.type === "goal" && e.minute === currentMinute);
      if (!goalNow) {
        let file;
        if (score.home > score.away) file = "/happy_crowd_spike.mp3";
        else if (score.away > score.home) file = "/angry_crowd_spike.mp3";
        else file = "/dissapointed_crowd_spike.mp3";

        duckAmbience(); // gently lower ambience for a moment
        const spikeAudio = new Audio(file);
        spikeAudio.volume = 0.9;
        spikeAudio.play();

      }

      scheduleNextSpike();
    }, delay);
  }

  scheduleNextSpike();
  return () => clearTimeout(timeout);
}, [playing, currentMinute, timeline, score]);


  // early returns AFTER all hooks
  if (loading) return <p className="p-6 text-gray-500">Loading match…</p>;
  if (err) return <p className="p-6 text-red-500">Error: {err}</p>;
  if (!details) return <p className="p-6 text-gray-500">Match not found.</p>;

  // find current minute goal event for ticker
  const currentGoal = timeline.find(
    (e) => e.type === "goal" && e.minute === currentMinute
  );

  return (
  <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-[#0a0f24] via-[#0b1a3a] to-[#081124] text-gray-200">
          {goalPopup && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
    <div className="relative bg-gradient-to-r from-yellow-300 to-yellow-500 text-black font-extrabold
        px-7 py-4 rounded-2xl shadow-2xl border border-yellow-400 text-center text-base
        animate-bounce whitespace-nowrap origin-center">
          
      <span className="text-2xl mr-2">⚽</span>
      {goalPopup.text}

      {/* particle spark burst */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-3 h-3 bg-white rounded-full left-1/4 top-1/2 animate-ping"></div>
        <div className="absolute w-3 h-3 bg-white rounded-full left-2/3 top-1/3 animate-ping delay-150"></div>
        <div className="absolute w-3 h-3 bg-white rounded-full left-1/2 top-1/5 animate-ping delay-300"></div>
      </div>
    </div>
  </div>
)}



      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/bracket"
          className="text-sm text-blue-600 hover:underline hover:text-blue-700"
        >
          ← Back to Bracket
        </Link>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
          {round}
        </span>
      </div>

      {/* Hero scoreboard */}
      <div className="bg-[#0d1330]/60 backdrop-blur-xl border border-blue-900/40 rounded-2xl shadow-xl shadow-blue-900/30 p-5">
        <div className="grid grid-cols-3 items-center">
          {/* Home */}
          <div className="flex items-center gap-3 justify-start">
            {homeFlag && (
              <img
                className="w-10 h-7 rounded shadow-sm ring-1 ring-blue-300/40"
                src={`https://flagcdn.com/w80/${homeFlag}.png`}
                alt={homeTeamName}
              />
            )}
            <div className="text-left">
              <div className="text-sm text-gray-500">Home</div>
              <div className="text-lg font-semibold">{homeTeamName}</div>
            </div>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="text-4xl font-black tracking-wide text-blue-100 drop-shadow-sm">
              {score.home} <span className="text-gray-400 text-2xl">-</span>{" "}
              {score.away}
            </div>
            <div className="text-xs text-blue-300/70 mt-1 uppercase tracking-wider">
              Full Time
            </div>
          </div>

          {/* Away */}
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-500">Away</div>
              <div className="text-lg font-semibold">{awayTeamName}</div>
            </div>
            {awayFlag && (
              <img
                className="w-10 h-7 rounded shadow-sm ring-1 ring-blue-300/40"
                src={`https://flagcdn.com/w80/${awayFlag}.png`}
                alt={awayTeamName}
              />
            )}
          </div>
        </div>
      </div>

      {/* Scorers strip */}
      {scorers.length > 0 && (
        <div className="bg-[#0d1330]/60 border border-blue-900/40 rounded-xl shadow-lg shadow-blue-900/20 p-4 backdrop-blur-md">
          <div className="text-sm  text-blue-700 font-bold mb-2">
            Goal Scorers
          </div>
          <div className="flex flex-wrap gap-2">
            {scorers
              .slice()
              .sort((a, b) => Number(a.minute) - Number(b.minute))
              .map((s, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                  title={`${s.teamName}`}
                >
                  {s.minute}' — {s.playerName}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Split timeline */}
        <div className="bg-[#0d1330]/40 border border-blue-900/30 rounded-2xl shadow-xl shadow-blue-900/20 p-4 md:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-100">Match Commentary</div>

          {/* controls cluster (play/pause/reset/speed) */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <button
              onClick={() => {
                // only trigger start whistle if match minute is 0 AND we're moving into play
                if (!playing && currentMinute === 0) {
                  playSfx("start_match");
                  playSfx("happy_crowd_spike");
                }

                // pause ambience immediately on pause
                if (playing && ambienceRef.current) {
                  ambienceRef.current.pause();
                  ambienceRef.current = null;
                }

                setPlaying(!playing);
              }}
              className="px-2 py-1 border rounded hover:bg-gray-100"
            >
              {playing ? "Pause" : "Play"}
            </button>

            <button
              onClick={() => setCurrentMinute(0)}
              className="px-2 py-1 border rounded hover:bg-gray-100"
            >
              Reset
            </button>

            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="border rounded px-1 py-1"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </select>

            <span className="font-semibold text-gray-700">{currentMinute}'</span>
          </div>
        </div>
        {/* Momentum bar */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
          <div
            className="absolute top-0 bottom-0 transition-all duration-500 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300"
            style={{
              left: "50%",
              width: `${Math.abs(momentum) * 50}%`,
              transform: momentum > 0 ? "translateX(0)" : "translateX(-100%)"
            }}
          />
        </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {/* Left (home) column */}
            <div className="flex flex-col gap-3 bg-gradient-to-b from-blue-900/10 via-transparent to-transparent rounded-xl pb-2"
            style={{ opacity: 1, filter: `brightness(${1 + tensionFactor * 0.18}) saturate(${1 + tensionFactor * 0.25})` }}
            >
              <div className="text-xs uppercase tracking-wide text-blue-700 font-bold mb-1">
                {homeTeamName}
              </div>
              {timeline
                .filter((e) => e.team === "home")
                .map((e, i) => {
                  const active = e.minute == null || e.minute <= currentMinute;
                  return (
                    <motion.div
                      key={`home-${i}`}
                      initial={{ opacity: 0, x: -8, scale: 0.97 }}
                      animate={{
                        opacity: active ? 1 : 0.3,
                        x: 0,
                        scale: active ? 1 : 0.95,
                        boxShadow: active && e.type === "goal"
                          ? "0 0 14px rgba(0, 115, 230, 0.35)"
                          : "0 0 0 rgba(0,0,0,0)"
                      }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className={`relative rounded-lg border px-3 py-2 text-sm ${
                        e.type === "goal"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                      >
                      {e.type === "goal" && e.minute === rippleMinute && (
                        <div className="absolute inset-0 rounded-lg pointer-events-none animate-[ping_0.6s_ease-out] bg-blue-400/25"></div>
                      )}



                      <div className="flex items-center gap-2">
                        {e.type === "goal" ? (
                          <span className="text-xs font-bold text-blue-300">GOAL</span>
                        ) : (
                          <span className="text-xs text-blue-300/50">•</span>
                        )}
                        <span className="text-gray-800">{e.text}</span>
                        {e.minute != null && (
                          <span className="ml-auto text-[11px] text-gray-400">
                            {e.minute}'
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            {/* Center spine */}
            <div className="hidden md:flex flex-col items-center">
              <div
                className={`w-1 rounded-full h-full transition-all duration-300 
                  bg-gradient-to-b from-blue-200 via-gray-200 to-blue-200
                  ${spineFlash ? "brightness-150 shadow-[0_0_18px_rgba(0,115,230,0.45)]" : ""}
                  ${tensionPulse ? "animate-pulse" : ""}
                `}
              />
            </div>

            {/* Right (away) column */}
            <div className="flex flex-col gap-3 bg-gradient-to-b from-red-900/15 via-transparent to-transparent rounded-xl pb-2"
            style={{ opacity: 1, filter: `brightness(${1 + tensionFactor * 0.18}) saturate(${1 + tensionFactor * 0.25})` }}
            >
              <div className="text-xs uppercase tracking-wide text-blue-700 font-bold mb-1 text-right">
                {awayTeamName}
              </div>
              {timeline
                .filter((e) => e.team === "away")
                .map((e, i) => {
                  const active = e.minute == null || e.minute <= currentMinute;
                  return (
                    <motion.div
                      key={`away-${i}`}
                      initial={{ opacity: 0, x: -8, scale: 0.97 }}
                      animate={{
                        opacity: active ? 1 : 0.3,
                        x: 0,
                        scale: active ? 1 : 0.95,
                        boxShadow: active && e.type === "goal"
                          ? "0 0 14px rgba(0, 115, 230, 0.35)"
                          : "0 0 0 rgba(0,0,0,0)"
                      }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors duration-300 ${
                        e.type === "goal"
                          ? "bg-blue-800/40 border-blue-500/40 text-blue-100"
                          : "bg-[#11172e]/50 border-blue-900/30 text-gray-200"
                      }`}

                      >
                      {e.type === "goal" && e.minute === rippleMinute && (
                        <div className="absolute inset-0 rounded-lg pointer-events-none animate-[ping_0.6s_ease-out] bg-blue-400/25"></div>
                      )}



                      <div className="flex items-center gap-2">
                        {e.minute != null && (
                          <span className="text-[11px] text-gray-100">{e.minute}'</span>
                        )}
                        <span className="text-gray-100">{e.text}</span>
                        {e.type === "goal" ? (
                          <span className="ml-auto text-xs font-bold text-blue-700">
                            GOAL
                          </span>
                        ) : (
                          <span className="ml-auto text-xs text-gray-100">•</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        </div>

    </div>
  );
}