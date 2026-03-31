import { supabase } from "../supabase";

export async function getFantasyLeaderboard(leagueId) {
  if (!leagueId) {
    throw new Error("leagueId is required");
  }

  // Adi's member id
  const ADI_MEMBER_ID = "c4fefe45-b975-45e8-bec9-4a6b6872ed6f";

  // One-time deduction:
  // Adi gets Devdutt now, but should not receive Devdutt's old 122 points.
  const DEVDUTT_EXISTING_POINTS_DEDUCTION = 122;

  // 1. fetch all owned players for this league
  const { data: teamPlayers, error: teamPlayersError } = await supabase
    .from("team_players")
    .select("member_id, player_id")
    .eq("league_id", leagueId);

  if (teamPlayersError) {
    throw new Error(`Failed to fetch team players: ${teamPlayersError.message}`);
  }

  // 2. fetch fantasy points for matched players
  const { data: playerStats, error: playerStatsError } = await supabase
    .from("player_match_stats")
    .select("player_id, fantasy_points")
    .not("player_id", "is", null);

  if (playerStatsError) {
    throw new Error(`Failed to fetch player stats: ${playerStatsError.message}`);
  }

  // 3. fetch member names from league_members
  const { data: leagueMembers, error: leagueMembersError } = await supabase
    .from("league_members")
    .select("id, user_name")
    .eq("league_id", leagueId);

  if (leagueMembersError) {
    throw new Error(`Failed to fetch league members: ${leagueMembersError.message}`);
  }

  // 4. total fantasy points per player
  const playerPointsMap = {};

  for (const row of playerStats || []) {
    const playerId = row.player_id;
    if (!playerId) continue;

    if (!playerPointsMap[playerId]) {
      playerPointsMap[playerId] = 0;
    }

    playerPointsMap[playerId] += Number(row.fantasy_points) || 0;
  }

  // 5. total fantasy points per member
  const memberPointsMap = {};

  for (const row of teamPlayers || []) {
    const memberId = row.member_id;
    const playerId = row.player_id;

    if (!memberId || !playerId) continue;

    const playerTotalPoints = playerPointsMap[playerId] || 0;

    if (!memberPointsMap[memberId]) {
      memberPointsMap[memberId] = 0;
    }

    memberPointsMap[memberId] += playerTotalPoints;
  }

  // 6. Apply one-time fairness deduction for Adi
  // This removes Devdutt's already-earned 122 points from Adi's total,
  // while still allowing all future Devdutt points to count normally.
  if (memberPointsMap[ADI_MEMBER_ID] !== undefined) {
    memberPointsMap[ADI_MEMBER_ID] -= DEVDUTT_EXISTING_POINTS_DEDUCTION;
  }

  // 7. member id -> user name map
  const memberNameMap = {};

  for (const member of leagueMembers || []) {
    memberNameMap[member.id] = member.user_name;
  }

  // 8. final leaderboard
  return Object.entries(memberPointsMap)
    .map(([member_id, total_points]) => ({
      member_id,
      member_name: memberNameMap[member_id] || "Unknown Member",
      total_points,
    }))
    .sort((a, b) => b.total_points - a.total_points);
}