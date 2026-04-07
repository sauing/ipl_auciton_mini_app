function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function monthNameToNumber(monthName) {
  const months = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };

  return months[String(monthName || "").toLowerCase()] || "";
}

function parseSafeDate(fullText) {
  const match = fullText.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return "";

  const day = String(match[1]).padStart(2, "0");
  const month = monthNameToNumber(match[2]);
  const year = match[3];

  if (!month) return "";
  return `${year}-${month}-${day}`;
}

function extractTeams(fullText) {
  const resultMatch = fullText.match(/Result:\s*([A-Za-z0-9\s-]+?)\s+won by/i);

  const scorecardHeaderMatch = fullText.match(
    /([A-Za-z0-9\s-]+)\s+\d+\/\d+\s+\(\d+(?:\.\d+)?\)\s+([A-Za-z0-9\s-]+)\s+\d+\/\d+\s+\(\d+(?:\.\d+)?\)/i
  );

  let team1 = "";
  let team2 = "";

  if (scorecardHeaderMatch) {
    team1 = cleanText(scorecardHeaderMatch[1]);
    team2 = cleanText(scorecardHeaderMatch[2]);
  }

  if (!team1 || !team2) {
    const inningsHeaderMatch = fullText.match(
      /1st\s+([A-Za-z0-9\s-]+)\s+\d+\/\d+\s+1st\s+([A-Za-z0-9\s-]+)\s+\d+\/\d+/i
    );

    if (inningsHeaderMatch) {
      team1 = cleanText(inningsHeaderMatch[1]);
      team2 = cleanText(inningsHeaderMatch[2]);
    }
  }

  const winner = resultMatch ? cleanText(resultMatch[1]) : "";

  return {
    teams: [team1, team2].filter(Boolean),
    winner,
  };
}

function extractMatchSummary(fullText) {
  const venueMatch = fullText.match(/Venue:\s*([^]+?)Toss won by:/i);
  const matchIdMatch = fullText.match(/Match ID:\s*(\d+)/i);
  const resultMatch = fullText.match(/Result:\s*([^]+?)Venue:/i);
  const { teams, winner } = extractTeams(fullText);

  return {
    match_type: "1d",
    date: parseSafeDate(fullText),
    venue: venueMatch ? cleanText(venueMatch[1]) : "",
    city: "",
    teams,
    event_name: matchIdMatch ? `KNCB Match ${matchIdMatch[1]}` : "KNCB Match",
    winner: winner || (resultMatch ? cleanText(resultMatch[1]) : null),
    source_match_id: matchIdMatch ? matchIdMatch[1] : "",
  };
}

function buildEmptyInnings(matchSummary) {
  const team1 = matchSummary?.teams?.[0] || "";
  const team2 = matchSummary?.teams?.[1] || "";

  if (!team1 || !team2) return [];

  return [
    {
      battingTeam: team1,
      bowlingTeam: team2,
      batting: [],
      bowling: [],
    },
    {
      battingTeam: team2,
      bowlingTeam: team1,
      batting: [],
      bowling: [],
    },
  ];
}

export function parseKncbPdfText(extractedPdf) {
  const fullText = extractedPdf?.fullText || "";
  const matchSummary = extractMatchSummary(fullText);

  return {
    matchSummary,
    innings: buildEmptyInnings(matchSummary),
    rawText: fullText,
    pages: extractedPdf?.pages || [],
  };
}