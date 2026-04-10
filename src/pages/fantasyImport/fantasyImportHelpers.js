import { normalizePlayerName } from "../../utils/normalizePlayerName";

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function isManualFantasyJson(jsonData) {
  return (
    jsonData &&
    typeof jsonData === "object" &&
    jsonData.matchSummary &&
    Array.isArray(jsonData.playersWithPoints)
  );
}

export function parseManualFantasyJson(jsonData) {
  const summary = {
    match_type: jsonData?.matchSummary?.match_type || "t20",
    date: jsonData?.matchSummary?.date || "",
    venue: jsonData?.matchSummary?.venue || "",
    city: jsonData?.matchSummary?.city || "",
    teams: Array.isArray(jsonData?.matchSummary?.teams)
      ? jsonData.matchSummary.teams
      : [],
    event_name: jsonData?.matchSummary?.event_name || "",
    winner: jsonData?.matchSummary?.winner || null,
  };

  const players = (jsonData.playersWithPoints || [])
    .map((player) => {
      const originalName = player.player_name || "";
      return {
        ...player,
        player_name: originalName,
        cricsheet_player_name: player.cricsheet_player_name || originalName,
        normalized_player_name: normalizePlayerName(originalName),
        runs: toNumber(player.runs),
        wickets: toNumber(player.wickets),
        catches: toNumber(player.catches),
        stumpings: toNumber(player.stumpings),
        runouts: toNumber(player.runouts ?? player.run_outs),
        fantasy_points: toNumber(player.fantasy_points),
      };
    })
    .filter((player) => player.player_name)
    .sort((a, b) => b.fantasy_points - a.fantasy_points);

  return {
    matchSummary: summary,
    playersWithPoints: players,
    rawJson: jsonData,
    source: jsonData?.source || "manual",
  };
}
