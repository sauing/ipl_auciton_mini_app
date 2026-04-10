export function MatchSummaryCard({ matchSummary, uploadSource }) {
  return (
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
  );
}
