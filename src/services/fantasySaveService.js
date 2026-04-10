import { supabase } from "../supabase";
import { normalizePlayerName } from "../utils/normalizePlayerName";

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function buildMatchKey(matchSummary) {
  const date = matchSummary?.date || "unknown-date";
  const team1 = matchSummary?.teams?.[0] || "team1";
  const team2 = matchSummary?.teams?.[1] || "team2";

  return `${date}_${team1}_${team2}`
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export async function saveFantasyMatch({
  leagueId,
  matchSummary,
  playersWithPoints,
  rawJson,
  source = "manual",
}) {
  if (!matchSummary) {
    throw new Error("Match summary is missing");
  }

  if (!playersWithPoints || playersWithPoints.length === 0) {
    throw new Error("No player stats available to save");
  }

  const cleanSource = normalizeMatchText(source);
  const matchKey = buildMatchKey(matchSummary);

  let matchId = null;
  let isExistingMatch = false;

  // STEP 1 → check existing match
  const { data: existingMatch, error: existingMatchError } = await supabase
    .from("matches")
    .select("id, match_key")
    .eq("match_key", matchKey)
    .maybeSingle();

  if (existingMatchError) {
    throw new Error(
      `Failed to check existing match: ${existingMatchError.message}`
    );
  }

  // STEP 2 → create OR reuse existing match
  if (existingMatch) {
    matchId = existingMatch.id;
    isExistingMatch = true;

    // remove previous rows so final upload replaces points
    const { error: deleteOldStatsError } = await supabase
      .from("player_match_stats")
      .delete()
      .eq("match_id", matchId);

    if (deleteOldStatsError) {
      throw new Error(
        `Failed to replace existing stats: ${deleteOldStatsError.message}`
      );
    }

    // update latest raw json + source
    const { error: updateMatchError } = await supabase
      .from("matches")
      .update({
        source: cleanSource,
        raw_json: rawJson || null,
      })
      .eq("id", matchId);

    if (updateMatchError) {
      throw new Error(
        `Failed to update existing match: ${updateMatchError.message}`
      );
    }
  } else {
    const { data: insertedMatch, error: matchInsertError } = await supabase
      .from("matches")
      .insert([
        {
          source: cleanSource,
          match_key: matchKey,
          match_name:
            matchSummary?.event_name ||
            `${matchSummary?.teams?.[0] || "Team 1"} vs ${
              matchSummary?.teams?.[1] || "Team 2"
            }`,
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

    matchId = insertedMatch.id;
  }

  // STEP 3 → fetch players
  const { data: dbPlayers, error: dbPlayersError } = await supabase
    .from("players")
    .select("id, player_name");

  if (dbPlayersError) {
    throw new Error(`Failed to fetch DB players: ${dbPlayersError.message}`);
  }

  // STEP 4 → lookup map
  const playerLookup = new Map();

  for (const dbPlayer of dbPlayers || []) {
    const normalizedDbName = normalizePlayerName(dbPlayer.player_name);

    if (!playerLookup.has(normalizedDbName)) {
      playerLookup.set(normalizedDbName, dbPlayer);
    }
  }

  // STEP 5 → build all rows first
  const allStatsRows = playersWithPoints.map((player) => {
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
      strike_rate:
        player.strike_rate != null ? safeNumber(player.strike_rate) : null,

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

  // STEP 6 → insert only matched rows
  const statsRows = allStatsRows.filter((row) => row.player_id !== null);

  if (statsRows.length > 0) {
    const { error: statsInsertError } = await supabase
      .from("player_match_stats")
      .insert(statsRows);

    if (statsInsertError) {
      throw new Error(
        `Failed to insert player match stats: ${statsInsertError.message}`
      );
    }
  }

  // STEP 7 → summary data
  const matchedPlayers = allStatsRows.filter((row) => row.is_matched);
  const unmatchedPlayers = allStatsRows.filter((row) => !row.is_matched);

  return {
    matchId,
    source: cleanSource,
    replacedExisting: isExistingMatch,
    totalPlayers: allStatsRows.length,
    matchedCount: matchedPlayers.length,
    unmatchedCount: unmatchedPlayers.length,
    unmatchedPlayers: unmatchedPlayers.map((row) => row.player_name),
  };
}