// src/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../api";

export default function AdminLogin() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus(null);

    try {
      const res = await adminLogin(username, password);
      localStorage.setItem("adminToken", res.token);
      nav("/account");
    } catch (err) {
      setStatus("Access Denied");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050814] relative">
      
      {/* subtle moving grid */}
      <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_center,_#1e3a8a_0%,transparent_60%)]"></div>

      <form
        onSubmit={submit}
        className="
          relative z-10 
          w-full max-w-sm 
          bg-white/10 backdrop-blur-xl 
          border border-blue-400/20 
          shadow-[0_0_22px_rgba(0,145,255,0.45)]
          rounded-2xl p-8 text-blue-100 space-y-6
        "
      >
        <h2 className="text-2xl font-black uppercase tracking-widest text-center text-blue-300 drop-shadow-[0_0_12px_rgba(20,130,255,0.55)]">
          Admin Access
        </h2>
        <p className="text-center text-blue-200/60 text-xs tracking-wide uppercase">federation restricted</p>

        <div>
          <label className="block text-blue-200/70 font-semibold mb-1 text-sm">
            Username
          </label>
          <input
            className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:ring-2 focus:ring-blue-500 outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-blue-200/70 font-semibold mb-1 text-sm">
            Password
          </label>
          <input
            type="password"
            className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:ring-2 focus:ring-blue-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="
            w-full
            bg-blue-600 hover:bg-blue-700
            transition-all duration-300
            text-white font-bold py-3 rounded-xl tracking-wide uppercase
            shadow-[0_0_14px_rgba(20,130,255,0.65)]
          "
        >
          {loading ? "Authorizing..." : "Login"}
        </button>

        {status && (
          <p className="text-center text-red-400 text-sm font-semibold mt-2">{status}</p>
        )}
      </form>
    </div>
  );
}
