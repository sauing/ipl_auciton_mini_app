import { parseCricsheetMatch } from "./utils/parseCricsheetMatch";
import { addFantasyPointsToStats } from "./utils/calculateFantasyPoints";

export default function Test() {
  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const jsonData = JSON.parse(text);

      const parsedResult = parseCricsheetMatch(jsonData);
      const playersWithPoints = addFantasyPointsToStats(parsedResult.playerStats);

      console.log("Parsed Result:", parsedResult);
      console.log("Match Summary:", parsedResult.matchSummary);
      console.log("Player Stats Count:", parsedResult.playerStats.length);
      console.table(
        playersWithPoints.map((p) => ({
          player_name: p.player_name,
          runs: p.runs,
          wickets: p.wickets,
          catches: p.catches,
          stumpings: p.stumpings,
          runouts: p.runouts,
          fantasy_points: p.fantasy_points,
        }))
      );

      alert("Parser + fantasy points ran successfully. Check console.");
    } catch (error) {
      console.error("Parser error:", error);
      alert("Parser failed. Check console.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Cricsheet Parser Test</h1>
        <input type="file" accept=".json" onChange={handleFileUpload} />
      </div>
    </div>
  );
}