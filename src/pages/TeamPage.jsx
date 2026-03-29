import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";

export default function TeamPage() {
  const navigate = useNavigate();
  const { leagueId: routeLeagueId, memberId: routeMemberId } = useParams();

  const [member, setMember] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  let joinedLeagueId = null;
  let auctionUserLeagueId = null;
  let auctionUserMemberId = null;

  try {
    const savedLeague = JSON.parse(localStorage.getItem("joined_league"));
    joinedLeagueId = savedLeague?.league_id || savedLeague?.leagueId || null;
  } catch (err) {
    console.error("Failed to parse joined_league from localStorage:", err);
  }

  try {
    const savedUser = JSON.parse(localStorage.getItem("auction_user"));
    auctionUserLeagueId = savedUser?.leagueId || null;
    auctionUserMemberId = savedUser?.memberId || null;
  } catch (err) {
    console.error("Failed to parse auction_user from localStorage:", err);
  }

  const leagueId = routeLeagueId || joinedLeagueId || auctionUserLeagueId;
  const memberId = routeMemberId || auctionUserMemberId;

  const isOwnTeam =
    auctionUserMemberId && memberId && auctionUserMemberId === memberId;

  useEffect(() => {
    fetchTeamData();
  }, [leagueId, memberId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!leagueId) {
        throw new Error("League not found. Please join the league again.");
      }

      if (!memberId) {
        throw new Error("Member not found.");
      }

      const { data: memberData, error: memberError } = await supabase
        .from("league_members")
        .select("*")
        .eq("id", memberId)
        .single();

      if (memberError) throw memberError;

      const { data: teamData, error: teamError } = await supabase
        .from("team_players")
        .select(`
          id,
          player_id,
          purchase_price,
          players (
            player_name,
            ipl_team,
            role_type
          )
        `)
        .eq("league_id", leagueId)
        .eq("member_id", memberId);

      if (teamError) throw teamError;

      const teamRows = teamData || [];
      const playerIds = teamRows.map((item) => item.player_id);

      let statsMap = {};

      if (playerIds.length > 0) {
        const { data: statsData, error: statsError } = await supabase
          .from("player_match_stats")
          .select("*")
          .in("player_id", playerIds);

        if (statsError) throw statsError;

        for (const stat of statsData || []) {
          const playerId = stat.player_id;
          const points = Number(stat.fantasy_points || 0);

          if (!statsMap[playerId]) {
            statsMap[playerId] = 0;
          }

          statsMap[playerId] += points;
        }
      }

      const finalTeamPlayers = teamRows.map((item) => ({
        ...item,
        fantasy_points: statsMap[item.player_id] || 0,
      }));

      setMember(memberData);
      setTeamPlayers(finalTeamPlayers);
    } catch (error) {
      console.error("Team page error:", error);
      setMessage(error.message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = teamPlayers.reduce(
    (sum, item) => sum + Number(item.purchase_price || 0),
    0
  );

  const totalFantasyPoints = teamPlayers.reduce(
    (sum, item) => sum + Number(item.fantasy_points || 0),
    0
  );

  const remainingBudget =
    member?.budget_remaining ?? Math.max(0, 100 - totalSpent);

  function handleBack() {
    if (leagueId && !isOwnTeam) {
      navigate(`/league/${leagueId}/leaderboard`);
      return;
    }

    if (leagueId) {
      navigate(`/league/${leagueId}`);
      return;
    }

    navigate("/join");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-4 md:p-6">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-6 md:p-8">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700 font-medium">
            Loading team...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-4 md:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 md:p-8 shadow-md">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {isOwnTeam
                ? "My Fantasy Team"
                : `${member?.user_name || "Member"}'s Fantasy Team`}
            </h1>

            <p className="mt-2 text-gray-600">
              {isOwnTeam
                ? "See your selected players and fantasy points."
                : "See this member’s selected players and fantasy points."}
            </p>
          </div>

          <button
            onClick={handleBack}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Back
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 font-medium">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Remaining Budget</p>
            <p className="text-2xl font-bold text-gray-900">
              {remainingBudget}
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="text-2xl font-bold text-gray-900">{totalSpent}</p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Total Fantasy Points</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalFantasyPoints}
            </p>
          </div>
        </div>

        {teamPlayers.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-600">
            No players bought yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border-b px-4 py-3 text-left font-semibold text-gray-700">
                    Player
                  </th>
                  <th className="border-b px-4 py-3 text-left font-semibold text-gray-700">
                    IPL Team
                  </th>
                  <th className="border-b px-4 py-3 text-left font-semibold text-gray-700">
                    Role
                  </th>
                  <th className="border-b px-4 py-3 text-left font-semibold text-gray-700">
                    Price
                  </th>
                  <th className="border-b px-4 py-3 text-left font-semibold text-gray-700">
                    Fantasy Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamPlayers.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="border-b px-4 py-3 font-medium text-gray-900">
                      {item.players?.player_name}
                    </td>
                    <td className="border-b px-4 py-3 text-gray-700">
                      {item.players?.ipl_team}
                    </td>
                    <td className="border-b px-4 py-3 text-gray-700">
                      {item.players?.role_type}
                    </td>
                    <td className="border-b px-4 py-3 text-gray-700">
                      {item.purchase_price}
                    </td>
                    <td className="border-b px-4 py-3">
                      <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700">
                        {item.fantasy_points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}