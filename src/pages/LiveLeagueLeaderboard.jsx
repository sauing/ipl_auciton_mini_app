import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabase.js";

function getStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    console.error(`Could not read ${key} from localStorage:`, error);
    return null;
  }
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatScore(score) {
  if (!score || typeof score !== "object") {
    return "Score not available";
  }

  return `${score.runs ?? 0}/${score.wickets ?? 0} (${score.overs ?? "0.0"})`;
}

function getStatusClasses(match) {
  if (match?.is_live) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (match?.is_final) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusText(match) {
  if (match?.is_live) return "LIVE";
  if (match?.is_final) return "FINAL";
  return String(match?.status || "Pending").toUpperCase();
}

function getRankClasses(index) {
  if (index === 0) return "bg-yellow-100 text-yellow-800";
  if (index === 1) return "bg-slate-200 text-slate-700";
  if (index === 2) return "bg-orange-100 text-orange-800";
  return "bg-blue-50 text-blue-700";
}

export default function LiveLeagueLeaderboard() {
  const { matchId } = useParams();

  const decodedMatchId = useMemo(
    () => decodeURIComponent(matchId || ""),
    [matchId]
  );

  const storedLeagueId = useMemo(() => {
    const joinedLeague = getStoredJson("joined_league");
    const auctionUser = getStoredJson("auction_user");

    return (
      joinedLeague?.id ||
      joinedLeague?.league_id ||
      joinedLeague?.leagueId ||
      auctionUser?.leagueId ||
      ""
    );
  }, []);

  const [match, setMatch] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(storedLeagueId);
  const [owners, setOwners] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [leaderboardError, setLeaderboardError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      const [matchResult, leaguesResult] = await Promise.all([
        supabase
          .from("live_matches")
          .select("*")
          .eq("match_id", decodedMatchId)
          .maybeSingle(),

        supabase
          .from("leagues")
          .select("id, league_name, join_code")
          .order("league_name", { ascending: true }),
      ]);

      if (!active) return;

      if (matchResult.error) {
        setMatchError(matchResult.error.message);
      } else {
        setMatch(matchResult.data || null);
        setMatchError("");
      }

      if (leaguesResult.error) {
        setLeaderboardError(
          `Could not load fantasy leagues: ${leaguesResult.error.message}`
        );
      } else {
        const availableLeagues = leaguesResult.data || [];
        setLeagues(availableLeagues);

        if (!selectedLeagueId && availableLeagues.length === 1) {
          setSelectedLeagueId(availableLeagues[0].id);
        }
      }

      setLoadingPage(false);
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [decodedMatchId, selectedLeagueId]);

  useEffect(() => {
    let active = true;

    async function loadOwnerLeaderboard() {
      if (!selectedLeagueId) {
        setOwners([]);
        setLeaderboardError("");
        setLoadingOwners(false);
        return;
      }

      setLoadingOwners(true);

      const [membersResult, teamPlayersResult, livePointsResult] =
        await Promise.all([
          supabase
            .from("league_members")
            .select("id, user_name")
            .eq("league_id", selectedLeagueId),

          supabase
            .from("team_players")
            .select(`
              id,
              member_id,
              player_id,
              players (
                player_name,
                ipl_team,
                role_type
              )
            `)
            .eq("league_id", selectedLeagueId),

          supabase
            .from("live_fantasy_points")
            .select(`
              player_name,
              team_name,
              runs,
              wickets,
              catches,
              fantasy_points,
              is_live,
              is_final
            `)
            .eq("match_id", decodedMatchId),
        ]);

      if (!active) return;

      const firstError =
        membersResult.error ||
        teamPlayersResult.error ||
        livePointsResult.error;

      if (firstError) {
        setLeaderboardError(firstError.message);
        setOwners([]);
        setLoadingOwners(false);
        return;
      }

      const pointsByPlayerName = new Map();

      for (const row of livePointsResult.data || []) {
        const key = normalizeName(row.player_name);
        if (!key) continue;

        pointsByPlayerName.set(key, {
          player_name: row.player_name,
          team_name: row.team_name,
          runs: Number(row.runs || 0),
          wickets: Number(row.wickets || 0),
          catches: Number(row.catches || 0),
          fantasy_points: Number(row.fantasy_points || 0),
        });
      }

      const playersByMemberId = new Map();

      for (const row of teamPlayersResult.data || []) {
        if (!playersByMemberId.has(row.member_id)) {
          playersByMemberId.set(row.member_id, []);
        }

        const auctionPlayerName = row.players?.player_name || "";
        const liveRow = pointsByPlayerName.get(
          normalizeName(auctionPlayerName)
        );

        playersByMemberId.get(row.member_id).push({
          team_player_id: row.id,
          player_id: row.player_id,
          player_name: auctionPlayerName || "Unknown Player",
          ipl_team: row.players?.ipl_team || "-",
          role_type: row.players?.role_type || "-",
          match_points: Number(liveRow?.fantasy_points || 0),
          runs: Number(liveRow?.runs || 0),
          wickets: Number(liveRow?.wickets || 0),
          catches: Number(liveRow?.catches || 0),
          matched_live_player: Boolean(liveRow),
        });
      }

      const ownerRows = (membersResult.data || [])
        .map((member) => {
          const players = playersByMemberId.get(member.id) || [];

          return {
            member_id: member.id,
            member_name: member.user_name || "Unknown Member",
            total_points: players.reduce(
              (sum, player) => sum + player.match_points,
              0
            ),
            owned_player_count: players.length,
            scoring_player_count: players.filter(
              (player) => player.match_points !== 0
            ).length,
            matched_player_count: players.filter(
              (player) => player.matched_live_player
            ).length,
            players: [...players].sort(
              (a, b) => b.match_points - a.match_points
            ),
          };
        })
        .sort((a, b) => {
          if (b.total_points !== a.total_points) {
            return b.total_points - a.total_points;
          }

          return a.member_name.localeCompare(b.member_name);
        });

      setOwners(ownerRows);
      setLeaderboardError("");
      setLastRefreshed(new Date().toLocaleTimeString());
      setLoadingOwners(false);
    }

    loadOwnerLeaderboard();
    const timer = setInterval(loadOwnerLeaderboard, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [decodedMatchId, selectedLeagueId]);

  function handleLeagueChange(event) {
    const nextLeagueId = event.target.value;
    setSelectedLeagueId(nextLeagueId);

    const selectedLeague = leagues.find(
      (league) => league.id === nextLeagueId
    );

    if (selectedLeague) {
      localStorage.setItem(
        "joined_league",
        JSON.stringify({
          id: selectedLeague.id,
          league_name: selectedLeague.league_name,
          join_code: selectedLeague.join_code,
        })
      );
    }
  }

  const selectedLeague = leagues.find(
    (league) => league.id === selectedLeagueId
  );

  const topOwner = owners[0] || null;
  const totalPoints = owners.reduce(
    (sum, owner) => sum + owner.total_points,
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/live-matches"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            <span aria-hidden="true">←</span>
            Live Matches
          </Link>

          {selectedLeagueId && (
            <Link
              to={`/league/${selectedLeagueId}/fantasy-leaderboard`}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Overall Fantasy Leaderboard
            </Link>
          )}
        </div>

        <section className="mt-5 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-extrabold tracking-wide ${getStatusClasses(
                    match
                  )}`}
                >
                  {getStatusText(match)}
                </span>

                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Owner leaderboard
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {match?.title || decodedMatchId}
              </h1>

              <p className="mt-3 text-sm text-slate-400">
                Match-wise points for every fantasy owner
                {lastRefreshed ? ` · Updated ${lastRefreshed}` : ""}
              </p>
            </div>

            <div className="min-w-64 rounded-2xl border border-white/10 bg-white/10 px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Current score
              </p>
              <p className="mt-2 text-4xl font-black tabular-nums">
                {formatScore(match?.score)}
              </p>
            </div>
          </div>
        </section>

        {matchError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load match: {matchError}
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h2 className="text-xl font-bold">Choose fantasy league</h2>
              <p className="mt-1 text-sm text-slate-500">
                Owner points depend on which auction league you want to view.
              </p>
            </div>

            <div>
              <label
                htmlFor="league-selector"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Fantasy league
              </label>

              <select
                id="league-selector"
                value={selectedLeagueId}
                onChange={handleLeagueChange}
                disabled={loadingPage}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-blue-500 focus:ring-2 disabled:opacity-60"
              >
                <option value="">Select a league</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.league_name}
                    {league.join_code ? ` (${league.join_code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {leaderboardError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load owner leaderboard: {leaderboardError}
          </div>
        )}

        {!selectedLeagueId ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold">Select a fantasy league</h2>
            <p className="mt-2 text-sm text-slate-500">
              Choose a league above to calculate owner points for this match.
            </p>
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Fantasy owners
                </p>
                <p className="mt-2 text-3xl font-black">{owners.length}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Current leader
                </p>
                <p className="mt-2 truncate text-2xl font-black">
                  {topOwner?.member_name || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Combined match points
                </p>
                <p className="mt-2 text-3xl font-black tabular-nums">
                  {totalPoints}
                </p>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">
                  {selectedLeague?.league_name || "Owner"} Rankings
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  The page refreshes automatically every 10 seconds.
                </p>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {loadingOwners ? (
                  <div className="p-12 text-center text-slate-600">
                    Loading owner leaderboard…
                  </div>
                ) : owners.length === 0 ? (
                  <div className="p-12 text-center">
                    <h3 className="text-lg font-semibold">
                      No league owners found
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Check that the selected league contains members and
                      auctioned players.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {owners.map((owner, index) => (
                      <details
                        key={owner.member_id}
                        className="group open:bg-slate-50"
                      >
                        <summary className="flex cursor-pointer list-none flex-col gap-4 p-5 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-4">
                            <span
                              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${getRankClasses(
                                index
                              )}`}
                            >
                              {index + 1}
                            </span>

                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-bold">
                                {owner.member_name}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {owner.owned_player_count} players ·{" "}
                                {owner.matched_player_count} matched to live data
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="rounded-xl bg-blue-600 px-4 py-2 text-lg font-black text-white tabular-nums">
                              {owner.total_points}
                            </span>
                            <span className="text-sm font-bold text-slate-400 group-open:rotate-180">
                              ▼
                            </span>
                          </div>
                        </summary>

                        <div className="border-t border-slate-200 bg-white px-5 pb-5 pt-4">
                          {owner.players.length === 0 ? (
                            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                              This owner has no auctioned players.
                            </p>
                          ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                              <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                  <tr>
                                    {[
                                      "Player",
                                      "Team",
                                      "Runs",
                                      "Wickets",
                                      "Catches",
                                      "Match Points",
                                    ].map((heading) => (
                                      <th
                                        key={heading}
                                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                                      >
                                        {heading}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                  {owner.players.map((player) => (
                                    <tr key={player.team_player_id}>
                                      <td className="whitespace-nowrap px-4 py-3 text-sm font-bold">
                                        {player.player_name}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                                        {player.ipl_team}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums">
                                        {player.runs}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums">
                                        {player.wickets}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums">
                                        {player.catches}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3">
                                        <span
                                          className={`inline-flex min-w-14 justify-center rounded-lg px-3 py-1.5 text-sm font-black tabular-nums ${
                                            player.match_points
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-slate-100 text-slate-500"
                                          }`}
                                        >
                                          {player.match_points}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
