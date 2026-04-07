import { supabase } from "../supabase";

const LEADERBOARD_ADJUSTMENTS = {
  "70e1dd65-9bed-42be-854f-f66bf0bb14a6": {
    "c4fefe45-b975-45e8-bec9-4a6b6872ed6f": -122,
  },
};

function getLeagueAdjustments(leagueId) {
  return LEADERBOARD_ADJUSTMENTS[leagueId] || {};
}

export async function getFantasyLeaderboard(leagueId) {
  if (!leagueId) {
    throw new Error("leagueId is required");
  }

  // 1. fetch members first so even members with 0 points still appear
  const { data: leagueMembers, error: leagueMembersError } = await supabase
    .from("league_members")
    .select("id, user_name")
    .eq("league_id", leagueId);

  if (leagueMembersError) {
    throw new Error(`Failed to fetch league members: ${leagueMembersError.message}`);
  }

  // 2. fetch all owned players for this league
  const { data: teamPlayers, error: teamPlayersError } = await supabase
    .from("team_players")
    .select("member_id, player_id")
    .eq("league_id", leagueId);

  if (teamPlayersError) {
    throw new Error(`Failed to fetch team players: ${teamPlayersError.message}`);
  }

  const playerIds = [...new Set((teamPlayers || []).map((row) => row.player_id).filter(Boolean))];

  // 3. fetch fantasy points only for players owned in this league
  let playerStats = [];

  if (playerIds.length > 0) {
    const { data, error: playerStatsError } = await supabase
      .from("player_match_stats")
      .select("player_id, fantasy_points")
      .in("player_id", playerIds)
      .not("player_id", "is", null);

    if (playerStatsError) {
      throw new Error(`Failed to fetch player stats: ${playerStatsError.message}`);
    }

    playerStats = data || [];
  }

  // 4. member id -> user name map
  const memberNameMap = {};
  for (const member of leagueMembers || []) {
    memberNameMap[member.id] = member.user_name;
  }

  // 5. total fantasy points per player
  const playerPointsMap = {};
  for (const row of playerStats) {
    const playerId = row.player_id;
    if (!playerId) continue;

    if (!playerPointsMap[playerId]) {
      playerPointsMap[playerId] = 0;
    }

    playerPointsMap[playerId] += Number(row.fantasy_points || 0);
  }

  // 6. start all league members at 0 points
  const memberPointsMap = {};
  for (const member of leagueMembers || []) {
    memberPointsMap[member.id] = 0;
  }

  // 7. add player totals to each member
  for (const row of teamPlayers || []) {
    const memberId = row.member_id;
    const playerId = row.player_id;

    if (!memberId || !playerId) continue;

    const playerTotalPoints = playerPointsMap[playerId] || 0;
    memberPointsMap[memberId] += playerTotalPoints;
  }

  // 8. apply per-league manual adjustments
  const leagueAdjustments = getLeagueAdjustments(leagueId);
  for (const [memberId, adjustment] of Object.entries(leagueAdjustments)) {
    if (memberPointsMap[memberId] === undefined) {
      memberPointsMap[memberId] = 0;
    }
    memberPointsMap[memberId] += adjustment;
  }

  // 9. final leaderboard
  return Object.entries(memberPointsMap)
    .map(([member_id, total_points]) => ({
      member_id,
      member_name: memberNameMap[member_id] || "Unknown Member",
      total_points,
    }))
    .sort((a, b) => b.total_points - a.total_points);
}