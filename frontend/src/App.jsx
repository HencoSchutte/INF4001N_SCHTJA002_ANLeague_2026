import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Bracket from "./pages/Bracket";
import TopScorers from "./pages/TopScorers";
import MatchDetails from "./pages/MatchDetails";
import RegisterTeam from "./pages/RegisterTeam";
import Loader from "./components/Loader";
import AccountCenter from "./pages/AccountCenter";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ReplaceTeam from "./pages/ReplaceTeam";
import Teams from "./pages/Teams";
import TeamDetails from "./pages/TeamDetails";
import TeamSquad from "./pages/TeamSquad";


function App() {

  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);


  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true); 
      setTimeout(() => setLoading(false), 800);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const navLinks = [
    { label: "Home", to: "/" },
    { label: "Bracket", to: "/bracket" },
    { label: "Teams", to: "/teams" },
    { label: "Top Scorers", to: "/topscorers" },
    { label: "Account", to: "/account" },
  ];

  return (
    <>
      {loading && <Loader fadeOut={fadeOut} />}
      {!loading && (
        <div className="min-h-screen flex flex-col">

          {/* NAVBAR */}
          <nav className="bg-[#030712]/80 backdrop-blur-xl border-b border-blue-400/20 shadow-[0_0_18px_rgba(0,145,255,0.25)] px-4 py-3 flex justify-between items-center select-none">

            {/* Logo + Title */}
            <Link to="/" className="flex items-center space-x-3 group cursor-pointer">
              <img
                src="/logo.png"
                alt="League Logo"
                className="w-10 h-10 transform transition duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(0,145,255,0.6)]"
              />
              <h1 className="font-black uppercase tracking-widest text-blue-300 drop-shadow-[0_0_6px_rgba(0,145,255,0.65)] group-hover:text-blue-200 transition text-sm sm:text-base md:text-lg">
                African Nations League
              </h1>
            </Link>

            {/* Hamburger for mobile */}
            <button 
              className="md:hidden text-blue-300 font-bold text-2xl"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              ☰
            </button>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex space-x-6 text-sm font-semibold uppercase tracking-wider">
              {navLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="relative text-blue-200 hover:text-blue-300 transition"
                >
                  {item.label}
                  {location.pathname === item.to && (
                    <span className="absolute left-0 right-0 -bottom-1 h-[3px] bg-blue-400 rounded-full shadow-[0_0_10px_rgba(0,145,255,0.7)]"></span>
                  )}
                </Link>
              ))}
            </div>
          </nav>
          {/* Mobile dropdown */}
          {mobileOpen && (
            <div className="md:hidden absolute left-0 right-0 top-[64px] bg-[#050a18]/95 border-b border-blue-400/20 py-3 px-5 shadow-xl z-50">
              {navLinks.map((item, idx) => (
                <div key={item.to}>
                  <Link
                    to={item.to}
                    className="block text-blue-200 text-sm font-semibold uppercase tracking-wider py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {idx < navLinks.length - 1 && (
                    <div className="h-[1px] w-full bg-blue-300/20 my-1"></div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ROUTES */}
          <main className="flex-grow p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/bracket" element={<Bracket />} />
              <Route path="/topscorers" element={<TopScorers />} />
              <Route path="/matches/:id" element={<MatchDetails />} />
              <Route path="/register" element={<RegisterTeam />} />
              <Route path="/account" element={<AccountCenter />} />
              <Route path="/account/login" element={<Login />} />
              <Route path="/account/register" element={<Register />} />
              <Route path="/replace-team" element={<ReplaceTeam />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<TeamDetails />} />
              <Route path="/team/:id/squad" element={<TeamSquad />} />

            </Routes>
          </main>

          {/* FOOTER */}
          <footer className="bg-gray-800 text-white text-center py-3">
            <p>© 2025 African Nations League</p>
          </footer>

        </div>
      )}
    </>
  );
}

export default App;
