import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import { parseCricsheetMatch } from "../utils/parseCricsheetMatch";
import { addFantasyPointsToStats } from "../utils/calculateFantasyPoints";
import { normalizePlayerName } from "../utils/normalizePlayerName";
import { saveFantasyMatch } from "../services/fantasySaveService";
import { getLatestIplMatches } from "../services/liveMatchService";

export default function FantasyImport() {
  const navigate = useNavigate();
  const { leagueId } = useParams();

  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

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

  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedLiveMatchId, setSelectedLiveMatchId] = useState("");
  const [selectedLiveMatch, setSelectedLiveMatch] = useState(null);

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        setAccessLoading(true);
        setAccessError("");

        const storedUser = JSON.parse(localStorage.getItem("auction_user"));
        const memberId = storedUser?.memberId;
        const storedLeagueId = storedUser?.leagueId;
        const role = storedUser?.role;

        if (!memberId || !storedLeagueId) {
          throw new Error("No league session found. Please join the league first.");
        }

        if (storedLeagueId !== leagueId) {
          throw new Error("This page does not belong to your current league session.");
        }

        if (role === "admin") {
          setIsAdmin(true);
          return;
        }

        const { data: memberData, error: memberError } = await supabase
          .from("league_members")
          .select("id, league_id, role")
          .eq("id", memberId)
          .eq("league_id", leagueId)
          .single();

        if (memberError || !memberData) {
          throw new Error("League member not found.");
        }

        if (memberData.role !== "admin") {
          throw new Error("Only league admin can upload fantasy match data.");
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("FantasyImport access error:", error);
        setAccessError(error.message || "Access denied.");
      } finally {
        setAccessLoading(false);
      }
    }

    checkAdminAccess();
  }, [leagueId]);

  async function handleFetchLatestIplMatches() {
    try {
      setLiveLoading(true);
      setLiveError("");

      const result = await getLatestIplMatches();
      const matches = result.matches || [];

      setLiveMatches(matches);

      if (matches.length > 0) {
        setSelectedLiveMatchId(matches[0].id);
        setSelectedLiveMatch(matches[0]);
      } else {
        setSelectedLiveMatchId("");
        setSelectedLiveMatch(null);
        setLiveError("No IPL matches found from live source.");
      }
    } catch (error) {
      console.error("Live IPL fetch error:", error);
      setLiveError(error.message || "Failed to fetch latest IPL matches.");
    } finally {
      setLiveLoading(false);
    }
  }

  function handleLiveMatchChange(e) {
    const matchId = e.target.value;
    setSelectedLiveMatchId(matchId);

    const foundMatch =
      liveMatches.find((match) => String(match.id) === String(matchId)) || null;
    setSelectedLiveMatch(foundMatch);
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/ipl|indian premier league|t20|match|men|women/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeTeamName(name) {
    const value = normalizeText(name);

    const map = {
      "royal challengers bengaluru": "rcb",
      "royal challengers bangalore": "rcb",
      rcb: "rcb",

      "mumbai indians": "mi",
      mi: "mi",

      "chennai super kings": "csk",
      csk: "csk",

      "kolkata knight riders": "kkr",
      kkr: "kkr",

      "sunrisers hyderabad": "srh",
      srh: "srh",

      "rajasthan royals": "rr",
      rr: "rr",

      "delhi capitals": "dc",
      dc: "dc",

      "lucknow super giants": "lsg",
      lsg: "lsg",

      "gujarat titans": "gt",
      gt: "gt",

      "punjab kings": "pbks",
      "kings xi punjab": "pbks",
      pbks: "pbks",
    };

    return map[value] || value;
  }

  function onlyDate(value) {
    if (!value) return "";

    const str = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (str.includes("T")) return str.split("T")[0];

    return str.slice(0, 10);
  }

  function getLiveTeams(match) {
    if (!match) return [];

    if (Array.isArray(match.teams) && match.teams.length) {
      return match.teams;
    }

    return [match.team1, match.team2, match.t1, match.t2].filter(Boolean);
  }

  function getLiveMatchName(match) {
    return match?.name || match?.series || match?.matchType || "";
  }

  function isManualFantasyJson(jsonData) {
    return (
      jsonData &&
      typeof jsonData === "object" &&
      jsonData.matchSummary &&
      Array.isArray(jsonData.playersWithPoints)
    );
  }

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function parseManualFantasyJson(jsonData) {
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

  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setLoading(true);
      setFileName(file.name);
      setSaveMessage("");
      setSaveError("");
      setSaveSummary(null);

      const text = await file.text();
      const jsonData = JSON.parse(text);

      if (isManualFantasyJson(jsonData)) {
        const parsedManual = parseManualFantasyJson(jsonData);

        setUploadSource(parsedManual.source);
        setMatchSummary(parsedManual.matchSummary);
        setPlayersWithPoints(parsedManual.playersWithPoints);
        setRawJson(parsedManual.rawJson);

        console.log("Manual / provisional JSON loaded:", parsedManual.matchSummary);
        console.table(
          parsedManual.playersWithPoints.map((p) => ({
            player_name: p.player_name,
            runs: p.runs,
            wickets: p.wickets,
            catches: p.catches,
            fantasy_points: p.fantasy_points,
          }))
        );

        return;
      }

      const parsedResult = parseCricsheetMatch(jsonData);

      const players = addFantasyPointsToStats(parsedResult.playerStats)
        .map((player) => ({
          ...player,
          cricsheet_player_name: player.player_name,
          normalized_player_name: normalizePlayerName(player.player_name),
        }))
        .sort((a, b) => b.fantasy_points - a.fantasy_points);

      setUploadSource("cricsheet");
      setMatchSummary(parsedResult.matchSummary);
      setPlayersWithPoints(players);
      setRawJson(jsonData);

      console.log("Cricsheet Match Summary:", parsedResult.matchSummary);
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
        source: uploadSource || "cricsheet",
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

  function handleBack() {
    navigate("/join");
  }

  const verification = useMemo(() => {
    if (!matchSummary || !selectedLiveMatch) return null;

    const uploadedTeams = matchSummary?.teams || [];
    const uploadedDate = matchSummary?.date || "";
    const uploadedEventName = matchSummary?.event_name || "";

    const liveTeams = getLiveTeams(selectedLiveMatch);
    const liveDate = selectedLiveMatch?.date || "";
    const liveMatchName = getLiveMatchName(selectedLiveMatch);

    const a = uploadedTeams.map(normalizeTeamName).sort();
    const b = liveTeams.map(normalizeTeamName).sort();

    const teamsMatched =
      a.length >= 2 &&
      b.length >= 2 &&
      a.length === b.length &&
      a.every((team, index) => team === b[index]);

    const dateMatched =
      onlyDate(uploadedDate) &&
      onlyDate(liveDate) &&
      onlyDate(uploadedDate) === onlyDate(liveDate);

    const eventMatched =
      uploadedEventName && liveMatchName
        ? normalizeText(uploadedEventName).includes(normalizeText(liveMatchName)) ||
          normalizeText(liveMatchName).includes(normalizeText(uploadedEventName))
        : false;

    const score = [teamsMatched, dateMatched, eventMatched].filter(Boolean).length;

    let status = "warning";
    if (score >= 2) status = "matched";
    if (score === 0) status = "mismatch";

    return {
      status,
      teamsMatched,
      dateMatched,
      eventMatched,
      uploadedTeams,
      liveTeams,
      uploadedDate: onlyDate(uploadedDate),
      liveDate: onlyDate(liveDate),
      uploadedEventName,
      liveMatchName,
    };
  }, [matchSummary, selectedLiveMatch]);

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Fantasy Match Import
              </h1>
              <p className="text-gray-600 mt-2">
                Upload either a Cricsheet JSON file or your manual/provisional fantasy JSON file.
              </p>
            </div>

            <button
              onClick={handleBack}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Back
            </button>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Live IPL Match Helper
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Fetch latest IPL match details first, then upload your file for final or provisional save.
                </p>
              </div>

              <button
                onClick={handleFetchLatestIplMatches}
                disabled={liveLoading}
                className="rounded-lg bg-indigo-600 px-5 py-3 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50"
              >
                {liveLoading ? "Fetching..." : "Fetch Latest IPL Match"}
              </button>
            </div>

            {liveError && (
              <div className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">
                {liveError}
              </div>
            )}

            {liveMatches.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Match
                </label>

                <select
                  value={selectedLiveMatchId}
                  onChange={handleLiveMatchChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {liveMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.name} {match.date ? `- ${match.date}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedLiveMatch && (
              <div className="mt-4 rounded-xl bg-white border border-indigo-100 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Selected Live Match
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-gray-50 p-4 border">
                    <p>
                      <span className="font-semibold">Match:</span> {selectedLiveMatch.name || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Teams:</span> {selectedLiveMatch.teams?.join(" vs ") || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Type:</span> {selectedLiveMatch.matchType || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Date:</span> {selectedLiveMatch.date || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4 border">
                    <p>
                      <span className="font-semibold">Venue:</span> {selectedLiveMatch.venue || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Status:</span> {selectedLiveMatch.status || "N/A"}
                    </p>

                    {selectedLiveMatch.score?.length > 0 ? (
                      <div className="mt-2">
                        <p className="font-semibold mb-1">Score:</p>
                        <ul className="list-disc ml-5">
                          {selectedLiveMatch.score.map((item, index) => (
                            <li key={index}>
                              {(item.inning || "Inning")} - {item.r ?? item.runs}/{item.w ?? item.wickets} ({item.o ?? item.overs})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p>
                        <span className="font-semibold">Score:</span> N/A
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-amber-700 mt-3">
                  This is helper data from live API for matching and verification.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Upload Match File
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Supported formats:
                  <span className="font-semibold"> Cricsheet JSON </span>
                  or
                  <span className="font-semibold"> manual/provisional fantasy JSON</span>.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-white font-semibold shadow hover:bg-blue-700">
                Choose JSON File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-4 rounded-lg bg-white border border-gray-200 p-4">
              {fileName ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    Selected file: <span className="font-semibold">{fileName}</span>
                  </p>
                  <p>
                    Detected source: <span className="font-semibold">{uploadSource || "unknown"}</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No file selected yet.</p>
              )}
            </div>

            {loading && (
              <p className="text-blue-600 mt-4 font-medium">Processing file...</p>
            )}
          </div>
        </div>

        {matchSummary && (
          <>
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Match Summary</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-gray-50 p-4 border">
                  <p>
                    <span className="font-semibold">Source:</span> {uploadSource || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Match Type:</span> {matchSummary.match_type || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Date:</span> {matchSummary.date || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Venue:</span> {matchSummary.venue || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">City:</span> {matchSummary.city || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 border">
                  <p>
                    <span className="font-semibold">Teams:</span> {matchSummary.teams?.join(" vs ") || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Event:</span> {matchSummary.event_name || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Winner:</span> {matchSummary.winner || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {selectedLiveMatch && verification && (
              <div
                className={`bg-white rounded-2xl shadow-md p-6 mb-6 border ${
                  verification.status === "matched"
                    ? "border-green-200 bg-green-50"
                    : verification.status === "mismatch"
                    ? "border-red-200 bg-red-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Match Verification</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Compare uploaded file with selected live match before saving.
                    </p>
                  </div>

                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      verification.status === "matched"
                        ? "bg-green-100 text-green-700"
                        : verification.status === "mismatch"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {verification.status === "matched"
                      ? "Verified"
                      : verification.status === "mismatch"
                      ? "Possible mismatch"
                      : "Check before save"}
                  </span>
                </div>

                {verification.status === "matched" && (
                  <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-800">
                    Looks good. Uploaded file and selected live match seem to match.
                  </div>
                )}

                {verification.status === "warning" && (
                  <div className="mb-4 rounded-lg bg-yellow-100 p-3 text-yellow-800">
                    Partial match found. Please review once before saving.
                  </div>
                )}

                {verification.status === "mismatch" && (
                  <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-800">
                    Warning: selected live match may not match the uploaded file.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-xl bg-white p-4 border">
                    <p className="font-semibold mb-2">Teams</p>
                    <p>
                      <span className="font-semibold">Uploaded:</span>{" "}
                      {verification.uploadedTeams.join(" vs ") || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Live:</span>{" "}
                      {verification.liveTeams.join(" vs ") || "N/A"}
                    </p>
                    <p className={`mt-2 font-medium ${verification.teamsMatched ? "text-green-700" : "text-red-700"}`}>
                      {verification.teamsMatched ? "Teams matched" : "Teams did not match"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4 border">
                    <p className="font-semibold mb-2">Date</p>
                    <p>
                      <span className="font-semibold">Uploaded:</span>{" "}
                      {verification.uploadedDate || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Live:</span>{" "}
                      {verification.liveDate || "N/A"}
                    </p>
                    <p className={`mt-2 font-medium ${verification.dateMatched ? "text-green-700" : "text-red-700"}`}>
                      {verification.dateMatched ? "Date matched" : "Date did not match"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4 border">
                    <p className="font-semibold mb-2">Event / Match Name</p>
                    <p>
                      <span className="font-semibold">Uploaded:</span>{" "}
                      {verification.uploadedEventName || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Live:</span>{" "}
                      {verification.liveMatchName || "N/A"}
                    </p>
                    <p className={`mt-2 font-medium ${verification.eventMatched ? "text-green-700" : "text-red-700"}`}>
                      {verification.eventMatched ? "Event looks similar" : "Event looks different"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {playersWithPoints.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-semibold">Player Fantasy Points</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Review the calculated or uploaded points before saving.
                </p>
              </div>

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
                <p>
                  <span className="font-semibold">Total Players:</span> {saveSummary.totalPlayers}
                </p>
                <p>
                  <span className="font-semibold">Matched:</span> {saveSummary.matchedCount}
                </p>
                <p>
                  <span className="font-semibold">Unmatched:</span> {saveSummary.unmatchedCount}
                </p>

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
                    <th className="border p-2 text-left">Player Name</th>
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
                    <tr key={`${player.player_name}-${player.team_name || ""}`}>
                      <td className="border p-2">
                        {player.cricsheet_player_name || player.player_name}
                      </td>
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