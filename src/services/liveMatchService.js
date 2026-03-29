export async function getLatestIplMatches() {
    const apiKey = "9134a291-b707-484f-8648-9722f70b35a2";
  
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
      .filter((match) => {
        const name = (match?.name || "").toLowerCase();
        return (
          name.includes("indian premier league") ||
          name.includes("ipl")
        );
      })
      .map((match) => ({
        id: match?.id || "",
        name: match?.name || "",
        matchType: match?.matchType || "",
        status: match?.status || "",
        venue: match?.venue || "",
        date: match?.date || "",
        dateTimeGMT: match?.dateTimeGMT || "",
        teams: Array.isArray(match?.teams) ? match.teams : [],
        score: Array.isArray(match?.score)
          ? match.score.map((item) => ({
              runs: Number(item?.r ?? 0),
              wickets: Number(item?.w ?? 0),
              overs: String(item?.o ?? ""),
              inning: item?.inning || "",
            }))
          : [],
      }));
  
    return {
      latestMatch: iplMatches[0] || null,
      matches: iplMatches,
    };
  }