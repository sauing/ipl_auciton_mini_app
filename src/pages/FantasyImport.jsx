import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { saveFantasyMatch } from "../services/fantasySaveService";
import { useFantasyImportAccess } from "./fantasyImport/useFantasyImportAccess";
import {
  isManualFantasyJson,
  parseManualFantasyJson,
} from "./fantasyImport/fantasyImportHelpers";
import { FantasyImportHeader } from "./fantasyImport/FantasyImportHeader";
import { UploadSection } from "./fantasyImport/UploadSection";
import { MatchSummaryCard } from "./fantasyImport/MatchSummaryCard";
import { PlayerPointsTable } from "./fantasyImport/PlayerPointsTable";

export default function FantasyImport() {
  const navigate = useNavigate();
  const { leagueId } = useParams();

  const { accessLoading, accessError, isAdmin } = useFantasyImportAccess(leagueId);

  const [fileName, setFileName] = useState("");
  const [uploadSource, setUploadSource] = useState("");
  const [matchSummary, setMatchSummary] = useState(null);
  const [playersWithPoints, setPlayersWithPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rawJson, setRawJson] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSummary, setSaveSummary] = useState(null);

  function resetSaveState() {
    setSaveMessage("");
    setSaveError("");
    setSaveSummary(null);
  }

  async function handleFileUpload(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setLoading(true);
      setFileName(file.name);
      resetSaveState();

      const text = await file.text();
      const jsonData = JSON.parse(text);

      if (!isManualFantasyJson(jsonData)) {
        throw new Error(
          "Only manual fantasy JSON is supported now. Please upload the final manual JSON file."
        );
      }

      const parsedManual = parseManualFantasyJson(jsonData);

      setUploadSource(parsedManual.source);
      setMatchSummary(parsedManual.matchSummary);
      setPlayersWithPoints(parsedManual.playersWithPoints);
      setRawJson(parsedManual.rawJson);

      console.log("Manual fantasy JSON loaded:", parsedManual.matchSummary);
      console.table(
        parsedManual.playersWithPoints.map((player) => ({
          player_name: player.player_name,
          runs: player.runs,
          wickets: player.wickets,
          catches: player.catches,
          fantasy_points: player.fantasy_points,
        }))
      );
    } catch (error) {
      console.error("Import error:", error);
      alert(error.message || "Failed to parse file. Check console.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMatch() {
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
        source: uploadSource || "manual",
      });

      setSaveMessage("Match saved successfully.");
      setSaveSummary(result);
    } catch (error) {
      console.error("Save match error:", error);
      setSaveError(error.message || "Failed to save match");
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    navigate("/join");
  }

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-6">
          <p className="text-lg font-semibold text-gray-700">
            Checking admin access...
          </p>
        </div>
      </div>
    );
  }

  if (accessError || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-6">
          <p className="text-red-600 font-semibold">
            {accessError || "Access denied."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 mb-6">
          <FantasyImportHeader onBack={handleBack} />
          <UploadSection
            fileName={fileName}
            uploadSource={uploadSource}
            loading={loading}
            onJsonUpload={handleFileUpload}
          />
        </div>

        {matchSummary && (
          <MatchSummaryCard matchSummary={matchSummary} uploadSource={uploadSource} />
        )}

        {playersWithPoints.length > 0 && (
          <PlayerPointsTable
            playersWithPoints={playersWithPoints}
            saving={saving}
            saveMessage={saveMessage}
            saveError={saveError}
            saveSummary={saveSummary}
            onSaveMatch={handleSaveMatch}
          />
        )}
      </div>
    </div>
  );
}
