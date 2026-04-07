import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";

const BID_TIME_SECONDS = 15;

export default function AuctionRoom() {
  const { leagueId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [auction, setAuction] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingNextPlayer, setProcessingNextPlayer] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const finishHandledRef = useRef(false);

  const auctionUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auction_user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const currentMemberId = auctionUser?.memberId || null;
  const isAdmin = auctionUser?.role === "admin";

  useEffect(() => {
    if (!leagueId) return;
    loadAuctionRoom();
  }, [leagueId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!leagueId) return;

    const channel = supabase
      .channel(`auction-room-${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_state",
          filter: `league_id=eq.${leagueId}`,
        },
        async () => {
          await loadAuctionRoom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId]);

  useEffect(() => {
    if (!auction || !isAdmin) return;
    if (auction.status !== "live") return;
    if (!auction.current_player_id) return;

    const timeLeft = getTimeLeftSeconds(auction.expires_at);

    if (timeLeft <= 0) {
      if (!finishHandledRef.current) {
        finishHandledRef.current = true;
        handleTimerFinished();
      }
    } else {
      finishHandledRef.current = false;
    }
  }, [auction, isAdmin, nowMs]);

  async function loadAuctionRoom() {
    try {
      setLoading(true);
      setMessage("");
      await Promise.all([
        loadPlayers(),
        loadMembers(),
        loadTeamPlayers(),
        loadAuctionStateOnly(),
      ]);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Failed to load auction room");
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayers() {
    const { data, error } = await supabase
      .from("league_players")
      .select(`
        id,
        player_id,
        base_price,
        is_sold,
        is_unsold,
        sold_to_member_id,
        sold_price,
        added_at,
        players (
          id,
          player_name,
          ipl_team,
          role_type,
          base_price
        )
      `)
      .eq("league_id", leagueId)
      .eq("is_sold", false)
      .order("added_at", { ascending: true });

    if (error) throw error;

    const formatted = (data || []).map((row) => ({
      league_player_id: row.id,
      id: row.players?.id,
      player_name: row.players?.player_name || "Unknown Player",
      team: row.players?.ipl_team || "-",
      role: row.players?.role_type || "-",
      base_price: row.base_price ?? row.players?.base_price ?? 0,
    }));

    setPlayers(formatted);
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from("league_members")
      .select("id, user_name, budget_total, budget_remaining, role")
      .eq("league_id", leagueId)
      .order("joined_at", { ascending: true });

    if (error) throw error;
    setMembers(data || []);
  }

  async function loadTeamPlayers() {
    const { data, error } = await supabase
      .from("team_players")
      .select(`
        member_id,
        player_id,
        purchase_price,
        players (
          player_name
        )
      `)
      .eq("league_id", leagueId);

    if (error) throw error;

    setTeamPlayers(data || []);
  }

  async function getAuctionState() {
    const { data, error } = await supabase
      .from("auction_state")
      .select("*")
      .eq("league_id", leagueId)
      .single();

    if (error) {
      console.error("Auction state fetch error:", error);
      return null;
    }

    return data;
  }

  async function loadCurrentPlayer(playerId) {
    if (!playerId) {
      setCurrentPlayer(null);
      return;
    }

    const { data, error } = await supabase
      .from("players")
      .select("id, player_name, ipl_team, role_type, base_price")
      .eq("id", playerId)
      .single();

    if (error) {
      console.error("Current player load error:", error);
      setCurrentPlayer(null);
      return;
    }

    setCurrentPlayer({
      id: data.id,
      player_name: data.player_name,
      team: data.ipl_team,
      role: data.role_type,
      base_price: data.base_price,
    });
  }

  async function loadAuctionStateOnly() {
    const state = await getAuctionState();
    if (!state) return;

    setAuction(state);
    await loadCurrentPlayer(state.current_player_id);
  }

  function getExpiresAtIso(secondsFromNow = BID_TIME_SECONDS) {
    return new Date(Date.now() + secondsFromNow * 1000).toISOString();
  }

  function getTimeLeftSeconds(expiresAt) {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - nowMs;
    return Math.max(0, Math.ceil(diff / 1000));
  }

  async function loadNextAvailablePlayer() {
    const { data: unsoldRows, error: unsoldError } = await supabase
      .from("league_players")
      .select(`
        id,
        player_id,
        base_price,
        players (
          id,
          player_name,
          ipl_team,
          role_type,
          base_price
        )
      `)
      .eq("league_id", leagueId)
      .eq("is_sold", false)
      .order("added_at", { ascending: true });

    if (unsoldError) throw unsoldError;

    if (!unsoldRows || unsoldRows.length === 0) {
      const { error: closeError } = await supabase
        .from("auction_state")
        .update({
          current_player_id: null,
          current_bid: 0,
          current_highest_bid: 0,
          current_bidder_id: null,
          current_highest_bidder_name: null,
          expires_at: null,
          status: "closed",
          auction_status: "closed",
        })
        .eq("league_id", leagueId);

      if (closeError) throw closeError;

      setCurrentPlayer(null);
      setMessage("Auction completed.");
      navigate(`/league/${leagueId}`);
      return;
    }

    const nextRow = unsoldRows[0];
    const nextBid = nextRow.base_price ?? nextRow.players?.base_price ?? 0;

    const { error: updateError } = await supabase
      .from("auction_state")
      .update({
        current_player_id: nextRow.player_id,
        current_bid: nextBid,
        current_highest_bid: nextBid,
        current_bidder_id: null,
        current_highest_bidder_name: null,
        expires_at: getExpiresAtIso(),
        status: "live",
        auction_status: "live",
      })
      .eq("league_id", leagueId);

    if (updateError) throw updateError;
  }

  async function startNextPlayer() {
    if (!isAdmin) {
      setMessage("Only admin can move to next player.");
      return;
    }

    if (processingNextPlayer) {
      setMessage("Please wait, already processing.");
      return;
    }

    try {
      setProcessingNextPlayer(true);
      setMessage("");

      await loadNextAvailablePlayer();
    } catch (error) {
      console.error("Next player error:", error);
      setMessage(error.message || "Failed to move to next player");
    } finally {
      setProcessingNextPlayer(false);
    }
  }

  async function handleTimerFinished() {
    if (!isAdmin) return;
    if (processingNextPlayer) return;

    try {
      setProcessingNextPlayer(true);

      const latest = await getAuctionState();
      if (!latest) return;
      if (latest.status !== "live") return;
      if (!latest.current_player_id) return;

      const latestTimeLeft = getTimeLeftSeconds(latest.expires_at);
      if (latestTimeLeft > 0) return;

      if (latest.current_bidder_id) {
        const { error: soldError } = await markPlayerSold(
          latest.current_player_id,
          latest.current_bidder_id,
          latest.current_bid || 0
        );

        if (soldError) throw soldError;
      } else {
        const { error: unsoldError } = await markCurrentPlayerUnsold(
          latest.current_player_id
        );

        if (unsoldError) throw unsoldError;
      }

      await loadNextAvailablePlayer();

      finishHandledRef.current = false;

      await Promise.all([
        loadAuctionStateOnly(),
        loadPlayers(),
        loadMembers(),
        loadTeamPlayers(),
      ]);
    } catch (error) {
      console.error("Timer finished error:", error);
      setMessage(error.message || "Failed to finish timer");
      finishHandledRef.current = false;
    } finally {
      setProcessingNextPlayer(false);
    }
  }

  async function markCurrentPlayerUnsold(playerId) {
    const { error } = await supabase
      .from("league_players")
      .update({
        is_sold: true,
        is_unsold: true,
        sold_to_member_id: null,
        sold_price: null,
      })
      .eq("league_id", leagueId)
      .eq("player_id", playerId)
      .eq("is_sold", false);

    return { error };
  }

  async function markPlayerSold(playerId, memberId, price) {
    const { error: updateLeaguePlayerError } = await supabase
      .from("league_players")
      .update({
        is_sold: true,
        is_unsold: false,
        sold_to_member_id: memberId,
        sold_price: price,
      })
      .eq("league_id", leagueId)
      .eq("player_id", playerId)
      .eq("is_sold", false);

    if (updateLeaguePlayerError) {
      return { error: updateLeaguePlayerError };
    }

    const { error: insertTeamPlayerError } = await supabase
      .from("team_players")
      .insert({
        league_id: leagueId,
        member_id: memberId,
        player_id: playerId,
        purchase_price: price,
      });

    if (insertTeamPlayerError) {
      return { error: insertTeamPlayerError };
    }

    const selectedMember = members.find((m) => m.id === memberId);
    const currentBudget = selectedMember?.budget_remaining || 0;

    const { error: budgetError } = await supabase
      .from("league_members")
      .update({
        budget_remaining: currentBudget - price,
      })
      .eq("id", memberId);

    if (budgetError) {
      return { error: budgetError };
    }

    return { error: null };
  }

  async function placeBid() {
    if (!auction || !currentMemberId) return;
    if (!auction.current_player_id) return;
    if (auction.status !== "live") return;

    try {
      setMessage("");

      const member = members.find((m) => m.id === currentMemberId);

      if (!member) {
        setMessage("Member not found.");
        return;
      }

      const nextBid = (auction.current_bid || 0) + 1;

      if ((member.budget_remaining ?? 0) < nextBid) {
        setMessage("Not enough budget.");
        return;
      }

      const { error } = await supabase
        .from("auction_state")
        .update({
          current_bid: nextBid,
          current_highest_bid: nextBid,
          current_bidder_id: currentMemberId,
          current_highest_bidder_name: member.user_name,
          expires_at: getExpiresAtIso(),
          status: "live",
          auction_status: "live",
        })
        .eq("league_id", leagueId)
        .eq("status", "live");

      if (error) throw error;

      await Promise.all([loadAuctionStateOnly(), loadMembers()]);
    } catch (error) {
      console.error("Bid error:", error);
      setMessage(error.message || "Failed to place bid");
    }
  }

  async function handleMarkSold() {
    if (!isAdmin || !auction?.current_player_id) return;

    try {
      setMessage("");

      if (!auction.current_bidder_id) {
        setMessage("No bidder yet. Use Mark Unsold or wait for bids.");
        return;
      }

      const { error } = await markPlayerSold(
        auction.current_player_id,
        auction.current_bidder_id,
        auction.current_bid || 0
      );

      if (error) throw error;

      await loadNextAvailablePlayer();

      await Promise.all([
        loadAuctionStateOnly(),
        loadPlayers(),
        loadMembers(),
        loadTeamPlayers(),
      ]);
    } catch (error) {
      console.error("Mark sold error:", error);
      setMessage(error.message || "Failed to mark player sold");
    }
  }

  async function handleMarkUnsold() {
    if (!isAdmin || !auction?.current_player_id) return;

    try {
      setMessage("");

      const { error } = await markCurrentPlayerUnsold(auction.current_player_id);

      if (error) throw error;

      await loadNextAvailablePlayer();

      await Promise.all([
        loadAuctionStateOnly(),
        loadPlayers(),
        loadMembers(),
        loadTeamPlayers(),
      ]);
    } catch (error) {
      console.error("Mark unsold error:", error);
      setMessage(error.message || "Failed to mark player unsold");
    }
  }

  function handleGoToLobby() {
    navigate(`/league/${leagueId}`);
  }

  function handleLogout() {
    localStorage.removeItem("auction_user");
    localStorage.removeItem("joined_league");
    navigate("/join");
  }

  function getPlayersBoughtCount(memberId) {
    return teamPlayers.filter((player) => player.member_id === memberId).length;
  }

  function getPlayersBoughtNames(memberId) {
    return teamPlayers
      .filter((player) => player.member_id === memberId)
      .map((player) => player.players?.player_name)
      .filter(Boolean);
  }

  const upcomingPlayers = players.slice(1, 4);
  const remainingPlayersCount = players.length;

  const leadingMember =
    members.find((m) => m.id === auction?.current_bidder_id) ||
    (auction?.current_highest_bidder_name
      ? { user_name: auction.current_highest_bidder_name }
      : null);

  const timeLeft = getTimeLeftSeconds(auction?.expires_at);

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-100">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">
          <p>Loading auction room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Auction Room</h1>

          <div className="flex gap-3">
            <button
              onClick={handleGoToLobby}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Lobby
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-gray-100 rounded-xl p-4 mb-8 min-h-[220px]">
          <h2 className="text-2xl font-bold mb-2">
            Player: {currentPlayer?.player_name || "Waiting..."}
          </h2>

          <p>Team: {currentPlayer?.team || "-"}</p>
          <p>Role: {currentPlayer?.role || "-"}</p>
          <p>Base Price: {currentPlayer?.base_price ?? 0}</p>

          <div className="mt-4">
            <p className="text-2xl font-semibold">
              Current Bid: {auction?.current_bid ?? 0}
            </p>

            <p className="text-red-600 text-3xl font-bold">
              Time Left: {timeLeft}s
            </p>

            <p>Leading: {leadingMember?.user_name || "No one"}</p>
            <p>Status: {auction?.status || "-"}</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-black">
              Upcoming Players
            </h3>

            <span className="text-sm text-gray-600">
              Remaining: {remainingPlayersCount}
            </span>
          </div>

          {upcomingPlayers.length === 0 ? (
            <p className="text-gray-600">No upcoming players</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {upcomingPlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-white rounded-lg border p-3 shadow-sm"
                >
                  <p className="font-semibold text-black">{player.player_name}</p>
                  <p className="text-sm text-gray-600">{player.team}</p>
                  <p className="text-sm text-gray-600">{player.role}</p>
                  <p className="text-sm font-medium text-blue-700">
                    Base: {player.base_price}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <h3 className="text-2xl font-semibold mb-4">Members</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {members.map((member) => {
            const isCurrentUser = member.id === currentMemberId;
            const boughtPlayerNames = getPlayersBoughtNames(member.id);

            return (
              <div
                key={member.id}
                className={`rounded-lg p-4 text-white ${
                  isCurrentUser ? "bg-blue-600" : "bg-gray-500"
                }`}
              >
                <p className="font-bold text-xl">{member.user_name}</p>
                <p>Budget: {member.budget_remaining ?? 0}</p>
                <p>Players Bought: {getPlayersBoughtCount(member.id)}</p>

                {isCurrentUser && boughtPlayerNames.length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="font-semibold">My Team:</p>
                    <ul className="ml-5 list-disc">
                      {boughtPlayerNames.map((name, index) => (
                        <li key={index}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {isCurrentUser ? (
                  <button
                    onClick={placeBid}
                    disabled={auction?.status !== "live"}
                    className="mt-3 bg-white text-blue-700 px-4 py-2 rounded font-medium disabled:opacity-50"
                  >
                    Place My Bid
                  </button>
                ) : (
                  <p className="mt-3 opacity-90">Only this user can bid</p>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="flex gap-3 mb-4 flex-wrap">
            <button
              onClick={handleMarkSold}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Mark Sold
            </button>

            <button
              onClick={handleMarkUnsold}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Mark Unsold
            </button>

            <button
              onClick={startNextPlayer}
              disabled={processingNextPlayer}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Next Player
            </button>
          </div>
        )}

        {message && <p className="text-red-600 font-medium">{message}</p>}
      </div>
    </div>
  );
}