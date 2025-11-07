import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMatch } from "../api";

export default function MatchDetails() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMatch(id)
      .then(setMatch)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading match details...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!match) return <p className="text-gray-500">Match not found.</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{match.round}</h2>

      <div className="bg-white shadow rounded p-4 mb-6">
        <p className="text-xl font-semibold">
          {match.homeTeamName} vs {match.awayTeamName}
        </p>

        {match.status === "simulated" ? (
          <p className="text-lg mt-2 text-green-700 font-bold">
            {match.score.home} - {match.score.away} (Winner: {match.winnerName})
          </p>
        ) : (
          <p className="text-gray-500 mt-2">Match not yet played</p>
        )}
      </div>

      {/* Goal Scorers */}
      {match.scorers && match.scorers.length > 0 && (
        <div className="bg-white shadow rounded p-4 mb-6">
          <h3 className="font-semibold text-lg mb-2">Goal Scorers</h3>
          <ul className="list-disc list-inside space-y-1">
            {match.scorers.map((s, idx) => (
              <li key={idx}>
                {s.minute}' – {s.playerName} ({s.teamName})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Commentary Feed */}
      {match.commentary && match.commentary.length > 0 && (
        <div className="bg-white shadow rounded p-4">
          <h3 className="font-semibold text-lg mb-2">Commentary</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {match.commentary.map((line, idx) => (
              <li key={idx} className="border-b pb-1">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
