import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabase.js";

function formatScore(score) {
  if (!score || typeof score !== "object") return "Score not available";
  return `${score.runs ?? 0}/${score.wickets ?? 0} (${score.overs ?? "0.0"})`;
}

function statusStyle(match) {
  if (match?.is_live) return "border-red-200 bg-red-50 text-red-700";
  if (match?.is_final) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusText(match) {
  if (match?.is_live) return "LIVE";
  if (match?.is_final) return "FINAL";
  return String(match?.status || "Pending").toUpperCase();
}

export default function LiveMatchLeaderboard() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const decodedMatchId = useMemo(
    () => decodeURIComponent(matchId || ""),
    [matchId]
  );

  useEffect(() => {
    let active = true;

    async function fetchData() {
      const [matchResult, fantasyResult] = await Promise.all([
        supabase
          .from("live_matches")
          .select("*")
          .eq("match_id", decodedMatchId)
          .maybeSingle(),
        supabase
          .from("live_fantasy_points")
          .select("*")
          .eq("match_id", decodedMatchId)
          .order("fantasy_points", { ascending: false }),
      ]);

      if (!active) return;

      const firstError = matchResult.error || fantasyResult.error;

      if (firstError) {
        setErrorMessage(firstError.message);
      } else {
        setMatch(matchResult.data || null);
        setPlayers(fantasyResult.data || []);
        setErrorMessage("");
        setLastRefreshed(new Date().toLocaleTimeString());
      }

      setLoading(false);
    }

    fetchData();
    const timer = setInterval(fetchData, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [decodedMatchId]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/live-matches"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          <span aria-hidden="true">←</span>
          Live Matches
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-extrabold tracking-wide ${statusStyle(match)}`}
                >
                  {statusText(match)}
                </span>

                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {match?.source || "Live scoring"}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {match?.title || decodedMatchId}
              </h1>

              <p className="mt-3 text-sm text-slate-400">
                Last refreshed: {lastRefreshed || "Loading…"} · Auto-refreshes every 10 seconds
              </p>
            </div>

            <div className="min-w-64 rounded-2xl border border-white/10 bg-white/10 px-6 py-5 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Current score
              </p>
              <p className="mt-2 text-4xl font-black tabular-nums">
                {formatScore(match?.score)}
              </p>
              <p className="mt-2 text-sm capitalize text-slate-300">
                {match?.status || "Waiting for match data"}
              </p>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load leaderboard: {errorMessage}
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Player Fantasy Points</h2>
              <p className="mt-1 text-sm text-slate-500">
                Live match-wise player standings.
              </p>
            </div>

            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
              {players.length} players
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-600">Loading leaderboard…</div>
            ) : players.length === 0 ? (
              <div className="p-12 text-center">
                <h3 className="text-lg font-semibold">No fantasy points yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Points will appear after the daemon processes match deliveries.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {["#", "Player", "Team", "Runs", "Wickets", "Catches", "Points"].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {players.map((player, index) => (
                      <tr
                        key={`${player.player_name}-${player.team_name}`}
                        className="transition hover:bg-blue-50/50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                          {player.player_name}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {player.team_name || "-"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold tabular-nums">
                          {player.runs ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold tabular-nums">
                          {player.wickets ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold tabular-nums">
                          {player.catches ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="inline-flex min-w-16 justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white tabular-nums">
                            {player.fantasy_points ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
