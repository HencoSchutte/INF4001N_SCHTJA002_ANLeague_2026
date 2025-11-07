import { useState, useEffect } from "react";
import { createTeam, autofillTeam } from "../api";
import { countryToCode } from "../countryCodes";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterTeam() {
  const [form, setForm] = useState({
    country: "",
    teamName: "",
    managerName: "",
    representativeEmail: "",
  });
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({email: "",teamName: "",});
  const [showConfirm, setShowConfirm] = useState(false);


  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/meta/countries/available`)
      .then((res) => res.json())
      .then((data) => {
        setCountries(data.available);
        setFilteredCountries(data.available);
      })
      .catch((err) => console.error("Error fetching countries:", err));
  }, []);

  // Handle search filtering
  useEffect(() => {
    if (!search) {
      setFilteredCountries(countries);
    } else {
      setFilteredCountries(
        countries.filter((c) =>
          c.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, countries]);

//live email validation
  useEffect(() => {
  if (!form.representativeEmail) {
    setErrors((e) => ({ ...e, email: "" }));
    return;
  }
  const valid = /\S+@\S+\.\S+/.test(form.representativeEmail);
  setErrors((e) => ({
    ...e,
    email: valid ? "" : "Invalid email format",
  }));
}, [form.representativeEmail]);

//live team name validation
useEffect(() => {
  if (!form.teamName) {
    setErrors((e) => ({ ...e, teamName: "" }));
    return;
  }


  const controller = new AbortController();
  const timeout = setTimeout(() => {
    fetch(`${import.meta.env.VITE_API_URL}/teams/search?query=${form.teamName}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const taken = data.some(
          (t) =>
            t.teamName.toLowerCase() === form.teamName.toLowerCase()
        );
        setErrors((e) => ({
          ...e,
          teamName: taken ? "Team name already taken" : "",
        }));
      })
      .catch(() => {});
  }, 400); // debounce

  return () => {
    clearTimeout(timeout);
    controller.abort();
  };
}, [form.teamName]);

  // Auto-hide success/error toast
