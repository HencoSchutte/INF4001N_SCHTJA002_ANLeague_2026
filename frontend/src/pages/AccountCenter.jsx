// src/pages/AccountCenter.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Play, RefreshCcw, Rocket, Users } from "lucide-react";
import { startTournament, resetTournament, autoSimulateTournament, seedDemoTeams, seedAddDemoTeam, rebuildBracket  } from "../api";
import { getTournamentStatus } from "../api";


export default function AccountCenter() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [tStatus, setTStatus] = useState(null);


useEffect(() => {
  const t = localStorage.getItem("adminToken");
  if (!t) {
    navigate("/account/login");
    return;
  }
  setToken(t);
  setAuthChecked(true);

  // fetch tournament status if exists
  getTournamentStatus()
    .then(res => setTStatus(res))
    .catch(() => setTStatus(null));
}, [navigate]);

if (!authChecked) {
  return <div className="min-h-screen bg-[#050814]" />;
}

  async function execAction(fn, label) {
    setLoading(true);
    setStatus(null);
    try {
      await fn(token);
      setStatus(`${label} executed`);
    } catch (err) {
      setStatus(`${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-[#050814] text-blue-100 relative px-6 pb-32 pt-20">

      {/* global holo sweep */}
      <div className="absolute inset-0 opacity-[0.12] bg-gradient-to-br from-blue-800/30 via-transparent to-blue-500/30 pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full space-y-10">


        {/* header */}
        <div className="text-center">
          <h2 className="text-3xl font-black uppercase tracking-[0.15em] text-blue-200 drop-shadow-[0_0_18px_rgba(0,145,255,0.55)] italic">
            Admin Control Center
          </h2>
          <p className="mt-1 text-xs text-blue-200/50 tracking-[0.25em] uppercase">
            Federation Operations Terminal
          </p>
        </div>


        {tStatus && (
          <div className="text-center pt-4">
            <div className="inline-block bg-white/5 border border-blue-300/25 rounded-xl px-5 py-3 text-sm uppercase tracking-wider font-semibold text-blue-200 shadow-[0_0_15px_rgba(0,145,255,0.25)]">
              Tournament Status: <span className="text-blue-300 font-black">{tStatus.status}</span> — Round: <span className="text-yellow-300 font-black">{tStatus.current_round}</span>
            </div>
          </div>
        )}

        {/* ACTION BLOCKS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 w-full max-w-5xl mx-auto">
           <div className="space-y-6">

        {/* Seed Demo Teams */}
        <div className="bg-white/5 border border-green-400/20 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(0,255,120,0.25)]">
          <h3 className="text-sm font-bold text-green-300 tracking-wider uppercase mb-3">Seed Demo Teams</h3>
          <button
            disabled={loading}
            onClick={() => execAction(seedDemoTeams, "Seed Demo Teams")}
            className="w-full flex justify-center items-center gap-2 bg-green-500/80 hover:bg-green-500 text-black py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] shadow-[0_0_14px_rgba(0,255,120,0.45)] disabled:opacity-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
            </svg>
            Seed Demo Teams
          </button>
        </div>

        {/* Add 8th Demo Team */}
        <div className="bg-white/5 border border-amber-400/20 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(255,191,0,0.35)]">
          <h3 className="text-sm font-bold text-amber-300 tracking-wider uppercase mb-3">
            Add 8th Demo Team
          </h3>

          <button
            disabled={loading}
            onClick={() => execAction(seedAddDemoTeam, "Add Demo Team")}
            className="w-full flex justify-center items-center gap-2 bg-amber-500/80 hover:bg-amber-500 text-black py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] shadow-[0_0_14px_rgba(255,191,0,0.45)] disabled:opacity-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v12m6-6H6" />
            </svg>
            Add Demo Team
          </button>
        </div>

        {/* Rebuild Bracket (Top 8) */}
        <div className="bg-white/5 border border-indigo-400/20 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(99,102,241,0.35)]">
          <h3 className="text-sm font-bold text-indigo-300 tracking-wider uppercase mb-3">
            Reconstruct Tournament 
          </h3>
          <button
            disabled={loading}
            onClick={() => execAction(rebuildBracket, "Rebuild Bracket (Top 8)")}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600/80 hover:bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] shadow-[0_0_14px_rgba(99,102,241,0.55)] disabled:opacity-50 transition"
          >
            {/* magic-wand icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.636 14.121l8.485-8.485 3.536 3.535-8.485 8.486-3.536-3.536zM3.515 16.243l4.243 4.242-1.414 1.415-4.243-4.243 1.414-1.414zM16.95 2.808l1.414 1.414-1.414 1.414L15.536 4.222 16.95 2.808zm3.535 3.536l1.414 1.414-1.414 1.414-1.414-1.414 1.414-1.414zM19.778 0l1.414 1.414-1.414 1.414L18.364 1.414 19.778 0z" />
            </svg>
            Rebuild Bracket
          </button>
        </div>


        </div>
        

        <div className="space-y-6">

          {/* module */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(0,145,255,0.25)]">
            <h3 className="text-sm font-bold text-blue-300 tracking-wider uppercase mb-3">Tournament Boot</h3>
            <button
              disabled={loading}
              onClick={() => execAction(startTournament, "Tournament start")}
              className="w-full flex justify-center items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] shadow-[0_0_14px_rgba(20,130,255,0.45)] disabled:opacity-50 transition">
              <Play className="w-5 h-5" /> Start Tournament
            </button>
          </div>

          <div className="bg-white/5 border border-red-400/20 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(255,60,60,0.35)]">
            <h3 className="text-sm font-bold text-red-400 tracking-wider uppercase mb-3">System Purge</h3>
            <button
              disabled={loading}
              onClick={() => execAction(resetTournament, "Tournament reset")}
              className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] shadow-[0_0_14px_rgba(255,0,0,0.45)] disabled:opacity-50 transition">
              <RefreshCcw className="w-5 h-5" /> Reset Tournament
            </button>
          </div>

          <div className="bg-white/5 border border-yellow-400/20 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(255,210,0,0.35)]">
            <h3 className="text-sm font-bold text-yellow-300 tracking-wider uppercase mb-3">Simulation Engine</h3>
            <button
              disabled={loading}
              onClick={() => execAction(autoSimulateTournament, "Auto simulation")}
              className="w-full flex justify-center items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] disabled:opacity-50 transition shadow-[0_0_14px_rgba(255,200,0,0.55)]">
              <Rocket className="w-5 h-5" /> Auto Sim Tournament
            </button>
          </div>
          </div>

          <div className="flex-1 space-y-5">
          {/* Federation Intake - Register New Team */}
        <div className="bg-white/5 border border-blue-400/20 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(0,145,255,0.25)]">
          <h3 className="text-sm font-bold text-blue-300 tracking-wider uppercase mb-3">
            Team Registration
          </h3>

          <button
            onClick={() => navigate("/register")}
            className="w-full flex justify-center items-center gap-2 bg-blue-500/80 hover:bg-blue-500 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] shadow-[0_0_14px_rgba(20,130,255,0.45)] transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-3-3h-4m-6 5H2v-2a3 3 0 013-3h4m6-5a3 3 0 11-6 0 3 3 0 016 0zm-6 0v1m0-1a3 3 0 116 0v1" />
            </svg>
            Register New Team
          </button>
        </div>

        <div className=" bg-white/5 border border-blue-400/20 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(0,145,255,0.25)]">
          <h3 className="text-sm font-bold text-purple-600 tracking-wider uppercase mb-3">
            Replace Team
          </h3>

          <button
            onClick={() => navigate("/replace-team")}
            className="w-full flex justify-center items-center gap-2 bg-purple-600/80 hover:bg-purple-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] shadow-[0_0_14px_rgba(165,0,255,0.45)] transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7M16 13h5v-2a3 3 0 00-3-3h-4m-6 5H2v-2a3 3 0 013-3h4" />
            </svg>
            Replace an Existing Team
          </button>
        </div>

        {/*Remove All Teams */}
        <div className="bg-white/5 border border-red-400/20 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_22px_rgba(255,0,0,0.25)]">
          <h3 className="text-sm font-bold text-red-300 tracking-wider uppercase mb-3">
            Danger Zone
          </h3>

          <button
            onClick={() => execAction(async (t) => {
              await resetTournament(t);
              await removeAllTeams(t);
            }, "Full System Wipe")}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-red-700/80 hover:bg-red-700 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-[0.95rem] shadow-[0_0_14px_rgba(255,0,0,0.45)] transition disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 12H4" />
            </svg>
            Remove All Teams
          </button>
        </div>
        </div>
        </div>
        {/* status readout */}
        {status && (
          <p className="text-center text-sm text-blue-300 drop-shadow-[0_0_6px_rgba(20,130,255,0.45)]">
            {status}
          </p>
        )}

        <p className="text-center text-sm text-blue-300/50">
          <button
            onClick={() => { localStorage.removeItem("adminToken"); navigate("/account/login") }}
            className="hover:text-blue-200 font-semibold"
          >
            Logout / Switch Access
          </button>
        </p>


      </div>
    </div>
  );
}
