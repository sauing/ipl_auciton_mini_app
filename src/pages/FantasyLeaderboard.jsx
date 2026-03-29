import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFantasyLeaderboard } from "../services/fantasyLeaderboardService";

export default function FantasyLeaderboard() {
  const navigate = useNavigate();
  const { leagueId: routeLeagueId } = useParams();

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  let savedLeagueId = null;

  try {
    const savedLeague = JSON.parse(localStorage.getItem("joined_league"));
    savedLeagueId = savedLeague?.league_id || null;
  } catch (err) {
    console.error("Failed to parse joined_league from localStorage:", err);
  }

  const leagueId =
    routeLeagueId ||
    savedLeagueId ||
    "70e1dd65-9bed-42be-854f-f66bf0bb14a6";

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

    if (leagueId) {
      loadLeaderboard();
    }
  }, [leagueId]);

  function handleViewTeam(memberId) {
    navigate(`/league/${leagueId}/team/${memberId}`);
  }

  function handleBack() {
    navigate("/join");
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Fantasy Leaderboard</h1>

          <button
            onClick={handleBack}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Back
          </button>
        </div>

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
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr key={row.member_id}>
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{row.member_name}</td>
                  <td className="border p-2 font-semibold">{row.total_points}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleViewTeam(row.member_id)}
                      className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                    >
                      View Team
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}