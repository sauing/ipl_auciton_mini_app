export function UploadSection({
  fileName,
  uploadSource,
  loading,
  onJsonUpload,
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Upload Match File
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Supported format:
            <span className="font-semibold"> manual fantasy JSON</span>.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-white font-semibold shadow hover:bg-blue-700">
          Choose JSON File
          <input
            type="file"
            accept=".json"
            onChange={onJsonUpload}
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
              Detected source: <span className="font-semibold">{uploadSource || "manual"}</span>
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
  );
}
