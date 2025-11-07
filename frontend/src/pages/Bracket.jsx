// src/pages/Bracket.jsx
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { getBracket, simulateMatch } from "../api";
import { countryToCode } from "../countryCodes";


export default function Bracket() {
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [status, setStatus] = useState(null);
  const [advancingWinner, setAdvancingWinner] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [champion, setChampion] = useState(null);
  const [lastSimulatedMatchId, setLastSimulatedMatchId] = useState(null);
  const [spinePulse, setSpinePulse] = useState(false);


  // --- refs for layout + connectors ---
  const containerRef = useRef(null);
  const cardRefs = useRef({}); 
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState([]); 
  const [hoverId, setHoverId] = useState(null);
  const [hoverMatch, setHoverMatch] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detailsCache, setDetailsCache] = useState({}); 
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [roundAppeared, setRoundAppeared] = useState({
  QuarterFinal: true,   
  SemiFinal: false,
  Final: false
});

    function scrollToMatch(matchId) {
    const el = cardRefs.current[matchId];
    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center"
    });
  }

  function renderPlaceholderCard() {
  return (
    <div className="relative border rounded-2xl p-6 w-56 h-[160px] text-center 
                    bg-[#0e142f]/40 backdrop-blur-xl border-white/10 
                    shadow-[0_0_15px_rgba(0,0,0,0.35)]
                    flex items-center justify-center">
      <span className="
        text-[48px] font-black text-blue-300 
        drop-shadow-[0_0_18px_rgba(0,145,255,0.55)]
      ">
        ?
      </span>
    </div>
  )
}



  useEffect(() => {
    loadBracket();
    const savedToken = localStorage.getItem("adminToken");
    if (savedToken) setAdminToken(savedToken);
  }, []);

  useEffect(() => {
  if (!bracket) return;
  if (!containerRef.current) return;
  
  const raf = requestAnimationFrame(() => {
    try {
      recomputePaths();
    } catch (err) {
      console.warn("compute error:", err);
    }
  });

  const onResize = () => {
    try { recomputePaths(); } catch {}
  };
  window.addEventListener("resize", onResize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
  };
}, [bracket]);


  async function loadBracket() {
    try {
      const data = await getBracket();
      setBracket(data);
      // detect new round unlocks
      if (!data.matches || !Array.isArray(data.matches) || data.matches.length === 0) {
        setBracket(data);
        return;
      }

      const rounds = data.matches.map(m => m.round);
      ["SemiFinal","Final"].forEach(r => {
        if (rounds.includes(r) && !roundAppeared[r]) {
          setRoundAppeared(prev => ({ ...prev, [r]: true }));
        }
      });


      const finalMatch = data.matches.find(
        (m) => m.round === "Final" && m.status === "simulated"
      );
      if (finalMatch?.winnerName) setChampion(finalMatch.winnerName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulate(matchId) {
  if (!adminToken) {
    setStatus("Admin login required.");
    return;
  }

  if (simulating) return; // prevents spam double click
  setSimulating(true);

  try {
    const res = await simulateMatch(matchId, adminToken);
    const winner = res.match.winnerName;
    setAdvancingWinner(winner);
    setLastSimulatedMatchId(matchId);
    setSpinePulse(true);
    setTimeout(() => setSpinePulse(false), 1500);

    setStatus(`Simulated: ${res.match.homeTeamName} vs ${res.match.awayTeamName}`);

    if (res.match.round === "Final") {
      triggerConfetti();
      setChampion(winner);
    }

    setTimeout(async () => {
      await loadBracket();
      setAdvancingWinner(null);
      setSimulating(false);

      // auto scroll to next match that still needs simulation
      const upcoming = bracket?.matches?.find(m => m.status !== "simulated");
      if (upcoming) {
        setTimeout(() => scrollToMatch(upcoming._id), 200);
      }

    }, 1200);


  } catch (err) {
    setStatus(`Error: ${err.message}`);
    setSimulating(false);
  }
}

async function ensureDetails(matchId) {
  if (detailsCache[matchId]) return detailsCache[matchId];
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/${matchId}/details`);
    if (!res.ok) throw new Error("Failed to load details");
    const data = await res.json();
    setDetailsCache((m) => ({ ...m, [matchId]: data }));
    return data;
  } catch (e) {
    console.warn("details load failed:", e);
    return null;
  }
}



  function triggerConfetti() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 25,
      spread: 70,
      ticks: 200,
      zIndex: 1000,
      origin: { y: 0 },
      colors: ["#FFD700", "#FFFACD", "#F8F9FA"],
    };

    (function frame() {
      const timeLeft = animationEnd - Date.now();
      confetti({
        ...defaults,
        particleCount: 8,
        scalar: 1.2,
        origin: { x: Math.random(), y: 0 },
        drift: Math.random() - 0.5,
      });
      if (timeLeft > 0) requestAnimationFrame(frame);
    })();
  }

  if (loading) return <p className="text-gray-500">Loading bracket...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!bracket || !bracket.matches?.length) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0f24] via-[#0b1a3a] to-[#081124] text-blue-200">
      <h2 className="text-3xl font-black tracking-wide text-center 
                     bg-gradient-to-b from-blue-200 via-white to-blue-300 
                     text-transparent bg-clip-text drop-shadow-[0_0_18px_rgba(0,145,255,0.55)]">
        🏆 Tournament Not Started
      </h2>

      <p className="mt-4 text-lg text-blue-300/70">
        Once the tournament begins, the bracket will display here.
      </p>

      <p className="mt-8 text-sm opacity-60">
        (Admin: Start Tournament in Account Center)
      </p>
    </div>
  );
}


  // group by rounds
  const rounds = bracket.matches.reduce((acc, m) => {
    (acc[m.round] = acc[m.round] || []).push(m);
    return acc;
  }, {});
  const qf = (rounds["QuarterFinal"] || []).slice(0, 4);
  const sf = (rounds["SemiFinal"] || []).slice(0, 2);
  const fin = (rounds["Final"] || []).slice(0, 1);
  const nextPendingMatch = bracket.matches.find(m => m.status !== "simulated")?._id;

  // --- helpers to compute connectors ---
  const recomputePaths = () => {
    const root = containerRef.current;
    if (!root) return;

    // prevent layout compute before any matches exist
    if (!qf.length && !sf.length && !fin.length) return;

    const rectRoot = root.getBoundingClientRect();
    const getRightCenter = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.right - rectRoot.left,
        y: r.top - rectRoot.top + r.height / 2,
      };
    };
    const getLeftCenter = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left - rectRoot.left,
        y: r.top - rectRoot.top + r.height / 2,
      };
    };

    // SVG size tracks container size
    setSvgSize({ w: rectRoot.width, h: rectRoot.height });

    const newPaths = [];
    const curve = (p1, p2) => {
      if (!p1 || !p2) return null;
      const dxFactor = window.innerWidth < 900 ? 0.20 : 0.35;
      const dx = Math.max(40, Math.abs(p2.x - p1.x) * dxFactor);

      const d = `M ${p1.x},${p1.y} C ${p1.x + dx},${p1.y} ${p2.x - dx},${p2.y} ${p2.x},${p2.y}`;
      return d;
    };

    // QF (0,1) - SF[0], QF (2,3) -SF[1]
    const qfToSfPairs = [
      [qf[0]?._id, qf[1]?._id, sf[0]?._id],
      [qf[2]?._id, qf[3]?._id, sf[1]?._id],
    ];

    qfToSfPairs.forEach(([qa, qb, sid]) => {
      const sEl = cardRefs.current[sid];
      const sL = getLeftCenter(sEl);

      [qa, qb].forEach((qid) => {
        const qEl = cardRefs.current[qid];
        const qR = getRightCenter(qEl);
        const d = curve(qR, sL);
        if (d) newPaths.push({ d, className: "stroke-blue-400/70", matchIds: [qid, sid] });
      });
    });

    // SF - Final
    const fid = fin[0]?._id;
    if (fid) {
      const fL = getLeftCenter(cardRefs.current[fid]);
      sf.forEach((sm) => {
        const sR = getRightCenter(cardRefs.current[sm?._id]);
        const d = curve(sR, fL);
        if (d) newPaths.push({ d, className: "stroke-blue-600/80", matchIds: [sm?._id, fid] });
      });
    }


    setPaths(newPaths);
  };

 

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-[#0a0f24] via-[#0b1a3a] to-[#081124] text-gray-200">
     <h2 
        className="
          text-4xl font-black tracking-wide text-center 
          bg-gradient-to-b from-blue-200 via-white to-blue-300 
          text-transparent bg-clip-text 
          drop-shadow-[0_0_18px_rgba(0,145,255,0.55)]
          select-none
        "
      >
        🏆 Tournament Bracket
      </h2>
      {status && (
      <p className="mb-4 p-3 rounded-xl text-sm text-center 
                    bg-[#0b132b]/80 border border-blue-300/25 text-blue-200 
                    shadow-[0_0_12px_rgba(0,145,255,0.35)] backdrop-blur-md">
        {status}
      </p>
    )}


      {/* Container establishes the coordinate system for SVG overlay */}
      <motion.div
          ref={containerRef}
          className="relative mx-auto"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.12 
              }
            }
          }}
        >
        {/* SVG connectors (behind cards) */}
        <div className="relative hidden md:block">

        <svg
          className="pointer-events-none absolute inset-0 z-0"
          width={svgSize.w}
          height={svgSize.h}
          style={{ transform: "translateX(2.5rem)" }}
        >
          {paths.map((p, i) => {
          const isGlow = p.matchIds?.includes(lastSimulatedMatchId);
          return (
            <g key={i}>
              <motion.path
              d={p.d}
              fill="none"
              strokeWidth="2.5"
              className={
                p.className +
                (isGlow ? " shadow-[0_0_12px_rgba(0,145,255,0.9)] brightness-150" : "")
              }
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.8, ease: "easeInOut", delay: 0.6 + i * 0.15 }}
            />

              {isGlow && (
                <>
                  <motion.div
                    className="spark"
                    style={{ "--path": `path("${p.d}")` }}
                    key={"sparkA"+i}
                  />
                  <motion.div
                    className="spark"
                    style={{ "--path": `path("${p.d}")` }}
                    key={"sparkB"+i}
                  />
                </>
              )}
            </g>
          );
        })}


        </svg>
        </div>

        <motion.div
          className="
            relative z-10 
            grid 
            grid-cols-1 md:grid-cols-3 
            gap-12 text-gray-200 
          "
          variants={{
            show: {
              transition: {
                staggerChildren: 0.12
              }
            },
            hidden: {}
          }}
          initial="hidden"
          animate="show"
        >
          

          {/* Quarterfinals */}
          <div className="relative w-full flex flex-col gap-10 items-center md:items-start bg-gradient-to-b from-blue-900/10 via-transparent to-transparent rounded-xl p-3">
            <h3 className="text-center font-black text-lg uppercase italic tracking-[0.12em] text-blue-200 drop-shadow-[0_0_8px_rgba(20,130,255,0.60)]">
              Quarter Finals
              <span className="block mx-auto mt-1 h-1 w-10 bg-blue-500 rounded-full"></span>
            </h3>

              <div className="flex flex-col gap-24 md:translate-x-[100px] translate-x-0">
                {qf.map((m, i) => renderMatchCard(m, i))}
              </div>

          </div>

          {/* Semifinals */}
          <div className="relative w-full flex flex-col gap-10 items-center md:items-start bg-gradient-to-b from-blue-900/20 via-transparent to-transparent rounded-xl p-3">
            <h3 className="text-center font-black text-lg uppercase italic tracking-[0.12em] text-blue-200 drop-shadow-[0_0_8px_rgba(20,130,255,0.60)]">
              Semi Finals
              <span className="block mx-auto mt-1 h-1 w-10 bg-blue-500 rounded-full"></span>
            </h3>
              <div className="flex flex-col gap-24 md:translate-x-[100px] translate-x-0">
              {[...sf, ...Array(2 - sf.length).fill(null)].map((m, i) =>
                m ? renderMatchCard(m, i) : renderPlaceholderCard()
              )}

            </div>


          </div>

          {/* Final */}
          <div className="relative w-full flex flex-col gap-10 items-center md:items-start bg-gradient-to-b from-blue-900/20 via-transparent to-transparent rounded-xl p-3">
             <h3 className="text-center font-black text-lg uppercase italic tracking-[0.12em] text-blue-200 drop-shadow-[0_0_8px_rgba(20,130,255,0.60)]">
            Final
            <span className="block mx-auto mt-1 h-1 w-10 bg-blue-500 rounded-full"></span></h3>
           <div className="flex flex-col gap-24 md:translate-x-[100px] translate-x-0">
              {[...fin, ...Array(1 - fin.length).fill(null)].map((m, i) =>
                m ? renderMatchCard(m, i, true) : renderPlaceholderCard()
              )}
            </div>
          </div>
        </motion.div>
        
      </motion.div>

      
                
          {/* Center vertical spine */}
          <div
            className={`pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px]
              bg-gradient-to-b from-blue-300/5 via-blue-400/25 to-blue-300/10
              blur-[3px] transition-all duration-500
              ${spinePulse ? "w-[8px] brightness-150 blur-[5px]" : ""}
            `}
          ></div>
      {hoverId && hoverMatch && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translateX(-50%)"
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="
              px-4 py-3 rounded-xl shadow-[0_0_22px_rgba(0,135,255,0.35)]
              border border-blue-300/40
              bg-[#0b132b]/70 backdrop-blur-xl
              text-[13px] font-semibold text-blue-200
              "

          >
            <div className="text-blue-200 font-black text-[12px] tracking-wider uppercase mb-2 text-center drop-shadow-[0_0_8px_rgba(0,145,255,0.55)]">
              Expected Win Probability
            </div>

            <div className="flex justify-between gap-6">
              <div className="text-blue-200 flex flex-col items-center drop-shadow-[0_0_6px_rgba(0,145,255,0.45)]">
              <span className="text-[11px] font-bold tracking-wide uppercase">{hoverMatch.home.country}</span>
              <span className="text-[16px] font-extrabold text-blue-100 drop-shadow-[0_0_10px_rgba(0,205,255,0.6)]">
                {hoverMatch.home.winPct}%
              </span>
            </div>


              <div className="text-blue-200 flex flex-col items-center drop-shadow-[0_0_6px_rgba(0,145,255,0.45)]">
                <span className="text-[11px] font-bold tracking-wide uppercase">{hoverMatch.away.country}</span>
                <span className="text-[16px] font-extrabold text-blue-100 drop-shadow-[0_0_10px_rgba(0,205,255,0.6)]">
                  {hoverMatch.away.winPct}%
                </span>
              </div>

            </div>
          </motion.div>
        
        </div>
      )}
      
      {champion && (
        <div className="mt-10 text-center">
          <motion.h3
            className="text-3xl font-bold text-yellow-600 flex items-center justify-center gap-2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            👑 {champion} are the Champions! 👑
          </motion.h3>
        </div>
      )}
    </div>
  );

  function renderMatchCard(match, index, isFinal = false) {
    const winner = match.status === "simulated" ? match.winnerName : null;
    const isChampion = isFinal && champion === winner;
    const isAdvancing = advancingWinner === winner;
    const isFinalRoundCard = isFinal && !isChampion;
    const xMove = 0;
    const isNext = nextPendingMatch === match._id;

    return (
      <motion.div
        key={match._id}
        ref={(el) => {
          if (el) cardRefs.current[match._id] = el;
        }}
        onMouseEnter={(e) => {
          setHoverId(match._id);

          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPos({
            x: rect.left + rect.width / 2,
            y: rect.top - 10
          });

          setHoverMatch({
            home: { country: match.homeTeamName, winPct: match.expectedHomeWin },
            away: { country: match.awayTeamName, winPct: match.expectedAwayWin }
          });
        }}


        onMouseLeave={() => {
          setHoverId(null);
          setHoverMatch(null);
        }}

        onClick={() => setExpandedId(expandedId === match._id ? null : match._id)}

         initial={{ opacity: 0, x: -40 }}              
        animate={{ opacity: 1, x: 0 }}               
        transition={{ duration: 0.55, ease: "easeOut" }} 


        className={`relative border rounded-2xl p-4 w-56 text-center transition-all duration-300
         bg-[#0e142f]/70 backdrop-blur-xl border-white/10 shadow-[0_0_18px_rgba(0,0,0,0.45)]
          ring-1 ring-white/5 hover:ring-blue-400/40 hover:shadow-[0_0_26px_rgba(20,125,255,0.35)]
          text-blue-100
          ${winner ? "border-blue-400 shadow-blue-500/50" : ""}
          ${isNext ? "animate-pulse border-yellow-400 shadow-yellow-300/40 shadow-2xl" : ""}
        `}




        whileHover={{ scale: 1.035, rotate: 0.3, background: "rgba(255,255,255,0.14)" }}
        variants={{
          hidden: { opacity: 0, y: 25, scale: 0.98 },
          show: { opacity: 1, y: 0, scale: 1 }
        }}


        style={{
          boxShadow: isFinalRoundCard
          ? "0 0 22px rgba(255,225,0,0.65)"
          : isChampion
            ? "0 0 32px rgba(255,215,0,0.85)"
            : "0 0 6px rgba(0,0,0,0.1)",

          borderColor: isChampion ? "#E8C200" : "",
          background: isChampion
          ? "linear-gradient(135deg, #FFF7C2 0%, #FFE88A 25%, #FFD700 60%, #FFEFAE 100%)"
          : isFinalRoundCard
            ? "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(60,105,255,0.18) 60%, rgba(200,230,255,0.25) 100%)",
          overflow: "hidden",
        }}
      >
        {isChampion && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)",
              mixBlendMode: "screen",
            }}
          />
        )}

       {winner && (
        <motion.div
          className="
            absolute
            top-1
            right-[-16px]
            bg-blue-500/90
            text-white
            text-[9px]
            font-bold
            px-7
            py-[2px]
            shadow-[0_0_8px_rgba(0,145,255,0.45)]
            pointer-events-none
            rounded-sm
          "
          initial={{ rotate: 45, scale: 0.85, opacity: 0, y: 5 }}
          animate={{ rotate: 45, scale: [1, 1.08, 1], opacity: 1, y: 5 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          WIN
          <div className="
          absolute inset-0 
          pointer-events-none 
          bg-gradient-to-br 
          from-white/40 
          via-transparent 
          to-transparent
          skew-x-[15deg]
        "></div>

          </motion.div>
      )}

        {/* inner glass spine */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px]
          bg-gradient-to-b from-blue-200/5 via-blue-300/25 to-blue-200/5 blur-[2px] opacity-60"
        ></div>



        <Link to={`/matches/${match._id}?auto=1`}>
          <motion.p 
            className="text-[10px] mb-2 inline-block px-3 py-[3px] rounded-full 
                      bg-gradient-to-br from-blue-900/70 to-blue-500/30 
                      border border-blue-300/40 text-blue-200 font-semibold tracking-wide
                      shadow-[0_0_8px_rgba(0,145,255,0.25)] backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {match.round}
          </motion.p>


          <div className="flex flex-col items-center gap-2">
          <motion.div
            className={`relative p-2 w-full rounded-xl border border-white/10 overflow-hidden transition-all
              ${winner === match.homeTeamName
                ? "shadow-[0_0_14px_rgba(20,145,255,0.45)]"
                : "shadow-[0_0_6px_rgba(0,0,0,0.25)] hover:shadow-[0_0_12px_rgba(20,145,255,0.35)]"
              }
            `}
            style={{
              backgroundImage: `url(https://flagcdn.com/w160/${countryToCode[match.homeTeamName]}.png)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              minHeight: "72px",
              filter: "brightness(0.88) saturate(0.75)",  
            }}
            animate={
              isAdvancing && winner === match.homeTeamName
                ? { scale: [1, 1.15, 1] }
                : {}
            }
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
          <span
          style={{
            color: "#cbefff",
            textShadow: `
              0 0 4px rgba(120,200,255,0.45),
              0 0 10px rgba(120,200,255,0.35)
            `,
          }}



            className="
              font-extrabold text-[18px] uppercase tracking-wide
              px-3 py-[4px]
              bg-black/40 backdrop-blur-[3px]
              rounded-md
              border border-blue-400/40
              shadow-[0_0_12px_rgba(0,155,255,0.45)]
            "
          >

            {match.homeTeamName}
            {isChampion && winner === match.homeTeamName && (
              <span className="text-yellow-500 text-lg ml-1">👑</span>
            )}
          </span>
          </motion.div>

            <motion.span
              className="text-xs text-gray-400 select-none"
              animate={{ opacity: [0.45, 1, 0.45], y: [-1.5, 1.5, -1.5] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            >
              vs
            </motion.span>

            <motion.div
              className={`relative p-2 w-full rounded-xl border border-white/10 overflow-hidden transition-all
                ${winner === match.awayTeamName
                  ? "shadow-[0_0_14px_rgrgba(20,145,255,0.45)]"
                  : "shadow-[0_0_6px_rgba(0,0,0,0.25)] hover:shadow-[0_0_12px_rgba(20,145,255,0.35)]"
                }
              `}
              style={{
              backgroundImage: `url(https://flagcdn.com/w160/${countryToCode[match.awayTeamName]}.png)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              minHeight: "72px",
              filter: "brightness(0.88) saturate(0.75)",  
              }}
              animate={
                isAdvancing && winner === match.awayTeamName
                  ? { scale: [1, 1.15, 1] }
                  : {}
              }
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >

              <span
                style={{
                  color: "#cbefff",
                  textShadow: `
                    0 0 4px rgba(120,200,255,0.45),
                    0 0 10px rgba(120,200,255,0.35)
                  `,
                }}
                className="
              font-extrabold text-[18px] uppercase tracking-wide
              px-3 py-[4px]
              bg-black/40 backdrop-blur-[3px]
              rounded-md
              border border-blue-400/40
              shadow-[0_0_12px_rgba(0,155,255,0.45)]
            "
          >

            {match.awayTeamName}
            {isChampion && winner === match.awayTeamName && (
              <span className="text-yellow-500 text-lg ml-1">👑</span>
            )}
          </span>

            </motion.div>
          </div>

          {match.status === "simulated" ? (
            <p
              className={`mt-2 text-xl font-black tracking-wide ${
                isChampion ? "text-yellow-500 drop-shadow-[0_0_8px_rgba(255,215,0,0.55)]" : "text-blue-300 drop-shadow-[0_0_6px_rgba(0,145,255,0.45)]"
              }`}
            >
              {match.score.home} <span className="text-gray-400 font-light">-</span> {match.score.away}
            </p>
          ) : (
            <p className="
              mt-2 text-[13px] tracking-wide italic
              bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400
              bg-[length:200%_100%]
              animate-[shimmer_2.8s_linear_infinite]
              text-transparent bg-clip-text
            ">
              Pending…
            </p>
          )}

        </Link>

        {adminToken && match.status !== "simulated" && (
          <button
            disabled={simulating}
            onClick={() => handleSimulate(match._id)}
            className="mt-3 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Simulate
          </button>
        )}
        
        {expandedId === match._id && match.status === "simulated" && (
          <div className="mt-3 text-xs text-gray-700">
            commentary + stats expand coming next
          </div>
        )}

      </motion.div>
    );
  }
}
