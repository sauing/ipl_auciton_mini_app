import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFantasyLeaderboard } from "../services/fantasyLeaderboardService";

function getStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (err) {
    console.error(`Failed to parse ${key} from localStorage:`, err);
    return null;
  }
}

export default function FantasyLeaderboard() {
  const navigate = useNavigate();
  const { leagueId: routeLeagueId } = useParams();

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const leagueId = useMemo(() => {
    const savedLeague = getStoredJson("joined_league");
    const savedUser = getStoredJson("auction_user");

    const joinedLeagueId =
      savedLeague?.id ||
      savedLeague?.league_id ||
      savedLeague?.leagueId ||
      null;

    const auctionUserLeagueId = savedUser?.leagueId || null;

    return routeLeagueId || joinedLeagueId || auctionUserLeagueId;
  }, [routeLeagueId]);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        if (!leagueId) {
          throw new Error("League not found. Please join the league again.");
        }

        setLoading(true);
        setError("");

        const data = await getFantasyLeaderboard(leagueId);
        setLeaderboard(data || []);
      } catch (err) {
        console.error("Leaderboard error:", err);
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [leagueId]);

  function handleViewTeam(memberId) {
    navigate(`/league/${leagueId}/team/${memberId}`, {
      state: { from: "fantasy-leaderboard" },
    });
  }

  function handleBack() {
    navigate("/join");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Fantasy Leaderboard
              </h1>
              <p className="text-gray-600 mt-2">
                See rankings and view every member’s fantasy team.
              </p>
            </div>

            <button
              onClick={handleBack}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Back
            </button>
          </div>

          {loading && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700 font-medium">
              Loading leaderboard...
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 font-medium">
              {error}
            </div>
          )}

          {!loading && !error && leaderboard.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-600">
              No leaderboard data available.
            </div>
          )}

          {!loading && !error && leaderboard.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {leaderboard.length}
                  </p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Top Member</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {leaderboard[0]?.member_name || "-"}
                  </p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Highest Points</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {leaderboard[0]?.total_points ?? 0}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border-b p-3 text-left font-semibold text-gray-700">
                        Rank
                      </th>
                      <th className="border-b p-3 text-left font-semibold text-gray-700">
                        Member Name
                      </th>
                      <th className="border-b p-3 text-left font-semibold text-gray-700">
                        Points
                      </th>
                      <th className="border-b p-3 text-left font-semibold text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {leaderboard.map((row, index) => (
                      <tr
                        key={row.member_id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="border-b p-3">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              index === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : index === 1
                                ? "bg-gray-200 text-gray-700"
                                : index === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>

                        <td className="border-b p-3 font-medium text-gray-900">
                          {row.member_name}
                        </td>

                        <td className="border-b p-3">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 font-semibold">
                            {row.total_points}
                          </span>
                        </td>

                        <td className="border-b p-3">
                          <button
                            onClick={() => handleViewTeam(row.member_id)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                          >
                            View Team
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}