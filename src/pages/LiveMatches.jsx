import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";

function getStatusStyle(match) {
  if (match.is_live) return "border-red-200 bg-red-50 text-red-700";
  if (match.is_final) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusLabel(match) {
  if (match.is_live) return "LIVE";
  if (match.is_final) return "FINAL";
  return String(match.status || "Pending").toUpperCase();
}

function formatScore(score) {
  if (!score || typeof score !== "object") return "Score not available";
  return `${score.runs ?? 0}/${score.wickets ?? 0} (${score.overs ?? "0.0"})`;
}

function formatSource(source) {
  if (source === "cricbuzz-live") return "Cricbuzz";
  if (source === "kncb-ball-by-ball") return "KNCB";
  if (source === "cricsheet-live-replay") return "Cricsheet";
  if (source === "mock-live") return "Mock";
  return source || "Unknown source";
}

export default function LiveMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMatches() {
      const { data, error } = await supabase
        .from("live_matches")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!active) return;

      if (error) {
        setErrorMessage(error.message);
      } else {
        setMatches(data || []);
        setErrorMessage("");
        setLastRefreshed(new Date().toLocaleTimeString());
      }

      setLoading(false);
    }

    loadMatches();
    const timer = setInterval(loadMatches, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const sortedMatches = useMemo(
    () =>
      [...matches].sort((a, b) => {
        if (Boolean(a.is_live) !== Boolean(b.is_live)) return a.is_live ? -1 : 1;
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      }),
    [matches]
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              <span aria-hidden="true">←</span>
              Home
            </Link>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Live Matches</h1>
            <p className="mt-2 text-sm text-slate-600">
              Cricbuzz and KNCB fantasy scoring matches.
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
            Auto-refresh: 10 seconds
            {lastRefreshed ? ` · Updated ${lastRefreshed}` : ""}
          </div>
        </header>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load live matches: {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="font-medium text-slate-700">Loading matches…</p>
          </div>
        ) : sortedMatches.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold">No scoring matches yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Start a match from the live-scoring admin page.
            </p>
            <Link
              to="/admin/live-scoring"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open Live Scoring Admin
            </Link>
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortedMatches.map((match) => (
              <article
                key={match.match_id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="border-b border-slate-100 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                      {formatSource(match.source)}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-extrabold tracking-wide ${getStatusStyle(match)}`}
                    >
                      {getStatusLabel(match)}
                    </span>
                  </div>

                  <h2 className="mt-5 min-h-14 text-xl font-bold leading-tight">
                    {match.title || match.match_id}
                  </h2>

                  <div className="mt-5 rounded-2xl bg-slate-950 px-5 py-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Current score
                    </p>
                    <p className="mt-1 text-3xl font-black tabular-nums">
                      {formatScore(match.score)}
                    </p>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <dt className="text-xs font-medium text-slate-500">Status</dt>
                      <dd className="mt-1 font-semibold capitalize">
                        {match.status || "Unknown"}
                      </dd>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <dt className="text-xs font-medium text-slate-500">Balls stored</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {match.total_ball_events ?? 0}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="grid grid-cols-1 gap-3 bg-slate-50 p-5 sm:grid-cols-2">
                  <Link
                    to={`/live-match/${encodeURIComponent(match.match_id)}`}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Player leaderboard
                  </Link>

                  <Link
                    to={`/live-league/${encodeURIComponent(match.match_id)}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                  >
                    Owner leaderboard
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
