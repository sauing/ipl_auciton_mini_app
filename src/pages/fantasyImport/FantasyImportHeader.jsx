export function FantasyImportHeader({ onBack }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Fantasy Match Import
        </h1>
        <p className="text-gray-600 mt-2">
          Upload your final manual fantasy JSON file and save it to the league.
        </p>
      </div>

      <button
        onClick={onBack}
        className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
      >
        Back
      </button>
    </div>
  );
}
