function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function isIplMatch(match) {
  const name = normalizeText(match?.name);
  const series = normalizeText(match?.series);
  const venue = normalizeText(match?.venue);

  return (
    name.includes("indian premier league") ||
    name.includes("ipl") ||
    series.includes("indian premier league") ||
    series.includes("ipl") ||
    venue.includes("ipl")
  );
}

function toIsoDateValue(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function mapScore(scoreArray) {
  if (!Array.isArray(scoreArray)) return [];

  return scoreArray.map((item) => ({
    runs: Number(item?.r ?? item?.runs ?? 0),
    wickets: Number(item?.w ?? item?.wickets ?? 0),
    overs: String(item?.o ?? item?.overs ?? ""),
    inning: item?.inning || "",
  }));
}

function mapMatch(match) {
  return {
    id: match?.id || "",
    name: match?.name || "",
    series: match?.series || "",
    matchType: match?.matchType || "",
    status: match?.status || "",
    venue: match?.venue || "",
    date: match?.date || "",
    dateTimeGMT: match?.dateTimeGMT || "",
    teams: Array.isArray(match?.teams)
      ? match.teams.filter(Boolean)
      : [match?.team1, match?.team2].filter(Boolean),
    score: mapScore(match?.score),
  };
}

export async function getLatestIplMatches() {
  const apiKey =
    import.meta.env.VITE_CRICAPI_KEY ||
    "9134a291-b707-484f-8648-9722f70b35a2";

  if (!apiKey) {
    throw new Error("Missing CricAPI key.");
  }

  const response = await fetch(
    `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`
  );

  if (!response.ok) {
    throw new Error(`Live API request failed with status ${response.status}`);
  }

  const json = await response.json();

  if (!json || !Array.isArray(json.data)) {
    throw new Error("Invalid live API response");
  }

  const iplMatches = json.data
    .filter((match) => isIplMatch(match))
    .map((match) => mapMatch(match))
    .sort((a, b) => {
      const aTime = toIsoDateValue(a.dateTimeGMT || a.date);
      const bTime = toIsoDateValue(b.dateTimeGMT || b.date);
      return bTime - aTime;
    });

  return {
    latestMatch: iplMatches[0] || null,
    matches: iplMatches,
  };
}