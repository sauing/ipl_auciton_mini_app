import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";
import { parseCricsheetMatch } from "../utils/parseCricsheetMatch";
import { addFantasyPointsToStats } from "../utils/calculateFantasyPoints";
import { normalizePlayerName } from "../utils/normalizePlayerName";
import { saveFantasyMatch } from "../services/fantasySaveService";

export default function FantasyImport() {
  const { leagueId } = useParams();

  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [fileName, setFileName] = useState("");
  const [matchSummary, setMatchSummary] = useState(null);
  const [playersWithPoints, setPlayersWithPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rawJson, setRawJson] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSummary, setSaveSummary] = useState(null);

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        setAccessLoading(true)
        setAccessError('')
  
        const storedUser = JSON.parse(localStorage.getItem('auction_user'))
        const memberId = storedUser?.memberId
        const storedLeagueId = storedUser?.leagueId
        const role = storedUser?.role
  
        if (!memberId || !storedLeagueId) {
          throw new Error('No league session found. Please join the league first.')
        }
  
        if (storedLeagueId !== leagueId) {
          throw new Error('This page does not belong to your current league session.')
        }
  
        // Use same style as lobby: role-based access from stored session
        if (role === 'admin') {
          setIsAdmin(true)
          return
        }
  
        // Fallback DB check if role is missing or not admin
        const { data: memberData, error: memberError } = await supabase
          .from('league_members')
          .select('id, league_id, role')
          .eq('id', memberId)
          .eq('league_id', leagueId)
          .single()
  
        if (memberError || !memberData) {
          throw new Error('League member not found.')
        }
  
        if (memberData.role !== 'admin') {
          throw new Error('Only league admin can upload fantasy match data.')
        }
  
        setIsAdmin(true)
      } catch (error) {
        console.error('FantasyImport access error:', error)
        setAccessError(error.message || 'Access denied.')
      } finally {
        setAccessLoading(false)
      }
    }
  
    checkAdminAccess()
  }, [leagueId])

  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setLoading(true);
      setFileName(file.name);

      const text = await file.text();
      const jsonData = JSON.parse(text);

      const parsedResult = parseCricsheetMatch(jsonData);

      const players = addFantasyPointsToStats(parsedResult.playerStats)
        .map((player) => ({
          ...player,
          cricsheet_player_name: player.player_name,
          normalized_player_name: normalizePlayerName(player.player_name),
        }))
        .sort((a, b) => b.fantasy_points - a.fantasy_points);

      setMatchSummary(parsedResult.matchSummary);
      setPlayersWithPoints(players);
      setRawJson(jsonData);
      setSaveMessage("");
      setSaveError("");
      setSaveSummary(null);

      console.log("Match Summary:", parsedResult.matchSummary);
      console.table(
        players.map((p) => ({
          player_name: p.player_name,
          runs: p.runs,
          wickets: p.wickets,
          catches: p.catches,
          fantasy_points: p.fantasy_points,
        }))
      );
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to parse file. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMatch = async () => {
    try {
      setSaving(true);
      setSaveMessage("");
      setSaveError("");
      setSaveSummary(null);

      const result = await saveFantasyMatch({
        leagueId,
        matchSummary,
        playersWithPoints,
        rawJson,
      });

      setSaveMessage("Match saved successfully.");
      setSaveSummary(result);
    } catch (error) {
      console.error("Save match error:", error);
      setSaveError(error.message || "Failed to save match");
    } finally {
      setSaving(false);
    }
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6">
          <p className="text-lg font-semibold text-gray-700">
            Checking admin access...
          </p>
        </div>
      </div>
    );
  }

  if (accessError || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6">
          <p className="text-red-600 font-semibold">
            {accessError || "Access denied."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">Fantasy Match Import</h1>

          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="block w-full mb-4"
          />

          {fileName && (
            <p className="text-sm text-gray-600">
              Selected file: <span className="font-semibold">{fileName}</span>
            </p>
          )}

          {loading && <p className="text-blue-600 mt-2">Processing file...</p>}
        </div>

        {matchSummary && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Match Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><span className="font-semibold">Match Type:</span> {matchSummary.match_type}</p>
                <p><span className="font-semibold">Date:</span> {matchSummary.date}</p>
                <p><span className="font-semibold">Venue:</span> {matchSummary.venue}</p>
                <p><span className="font-semibold">City:</span> {matchSummary.city}</p>
              </div>

              <div>
                <p><span className="font-semibold">Teams:</span> {matchSummary.teams?.join(" vs ")}</p>
                <p><span className="font-semibold">Event:</span> {matchSummary.event_name}</p>
                <p><span className="font-semibold">Winner:</span> {matchSummary.winner || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        {playersWithPoints.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Player Fantasy Points</h2>

              <button
                onClick={handleSaveMatch}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Match"}
              </button>
            </div>

            {saveMessage && (
              <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-800">
                {saveMessage}
              </div>
            )}

            {saveError && (
              <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-800">
                {saveError}
              </div>
            )}

            {saveSummary && (
              <div className="mb-4 rounded-lg bg-gray-100 p-4 text-sm">
                <p><span className="font-semibold">Total Players:</span> {saveSummary.totalPlayers}</p>
                <p><span className="font-semibold">Matched:</span> {saveSummary.matchedCount}</p>
                <p><span className="font-semibold">Unmatched:</span> {saveSummary.unmatchedCount}</p>

                {saveSummary.unmatchedPlayers?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Unmatched Player Names:</p>
                    <ul className="list-disc ml-5">
                      {saveSummary.unmatchedPlayers.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border p-2 text-left">Cricsheet Name</th>
                    <th className="border p-2 text-left">Mapped Name</th>
                    <th className="border p-2 text-left">Runs</th>
                    <th className="border p-2 text-left">Wickets</th>
                    <th className="border p-2 text-left">Catches</th>
                    <th className="border p-2 text-left">Stumpings</th>
                    <th className="border p-2 text-left">Runouts</th>
                    <th className="border p-2 text-left">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {playersWithPoints.map((player) => (
                    <tr key={player.player_name}>
                      <td className="border p-2">{player.cricsheet_player_name}</td>
                      <td className="border p-2">{player.normalized_player_name}</td>
                      <td className="border p-2">{player.runs}</td>
                      <td className="border p-2">{player.wickets}</td>
                      <td className="border p-2">{player.catches}</td>
                      <td className="border p-2">{player.stumpings}</td>
                      <td className="border p-2">{player.runouts}</td>
                      <td className="border p-2 font-semibold">{player.fantasy_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}