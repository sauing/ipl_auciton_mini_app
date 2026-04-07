function cleanText(text) {
  return String(text || "")
    .replace(/\uF0D8|\uE813|\uF008|\uF03D|\u00A0/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b\d+\/\d+\b/g, (match) => match) // keep scores like 250/7
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueBy(arr, getKey) {
  const seen = new Set();
  const result = [];

  for (const item of arr) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function extractMatchBits(fullText) {
  const text = cleanText(fullText);

  const battingSegmentMatch = text.match(
    /(1st\s+.*?)(?=EXTRAS\s*:|TOTAL\s*:|Fall of wickets:)/i
  );

  const bowlingSegmentMatch = text.match(
    /Fall of wickets:.*?(?=(?:[A-Z][a-z]+(?:\s+\d+)?\s+Players)|BOWLING O M R W|V:\s*\d+\.\d+\.\d+|Powered by|Result:|Venue:|$)/i
  );

  return {
    text,
    battingSegment: battingSegmentMatch ? battingSegmentMatch[1] : "",
    bowlingSegment: bowlingSegmentMatch ? bowlingSegmentMatch[0] : "",
  };
}

function extractTeamName(text) {
  const cleaned = cleanText(text);

  const battedFirstMatch = cleaned.match(/Batted first:\s*([^:]+?)(?=\s+Umpires:|\s+Scorers:|\s+Match ID:|$)/i);
  if (battedFirstMatch) {
    return battedFirstMatch[1].trim();
  }

  const firstInningsMatch = cleaned.match(/1st\s+([A-Za-z0-9\- ]+?)\s+\d+\/\d+/i);
  if (firstInningsMatch) {
    return firstInningsMatch[1].trim();
  }

  return "";
}

function normalizePlayerName(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePlayerName(name) {
  const value = normalizePlayerName(name);
  if (!value) return false;

  const blocked = [
    "BATTING",
    "BOWLING",
    "EXTRAS",
    "TOTAL",
    "Fall of wickets",
    "Scorecard",
    "Ball by Ball",
    "Insights",
    "Highlights",
    "Players",
    "Result",
    "Venue",
    "Umpires",
    "Scorers",
    "Match ID",
    "Powered by",
    "COMPLETE",
  ];

  if (blocked.some((word) => value.toLowerCase().includes(word.toLowerCase()))) {
    return false;
  }

  return /^[A-Z][A-Z\s'.-]+$/.test(value);
}

function parseBattingEntriesFromSegment(segment) {
  const text = cleanText(segment);
  const batting = [];

  if (!text) return batting;

  // Remove noisy labels but keep actual player blocks.
  const working = text
    .replace(/Scorecard Ball by Ball Insights Highlights/gi, " ")
    .replace(/BATTING R B 4 6 SR/gi, " ")
    .replace(/\b1st\b/gi, " ")
    .replace(/\bCOMPLETE\b/gi, " ")
    .replace(/\bVierde Klasse\b/gi, " ")
    .replace(/\bLoopuyt Oval\b/gi, " ")
    .replace(/\bSportpark Harga\b/gi, " ");

  // Match rows like:
  // A RAJARAMAN c MT Hodgkins b N Choudry 17 19 3 0 89.47
  // D MUKHERJEE no 20 27 2 0 74.07
  // P TIWARI 4 2 1 0 200
  const rowRegex =
    /([A-Z]{1,4}(?:\s+[A-Z][A-Z'.-]+)+)\s+((?:(?![A-Z]{1,4}(?:\s+[A-Z][A-Z'.-]+)+\s+(?:c|b|lbw|run out|st|†|no|\d)).)*?)(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)/g;

  let match;
  while ((match = rowRegex.exec(working)) !== null) {
    const playerName = normalizePlayerName(match[1]);
    const dismissalText = normalizePlayerName(match[2] || "");
    const runs = toNumber(match[3]);
    const balls = toNumber(match[4]);
    const fours = toNumber(match[5]);
    const sixes = toNumber(match[6]);
    const strikeRate = toNumber(match[7]);

    if (!looksLikePlayerName(playerName)) continue;

    batting.push({
      raw: match[0],
      playerName,
      dismissal: dismissalText,
      runs,
      balls,
      fours,
      sixes,
      strikeRate,
    });
  }

  // Fallback regex for simpler rows with no dismissal text:
  // P TIWARI 4 2 1 0 200
  const fallbackRegex =
    /([A-Z]{1,4}(?:\s+[A-Z][A-Z'.-]+)+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)/g;

  while ((match = fallbackRegex.exec(working)) !== null) {
    const playerName = normalizePlayerName(match[1]);
    if (!looksLikePlayerName(playerName)) continue;

    const alreadyExists = batting.some(
      (item) =>
        item.playerName === playerName &&
        item.runs === toNumber(match[2]) &&
        item.balls === toNumber(match[3])
    );

    if (alreadyExists) continue;

    batting.push({
      raw: match[0],
      playerName,
      dismissal: "",
      runs: toNumber(match[2]),
      balls: toNumber(match[3]),
      fours: toNumber(match[4]),
      sixes: toNumber(match[5]),
      strikeRate: toNumber(match[6]),
    });
  }

  return uniqueBy(
    batting.filter((row) => row.playerName && row.balls >= 0),
    (row) => `${row.playerName}|${row.runs}|${row.balls}|${row.fours}|${row.sixes}`
  );
}

function parseBowlingEntriesFromSegment(segment) {
  const text = cleanText(segment);
  const bowling = [];

  if (!text) return bowling;

  const working = text
    .replace(/Fall of wickets:.*?(?=[A-Z]{1,4}(?:\s+[A-Z][A-Z'.-]+)+\s+\d+(?:\.\d+)?\s+\d+\s+\d+\s+\d+)/i, " ")
    .replace(/BOWLING O M R W/gi, " ");

  // Match rows like:
  // A SIDDIQUI 7 1 64 2
  // S PECK 4.3 0 25 1
  const rowRegex =
    /([A-Z]{1,4}(?:\s+[A-Z][A-Z'.-]+)+)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+)\s+(\d+)/g;

  let match;
  while ((match = rowRegex.exec(working)) !== null) {
    const playerName = normalizePlayerName(match[1]);
    const overs = toNumber(match[2]);
    const maidens = toNumber(match[3]);
    const runs = toNumber(match[4]);
    const wickets = toNumber(match[5]);

    if (!looksLikePlayerName(playerName)) continue;

    bowling.push({
      raw: match[0],
      playerName,
      overs,
      maidens,
      runs,
      wickets,
    });
  }

  return uniqueBy(
    bowling.filter((row) => row.playerName),
    (row) => `${row.playerName}|${row.overs}|${row.maidens}|${row.runs}|${row.wickets}`
  );
}

function buildDebugInfo({ text, battingSegment, bowlingSegment, batting, bowling }) {
  return {
    fullTextLength: text.length,
    battingSegmentLength: battingSegment.length,
    bowlingSegmentLength: bowlingSegment.length,
    battingRowCount: batting.length,
    bowlingRowCount: bowling.length,
    battingPreview: batting.slice(0, 5),
    bowlingPreview: bowling.slice(0, 5),
  };
}

export function parseKncbPdfInnings(fullText) {
  const warnings = [];
  const { text, battingSegment, bowlingSegment } = extractMatchBits(fullText);

  if (!text) {
    return {
      innings: [],
      warnings: ["No PDF text found."],
      debug: {
        fullTextLength: 0,
        battingSegmentLength: 0,
        bowlingSegmentLength: 0,
        battingRowCount: 0,
        bowlingRowCount: 0,
        battingPreview: [],
        bowlingPreview: [],
      },
    };
  }

  const batting = parseBattingEntriesFromSegment(battingSegment || text);
  const bowling = parseBowlingEntriesFromSegment(bowlingSegment || text);
  const teamName = extractTeamName(text);

  if (batting.length === 0) {
    warnings.push("No batting rows were parsed from the PDF text.");
  }

  if (bowling.length === 0) {
    warnings.push("No bowling rows were parsed from the PDF text.");
  }

  const innings = [
    {
      inningsNumber: 1,
      teamName,
      batting,
      bowling,
    },
  ];

  return {
    innings,
    warnings,
    debug: buildDebugInfo({
      text,
      battingSegment,
      bowlingSegment,
      batting,
      bowling,
    }),
  };
}