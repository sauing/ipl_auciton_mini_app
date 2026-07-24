import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";

function statusClasses(status) {
  if (status === "running") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "completed") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "stopped") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatSource(source) {
  if (source === "cricbuzz-live") return "Cricbuzz Live";
  if (source === "kncb-ball-by-ball") return "KNCB Ball by Ball";
  return source || "Unknown";
}

export default function LiveScoringAdmin() {
  const [matchId, setMatchId] = useState("");
  const [source, setSource] = useState("cricbuzz-live");
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [busyJobId, setBusyJobId] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      const { data, error } = await supabase
        .from("live_scoring_jobs")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!active) return;

      if (error) {
        setMessage(`Could not load scoring jobs: ${error.message}`);
        setMessageType("error");
      } else {
        setJobs(data || []);
      }

      setLoadingJobs(false);
    }

    loadJobs();
    const timer = setInterval(loadJobs, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const activeJobs = useMemo(
    () => jobs.filter((job) => job.status === "running"),
    [jobs]
  );

  async function fetchJobs() {
    const { data, error } = await supabase
      .from("live_scoring_jobs")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setMessage(`Could not load scoring jobs: ${error.message}`);
      setMessageType("error");
      return;
    }

    setJobs(data || []);
  }

  async function startScoring(event) {
    event.preventDefault();

    const cleanMatchId = matchId.trim();
    const cleanInterval = Number(intervalSeconds);

    if (!cleanMatchId) {
      setMessage("Please enter a Cricbuzz match ID or full KNCB match URL.");
      setMessageType("error");
      return;
    }

    if (!Number.isFinite(cleanInterval) || cleanInterval < 5) {
      setMessage("Poll interval must be at least 5 seconds.");
      setMessageType("error");
      return;
    }

    setStarting(true);
    setMessage("");

    const now = new Date().toISOString();

    const { error } = await supabase.from("live_scoring_jobs").upsert(
      {
        match_id: cleanMatchId,
        source,
        status: "running",
        interval_seconds: cleanInterval,
        started_at: now,
        stopped_at: null,
        finalized_at: null,
        last_poll_at: null,
        last_error: null,
        updated_at: now,
      },
      { onConflict: "match_id" }
    );

    setStarting(false);

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    setMessage(
      "Scoring job started. Keep `npm run live:daemon` running in the worker terminal."
    );
    setMessageType("success");
    await fetchJobs();
  }

  async function updateStatus(job, status) {
    setBusyJobId(job.id);
    setMessage("");

    const now = new Date().toISOString();

    const payload = {
      status,
      stopped_at:
        status === "stopped" || status === "completed" ? now : job.stopped_at,
      updated_at: now,
    };

    const { error } = await supabase
      .from("live_scoring_jobs")
      .update(payload)
      .eq("id", job.id);

    setBusyJobId("");

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    setMessage(
      status === "completed"
        ? "Finalize request sent to the daemon."
        : "Stop-only request sent to the daemon."
    );
    setMessageType("success");
    await fetchJobs();
  }

  function useJob(job) {
    setMatchId(job.match_id || "");
    setSource(job.source || "cricbuzz-live");
    setIntervalSeconds(job.interval_seconds || 30);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const inputPlaceholder =
    source === "kncb-ball-by-ball"
      ? "https://matchcentre.kncb.nl/match/..."
      : "Example: 155331";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          <span aria-hidden="true">←</span>
          Home
        </Link>

        <header className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Live Scoring Admin
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Start Cricbuzz or KNCB polling jobs and control the backend daemon.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span
              className={`h-3 w-3 rounded-full ${
                activeJobs.length ? "animate-pulse bg-emerald-500" : "bg-slate-300"
              }`}
            />
            <div>
              <p className="text-xs font-medium text-slate-500">Running jobs</p>
              <p className="font-bold">{activeJobs.length}</p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
          <form
            className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={startScoring}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold">Start a scoring job</h2>
              <p className="mt-1 text-sm text-slate-500">
                The worker daemon must remain running.
              </p>
            </div>

            <label className="block text-sm font-bold text-slate-700" htmlFor="source">
              Source
            </label>
            <select
              id="source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-blue-500 focus:ring-2"
            >
              <option value="cricbuzz-live">Cricbuzz Live</option>
              <option value="kncb-ball-by-ball">KNCB Ball by Ball</option>
            </select>

            <label
              className="mt-5 block text-sm font-bold text-slate-700"
              htmlFor="match-id"
            >
              Match ID / URL
            </label>
            <input
              id="match-id"
              value={matchId}
              onChange={(event) => setMatchId(event.target.value)}
              placeholder={inputPlaceholder}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-blue-500 placeholder:text-slate-400 focus:ring-2"
            />

            <label
              className="mt-5 block text-sm font-bold text-slate-700"
              htmlFor="interval"
            >
              Poll interval
            </label>
            <div className="relative mt-2">
              <input
                id="interval"
                type="number"
                min="5"
                value={intervalSeconds}
                onChange={(event) => setIntervalSeconds(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-500">
                seconds
              </span>
            </div>

            <button
              type="submit"
              disabled={starting}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {starting ? "Starting…" : "Start Scoring"}
            </button>

            <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm text-slate-300">
              <p className="font-bold text-white">Worker command</p>
              <code className="mt-2 block break-all text-xs text-emerald-300">
                npm run live:daemon
              </code>
            </div>

            {message && (
              <div
                className={`mt-5 rounded-2xl border p-4 text-sm ${
                  messageType === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : messageType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {message}
              </div>
            )}
          </form>

          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Scoring jobs</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Auto-refreshes every 10 seconds.
                </p>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                {jobs.length} jobs
              </span>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {loadingJobs ? (
                <div className="p-12 text-center text-slate-600">
                  Loading scoring jobs…
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-12 text-center">
                  <h3 className="font-semibold">No scoring jobs yet</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Start your first job using the form.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Match", "Source", "Status", "Last Poll", "Finalized", "Error", "Actions"].map((heading) => (
                          <th
                            key={heading}
                            className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((job) => {
                        const busy = busyJobId === job.id;

                        return (
                          <tr key={job.id} className="align-top hover:bg-slate-50">
                            <td className="max-w-72 px-5 py-4">
                              <p className="break-all text-sm font-bold text-slate-900">
                                {job.match_id}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {formatSource(job.source)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase ${statusClasses(job.status)}`}
                              >
                                {job.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {job.last_poll_at
                                ? new Date(job.last_poll_at).toLocaleString()
                                : "-"}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {job.finalized_at
                                ? new Date(job.finalized_at).toLocaleString()
                                : "-"}
                            </td>
                            <td className="max-w-56 px-5 py-4 text-sm text-red-600">
                              <span className="line-clamp-3">{job.last_error || "-"}</span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex min-w-48 flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => useJob(job)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                                >
                                  Use values
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || job.status !== "running"}
                                  onClick={() => updateStatus(job, "stopped")}
                                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Stop only
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || job.status !== "running"}
                                  onClick={() => updateStatus(job, "completed")}
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Stop + finalize
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
