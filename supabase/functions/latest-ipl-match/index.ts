const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function safeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function getMatchSearchText(match: Record<string, unknown>) {
  const teamInfo = safeArray(match.teamInfo) as Record<string, unknown>[];
  const teams = safeArray(match.teams) as string[];

  return [
    safeText(match.name),
    safeText(match.matchType),
    safeText(match.status),
    safeText(match.venue),
    safeText(match.date),
    safeText(match.dateTimeGMT),
    safeText(match.series_id),
    safeText(match.series_name),
    safeText(teamInfo[0]?.name),
    safeText(teamInfo[1]?.name),
    safeText(teams[0]),
    safeText(teams[1]),
  ]
    .join(" ")
    .toLowerCase();
}

function isIplMatch(match: Record<string, unknown>) {
  const text = getMatchSearchText(match);
  return text.includes("indian premier league") || text.includes("ipl");
}

function normalizeScore(scoreItem: Record<string, unknown>) {
  return {
    runs: Number(scoreItem.r ?? 0),
    wickets: Number(scoreItem.w ?? 0),
    overs: safeText(scoreItem.o),
    inning: safeText(scoreItem.inning),
  };
}

function normalizeMatch(match: Record<string, unknown>) {
  const teamInfo = safeArray(match.teamInfo) as Record<string, unknown>[];
  const scores = safeArray(match.score) as Record<string, unknown>[];
  const teams = safeArray(match.teams) as string[];

  return {
    id: safeText(match.id),
    name: safeText(match.name),
    matchType: safeText(match.matchType),
    status: safeText(match.status),
    venue: safeText(match.venue),
    date: safeText(match.date),
    dateTimeGMT: safeText(match.dateTimeGMT),
    teams:
      teamInfo.length > 0
        ? teamInfo.map((team) => safeText(team.name)).filter(Boolean)
        : teams.map((team) => safeText(team)).filter(Boolean),
    score: scores.map(normalizeScore),
  };
}

function sortMatches(matches: Array<Record<string, unknown>>) {
  return matches.sort((a, b) => {
    const aStatus = safeText(a.status).toLowerCase();
    const bStatus = safeText(b.status).toLowerCase();

    const aLive =
      aStatus.includes("live") || aStatus.includes("innings break") ? 2 : 0;
    const bLive =
      bStatus.includes("live") || bStatus.includes("innings break") ? 2 : 0;

    if (aLive !== bLive) return bLive - aLive;

    const aTime = Date.parse(safeText(a.dateTimeGMT) || safeText(a.date) || "");
    const bTime = Date.parse(safeText(b.dateTimeGMT) || safeText(b.date) || "");

    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
      return bTime - aTime;
    }

    return 0;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const apiKey = Deno.env.get("CRICAPI_KEY");

    if (!apiKey) {
      throw new Error("Missing CRICAPI_KEY secret");
    }

    const url = `https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(
      apiKey
    )}&offset=0`;

    console.log("Fetching CricAPI currentMatches...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Connection": "keep-alive",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    const rawText = await response.text();
    let json: any = null;

    try {
      json = JSON.parse(rawText);
    } catch {
      json = null;
    }

    console.log("CricAPI status:", response.status);
    console.log("CricAPI raw response:", rawText);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `CricAPI request failed with status ${response.status}`,
          upstream: json || rawText,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!json) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "CricAPI did not return valid JSON",
          rawText,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const rawMatches = Array.isArray(json?.data) ? json.data : [];

    const iplMatches = sortMatches(
      rawMatches.filter((match) => isIplMatch(match))
    ).map(normalizeMatch);

    return new Response(
      JSON.stringify({
        success: true,
        count: iplMatches.length,
        latestMatch: iplMatches[0] || null,
        matches: iplMatches,
        debug: {
          totalMatchesFromApi: rawMatches.length,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});