useEffect(() => {
  if (status) {
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }
}, [status]);

  async function handleSubmit(e) {
    e.preventDefault();
    setShowConfirm(true);
  }

  async function handleAutofill() {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await autofillTeam(teamId);
      setStatus(
        `Squad autofilled (${res.squadCount} players). Team rating: ${res.teamRating.toFixed(
          1
        )}`
      );
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function confirmSubmit() {
  setLoading(true);
  setStatus(null);
  try {
    const res = await createTeam(form);
    setTeamId(res.teamId);
    setStatus("✅ " + res.message);
    setShowConfirm(false); // close modal
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
}


  
  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f24] via-[#0b1a3a] to-[#081124] text-blue-100 py-20 px-6 relative">
      <div className="
        bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl 
        p-10 max-w-lg w-full shadow-[0_0_28px_rgba(20,125,255,0.35)]
        ring-1 ring-white/10
      ">
        <h2 className="text-3xl font-black mb-8 text-center uppercase tracking-wide text-blue-200 drop-shadow-[0_0_14px_rgba(20,130,255,0.55)] italic">
          Register a Team
        </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Country Dropdown */}
        
        <div>
          <label className="block font-medium">Country</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3
              bg-white/10 backdrop-blur-xl border border-white/15 text-blue-100
              hover:ring-blue-400/30 transition"
            >
              {form.country ? (
                <span className="flex items-center space-x-2">
                  <img
                    src={`https://flagcdn.com/w20/${countryToCode[form.country]}.png`}
                    alt={form.country}
                    className="w-5 h-4 border"
                  />
                  <span>{form.country}</span>
                </span>
              ) : (
                <span className="text-gray-400">Select a country</span>
              )}
              <span className="ml-2">▼</span>
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="
                    absolute z-50 mt-1 w-full 
                    bg-[#0e142f]/90 backdrop-blur-xl
                    border border-white/10 rounded-xl
                    shadow-[0_0_22px_rgba(20,125,255,0.25)]
                    max-h-64 overflow-y-auto text-blue-100
                    "
                >
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="
                    w-full px-3 py-2
                    bg-white/10 backdrop-blur-md text-blue-100
                    border-b border-white/10
                    placeholder-blue-200/50
                    focus:border-blue-400/40 focus:shadow-[0_0_12px_rgba(20,125,255,0.35)]
                    transition-all duration-200
                    outline-none
                  "
                  />
                  <ul>
                    {filteredCountries.map((c) => (
                      <li
                        key={c}
                        onClick={() => {
                          setForm({ ...form, country: c });
                          setOpen(false);
                        }}
                        className="
                          px-3 py-2 flex items-center space-x-2 cursor-pointer
                          hover:bg-blue-400/20 hover:shadow-[0_0_12px_rgba(20,125,255,0.35)]
                          transition-all duration-200
                          "
                      >
                        <img
                          src={`https://flagcdn.com/w20/${countryToCode[c]}.png`}
                          alt={c}
                          className="w-5 h-4 border"
                        />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            
          </div>
        </div>

        {/* Team Name */}
        <div>
          <label className="block font-medium">Team Name</label>
          <input
            type="text"
            name="teamName"
            value={form.teamName}
            onChange={(e) => setForm({ ...form, teamName: e.target.value }) }
            required
            className={`w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-xl 
            border border-white/15 text-blue-100 placeholder-blue-200/40
            focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/30 outline-none transition
            ${errors.teamName ? "border-red-500 shadow-[0_0_10px_rgba(255,0,0,0.45)]" : ""}`}
        />
        {errors.teamName && (
          <p className="text-red-600 text-sm mt-1">{errors.teamName}</p>
        )}
        </div>

        {/* Manager Name */}
        <div>
          <label className="block font-medium">Manager Name</label>
          <input
            type="text"
            name="managerName"
            value={form.managerName}
            onChange={(e) =>
              setForm({ ...form, managerName: e.target.value })
            }
            required
            className={`w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-xl 
            border border-white/15 text-blue-100 placeholder-blue-200/40
            focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/30 outline-none transition
            ${errors.teamName ? "border-red-500 shadow-[0_0_10px_rgba(255,0,0,0.45)]" : ""}`}
          />
        </div>

        {/* Representative Email */}
        <div>
          <label className="block font-medium">Representative Email</label>
          <input
            type="email"
            name="representativeEmail"
            value={form.representativeEmail}
            onChange={(e) => setForm({ ...form, representativeEmail: e.target.value })}
            required
            className={`
              w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-xl text-blue-100
              placeholder:text-blue-200/40
              ring-1 ring-white/15 border border-white/10
              shadow-[0_0_12px_rgba(0,145,255,0.20)]
              focus:ring-blue-400/50 focus:border-blue-300 focus:shadow-[0_0_16px_rgba(0,145,255,0.45)]
              transition-all duration-300
              ${errors.email ? "border-red-500 ring-red-400/50 shadow-[0_0_12px_rgba(255,0,0,0.35)]" : ""}
            `}
          />

        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email}</p>
        )}
        </div>

        {/* Register button */}
        <button
          type="submit"
          disabled={loading || errors.email || errors.teamName}
          className="
            flex items-center justify-center w-full
            bg-blue-600/70 text-blue-50
            px-4 py-3 rounded-xl font-semibold
            shadow-[0_0_12px_rgba(0,145,255,0.35)]
            ring-1 ring-white/10
            backdrop-blur-xl
            hover:bg-blue-500/70 hover:shadow-[0_0_18px_rgba(20,125,255,0.45)]
            transition-all duration-300
            disabled:opacity-50
          "
        >
          {loading && <span className="animate-spin mr-2"></span>}
          Register Team
        </button>

      </form>

      {/* Team Preview Card */}
      {form.country && (
        <div className="mt-6 p-4 bg-white/10 backdrop-blur-xl border border-white/15 rounded-xl flex items-center space-x-4 shadow-[0_0_18px_rgba(20,125,255,0.25)]">
          <img
            src={`https://flagcdn.com/w40/${countryToCode[form.country]}.png`}
            alt={form.country}
            className="w-12 h-8 border"
          />
          <div>
            <p className="text-lg font-bold">
              {form.teamName || "Team Name"}
            </p>
            <p className="text-sm text-gray-600">{form.country}</p>
            <p className="text-xs text-gray-500">
              Manager: {form.managerName || "—"}
            </p>
          </div>
        </div>
      )}

      {/* Autofill button */}
      {teamId && (
        <div className="mt-6">
          <button
            onClick={handleAutofill}
            disabled={loading}
            className="flex items-center justify-center w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading && <span className="animate-spin mr-2">🔄</span>}
            Autofill Squad
          </button>
        </div>
      )}

      {/* Status Toast */}
      <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-6 right-6 p-4 rounded shadow-lg text-sm ${
            status.startsWith("✅")
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {status}
        </motion.div>
      )}
    </AnimatePresence>

            {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Registration</h3>
            <p className="mb-6">
              Register <strong>{form.teamName || "Team"}</strong> ({form.country || "Country"}) 
              with manager <strong>{form.managerName || "—"}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={loading}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Registering..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
</div>
    </div>
  );
}
