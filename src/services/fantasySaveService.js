import { supabase } from "../supabase";
import { normalizePlayerName } from "../utils/normalizePlayerName";

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildMatchKey(matchSummary) {
  const date = matchSummary?.date || "unknown-date";
  const team1 = matchSummary?.teams?.[0] || "team1";
  const team2 = matchSummary?.teams?.[1] || "team2";

  return `${date}_${team1}_${team2}`
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export async function saveFantasyMatch({ matchSummary, playersWithPoints, rawJson }) {
  if (!matchSummary) {
    throw new Error("Match summary is missing");
  }

  if (!playersWithPoints || playersWithPoints.length === 0) {
    throw new Error("No player stats available to save");
  }

  const matchKey = buildMatchKey(matchSummary);

  // 1. check duplicate match
  const { data: existingMatch, error: existingMatchError } = await supabase
    .from("matches")
    .select("id, match_key")
    .eq("match_key", matchKey)
    .maybeSingle();

  if (existingMatchError) {
    throw new Error(`Failed to check existing match: ${existingMatchError.message}`);
  }

  if (existingMatch) {
    throw new Error("This match is already saved");
  }

  // 2. insert match
  const { data: insertedMatch, error: matchInsertError } = await supabase
    .from("matches")
    .insert([
      {
        source: "cricsheet",
        match_key: matchKey,
        match_name: matchSummary?.event_name || `${matchSummary?.teams?.[0]} vs ${matchSummary?.teams?.[1]}`,
        team1: matchSummary?.teams?.[0] || null,
        team2: matchSummary?.teams?.[1] || null,
        venue: matchSummary?.venue || null,
        city: matchSummary?.city || null,
        match_date: matchSummary?.date || null,
        winner: matchSummary?.winner || null,
        raw_json: rawJson || null,
      },
    ])
    .select()
    .single();

  if (matchInsertError) {
    throw new Error(`Failed to insert match: ${matchInsertError.message}`);
  }

  const matchId = insertedMatch.id;

  // 3. fetch players from DB
  const { data: dbPlayers, error: dbPlayersError } = await supabase
    .from("players")
    .select("id, player_name");

  if (dbPlayersError) {
    throw new Error(`Failed to fetch DB players: ${dbPlayersError.message}`);
  }

  // 4. build lookup map from DB players
  const playerLookup = new Map();

  for (const dbPlayer of dbPlayers || []) {
    const normalizedDbName = normalizePlayerName(dbPlayer.name);

    if (!playerLookup.has(normalizedDbName)) {
      playerLookup.set(normalizedDbName, dbPlayer);
    }
  }

  // 5. prepare rows for player_match_stats
  const statsRows = playersWithPoints.map((player) => {
    const originalName = player.player_name || "";
    const normalizedName = normalizePlayerName(originalName);
    const matchedPlayer = playerLookup.get(normalizedName);

    return {
      match_id: matchId,
      player_id: matchedPlayer ? matchedPlayer.id : null,
      player_name: originalName,
      normalized_name: normalizedName,
      team_name: player.team_name || null,

      runs: safeNumber(player.runs),
      balls: safeNumber(player.balls),
      fours: safeNumber(player.fours),
      sixes: safeNumber(player.sixes),
      strike_rate: player.strike_rate != null ? safeNumber(player.strike_rate) : null,

      wickets: safeNumber(player.wickets),
      balls_bowled: safeNumber(player.balls_bowled),
      runs_conceded: safeNumber(player.runs_conceded),
      maidens: safeNumber(player.maidens),
      economy: player.economy != null ? safeNumber(player.economy) : null,

      catches: safeNumber(player.catches),
      stumpings: safeNumber(player.stumpings),
      run_outs: safeNumber(player.run_outs ?? player.runouts),
      fantasy_points: safeNumber(player.fantasy_points),

      is_matched: !!matchedPlayer,
    };
  });

  // 6. insert stats
  const { error: statsInsertError } = await supabase
    .from("player_match_stats")
    .insert(statsRows);

  if (statsInsertError) {
    await supabase.from("matches").delete().eq("id", matchId);
    throw new Error(`Failed to insert player match stats: ${statsInsertError.message}`);
  }

  const matchedPlayers = statsRows.filter((row) => row.is_matched);
  const unmatchedPlayers = statsRows.filter((row) => !row.is_matched);

  return {
    matchId,
    totalPlayers: statsRows.length,
    matchedCount: matchedPlayers.length,
    unmatchedCount: unmatchedPlayers.length,
    unmatchedPlayers: unmatchedPlayers.map((row) => row.player_name),
  };
}