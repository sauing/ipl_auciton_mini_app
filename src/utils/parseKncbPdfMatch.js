import { parseKncbPdfText } from "./parseKncbPdfText";
import { parseKncbPdfInnings } from "./parseKncbPdfInnings";

function buildPlayerStatsFromInnings(innings = []) {
  const playerMap = new Map();

  function ensurePlayer(playerName) {
    const key = playerName?.trim();
    if (!key) return null;

    if (!playerMap.has(key)) {
      playerMap.set(key, {
        playerName: key,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        maidens: 0,
        overs: 0,
        bowlingRuns: 0,
        catches: 0,
        runOutDirect: 0,
        runOutShared: 0,
      });
    }

    return playerMap.get(key);
  }

  innings.forEach((inning) => {
    (inning.batting || []).forEach((bat) => {
      const player = ensurePlayer(bat.playerName);
      if (!player) return;

      player.runs += bat.runs || 0;
      player.balls += bat.balls || 0;
      player.fours += bat.fours || 0;
      player.sixes += bat.sixes || 0;
    });

    (inning.bowling || []).forEach((bowl) => {
      const player = ensurePlayer(bowl.playerName);
      if (!player) return;

      player.overs += bowl.overs || 0;
      player.maidens += bowl.maidens || 0;
      player.bowlingRuns += bowl.runs || 0;
      player.wickets += bowl.wickets || 0;
    });
  });

  return Array.from(playerMap.values());
}

export function parseKncbPdfMatch(pdfExtracted) {
  const summaryParsed = parseKncbPdfText(pdfExtracted);
  const inningsParsed = parseKncbPdfInnings(pdfExtracted.fullText || "");

  const playerStats = buildPlayerStatsFromInnings(inningsParsed.innings);

  return {
    matchSummary: summaryParsed.matchSummary,
    innings: inningsParsed.innings,
    playerStats,
    warnings: [
      ...(summaryParsed.warnings || []),
      ...(inningsParsed.warnings || []),
    ],
    rawText: pdfExtracted.fullText || "",
    pages: pdfExtracted.pages || [],
  };
}