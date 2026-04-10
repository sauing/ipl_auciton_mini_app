function SaveSummary({ saveSummary }) {
  if (!saveSummary) return null;

  return (
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
  );
}

export function PlayerPointsTable({
  playersWithPoints,
  saving,
  saveMessage,
  saveError,
  saveSummary,
  onSaveMatch,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Player Fantasy Points</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review the uploaded points before saving.
          </p>
        </div>

        <button
          onClick={onSaveMatch}
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

      <SaveSummary saveSummary={saveSummary} />

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
  );
}
