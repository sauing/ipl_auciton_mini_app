import { useEffect, useState } from "react";
import { getFantasyLeaderboard } from "../services/fantasyLeaderboardService";

export default function FantasyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const leagueId = "70e1dd65-9bed-42be-854f-f66bf0bb14a6";

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true);
        setError("");
        const data = await getFantasyLeaderboard(leagueId);
        setLeaderboard(data);
      } catch (err) {
        console.error("Leaderboard error:", err);
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [leagueId]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">Fantasy Leaderboard</h1>

        {loading && <p>Loading...</p>}

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && leaderboard.length === 0 && (
          <p>No leaderboard data available.</p>
        )}

        {!loading && !error && leaderboard.length > 0 && (
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Rank</th>
                <th className="border p-2">Member Name</th>
                <th className="border p-2">Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr key={row.member_id}>
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{row.member_name}</td>
                  <td className="border p-2 font-semibold">{row.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}