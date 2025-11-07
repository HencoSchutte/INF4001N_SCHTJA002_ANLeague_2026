import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTeams, replaceTeam, autofillTeam } from "../api";

export default function ReplaceTeam() {
  const navigate = useNavigate();
  const [adminToken, setAdminToken] = useState(null);
  const [teams, setTeams] = useState([]);
  const [removeId, setRemoveId] = useState("");
  const [form, setForm] = useState({ country:"", teamName:"", managerName:"", representativeEmail:"" });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("adminToken");
    if (!t) return navigate("/account/login");
    setAdminToken(t);
    load();
  },[]);

  async function load() {
    const t = await getTeams();
    setTeams(t);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("Processing...");

    try {
      const r = await replaceTeam(removeId, form, adminToken);
      await autofillTeam(r.new_team_id); // optional autofill auto
      setStatus("✅ Team replaced + autofilled successfully!");
    } catch (err) {
      setStatus("❌ " + err.message);
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Replace Team</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        <select className="border p-2 w-full"
          value={removeId}
          onChange={e => setRemoveId(e.target.value)}
        >
          <option value="">-- select team to remove --</option>
          {teams.map(t => <option key={t._id} value={t._id}>{t.country}</option>)}
        </select>

        <input className="border p-2 w-full" placeholder="Country"
          value={form.country} onChange={e=>setForm({...form, country:e.target.value})}/>
        <input className="border p-2 w-full" placeholder="Team name"
          value={form.teamName} onChange={e=>setForm({...form, teamName:e.target.value})}/>
        <input className="border p-2 w-full" placeholder="Manager"
          value={form.managerName} onChange={e=>setForm({...form, managerName:e.target.value})}/>
        <input className="border p-2 w-full" placeholder="email"
          value={form.representativeEmail} onChange={e=>setForm({...form, representativeEmail:e.target.value})}/>

        <button className="bg-blue-600 text-white w-full py-2 rounded font-bold">
          Replace Team
        </button>
      </form>

      {status && <p className="mt-4">{status}</p>}
    </div>
  );
}
