import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AuctionRoom() {
  const { leagueId } = useParams()
  const navigate = useNavigate()

  const [players, setPlayers] = useState([])
  const [members, setMembers] = useState([])
  const [auction, setAuction] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    fetchInitialData()

    const channel = supabase
    .channel(`auction-room-${leagueId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'auction_state',
        filter: `league_id=eq.${leagueId}`,
      },
      () => {
        fetchInitialData()
      }
    )
    .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leagueId])

  useEffect(() => {
    if (!auction?.expires_at) return

    const interval = setInterval(() => {
      const diff =
        new Date(auction.expires_at).getTime() - new Date().getTime()

      setTimeLeft(Math.max(0, Math.floor(diff / 1000)))
    }, 1000)

    return () => clearInterval(interval)
  }, [auction])

  useEffect(() => {
    if (timeLeft === 0 && auction?.status === 'live' && currentUser?.role === 'admin') {
      markSold()
    }
  }, [timeLeft, auction, currentUser])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      setMessage('')

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .order('base_price', { ascending: false })

      if (playerError) throw playerError

      const { data: memberData, error: memberError } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId)

      if (memberError) throw memberError

      const { data: auctionData, error: auctionError } = await supabase
        .from('auction_state')
        .select('*')
        .eq('league_id', leagueId)
        .maybeSingle()

      if (auctionError) throw auctionError

      const storedUser = localStorage.getItem('auction_user')
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser))
      }

      setPlayers(playerData || [])
      setMembers(memberData || [])
      setAuction(auctionData || null)
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const startAuction = async () => {
    try {
      setMessage('')

      const nextPlayer = players.find((p) => !p.is_sold)

      if (!nextPlayer) {
        setMessage('No players left')
        navigate(`/winner/${leagueId}`)
        return
      }

      if (auction) {
        const { data, error } = await supabase
          .from('auction_state')
          .update({
            current_player_id: nextPlayer.id,
            current_bid: nextPlayer.base_price,
            current_bidder_id: null,
            status: 'live',
            expires_at: new Date(Date.now() + 15000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', auction.id)
          .select()

        if (error) throw error
        setAuction(data[0])
      } else {
        const { data, error } = await supabase
          .from('auction_state')
          .insert([
            {
              league_id: leagueId,
              current_player_id: nextPlayer.id,
              current_bid: nextPlayer.base_price,
              current_bidder_id: null,
              status: 'live',
              expires_at: new Date(Date.now() + 15000).toISOString(),
            },
          ])
          .select()

        if (error) throw error
        setAuction(data[0])
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  const placeBid = async (member) => {
    try {
      if (!auction) return

      if (currentUser?.memberId !== member.id) {
        setMessage('You can only bid for yourself')
        return
      }

      if (auction.status !== 'live') {
        setMessage('Bidding is closed for this player')
        return
      }

      const newBid = auction.current_bid + 1

      if (member.budget_remaining < newBid) {
        setMessage(`${member.user_name} does not have enough budget`)
        return
      }

      const { error } = await supabase
        .from('auction_state')
        .update({
          current_bid: newBid,
          current_bidder_id: member.id,
          expires_at: new Date(Date.now() + 15000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', auction.id)

      if (error) throw error

      setAuction({
        ...auction,
        current_bid: newBid,
        current_bidder_id: member.id,
        expires_at: new Date(Date.now() + 15000).toISOString(),
      })

      setMessage('')
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  const markSold = async () => {
    try {
      if (!auction || !auction.current_player_id || !auction.current_bidder_id) {
        setMessage('No valid bidder to mark as sold')
        return
      }

      if (auction.status === 'sold') {
        setMessage('⚠️ This player is already sold')
        return
      }

      const { data: existingSale, error: existingSaleError } = await supabase
        .from('team_players')
        .select('*')
        .eq('league_id', leagueId)
        .eq('player_id', auction.current_player_id)
        .maybeSingle()

      if (existingSaleError) throw existingSaleError

      if (existingSale) {
        setMessage('⚠️ This player is already sold')
        return
      }

      const winningMember = members.find((m) => m.id === auction.current_bidder_id)

      if (!winningMember) {
        setMessage('Winning member not found')
        return
      }

      const newBudget = winningMember.budget_remaining - auction.current_bid

      if (newBudget < 0) {
        setMessage('Budget cannot go below zero')
        return
      }

      const { error: insertTeamError } = await supabase
        .from('team_players')
        .insert([
          {
            league_id: leagueId,
            member_id: auction.current_bidder_id,
            player_id: auction.current_player_id,
            purchase_price: auction.current_bid,
          },
        ])

      if (insertTeamError) throw insertTeamError

      const { error: updateMemberError } = await supabase
        .from('league_members')
        .update({
          budget_remaining: newBudget,
        })
        .eq('id', auction.current_bidder_id)

      if (updateMemberError) throw updateMemberError

      const { error: updatePlayerError } = await supabase
        .from('players')
        .update({
          is_sold: true,
        })
        .eq('id', auction.current_player_id)

      if (updatePlayerError) throw updatePlayerError

      const { error: updateAuctionError } = await supabase
        .from('auction_state')
        .update({
          status: 'sold',
          updated_at: new Date().toISOString(),
        })
        .eq('id', auction.id)

      if (updateAuctionError) throw updateAuctionError

      setMessage('Player marked as sold successfully')
      await fetchInitialData()
    } catch (error) {
      if (error.message.includes('unique_league_player')) {
        setMessage('⚠️ This player is already sold')
      } else {
        setMessage(`Error: ${error.message}`)
      }
    }
  }

  const nextPlayer = async () => {
    try {
      if (!auction) return

      const availablePlayers = players.filter(
        (p) => !p.is_sold && p.id !== auction.current_player_id
      )

      const next = availablePlayers[0]

      if (!next) {
        await supabase
          .from('auction_state')
          .update({
            status: 'finished',
            updated_at: new Date().toISOString(),
          })
          .eq('id', auction.id)

        navigate(`/winner/${leagueId}`)
        return
      }

      const { data, error } = await supabase
        .from('auction_state')
        .update({
          current_player_id: next.id,
          current_bid: next.base_price,
          current_bidder_id: null,
          status: 'live',
          expires_at: new Date(Date.now() + 15000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', auction.id)
        .select()

      if (error) throw error

      setAuction(data[0])
      setMessage('')
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  const currentPlayer = players.find((p) => p.id === auction?.current_player_id)
  const currentBidder = members.find((m) => m.id === auction?.current_bidder_id)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading auction...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">Auction Room</h1>

          <div className="flex gap-3">
            <Link
              to={`/league/${leagueId}`}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Go to Lobby
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem('auction_user')
                window.location.href = '/'
              }}
              className="rounded bg-red-600 px-4 py-2 text-white"
            >
              Logout
            </button>
          </div>
        </div>

        {!auction ? (
          currentUser?.role === 'admin' ? (
            <button
              onClick={startAuction}
              className="rounded bg-green-600 px-6 py-3 text-white"
            >
              Start Auction
            </button>
          ) : (
            <p className="text-black">Waiting for admin to start auction...</p>
          )
        ) : (
          <>
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h2 className="text-xl font-bold text-black">
                Player: {currentPlayer?.player_name || 'No player'}
              </h2>
              <p className="text-black">Team: {currentPlayer?.ipl_team}</p>
              <p className="text-black">Role: {currentPlayer?.role_type}</p>
              <p className="text-black">Base Price: {currentPlayer?.base_price}</p>

              <p className="mt-2 text-lg font-semibold text-black">
                Current Bid: {auction.current_bid}
              </p>

              <p className="text-lg font-bold text-red-600">
                Time Left: {timeLeft}s
              </p>

              <p className="text-black">
                Leading: {currentBidder?.user_name || 'No one'}
              </p>

              <p className="text-black">
                Status: {auction.status}
              </p>

              {auction?.status === 'finished' && (
                <p className="mt-2 text-lg font-bold text-green-600">
                  🎉 Auction Completed
                </p>
              )}
            </div>

            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold text-black">Members</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {members.map((member) => {
                  const isCurrentUser = currentUser?.memberId === member.id

                  return (
                    <div
                      key={member.id}
                      className={`rounded p-3 text-white ${
                        isCurrentUser ? 'bg-blue-600' : 'bg-gray-500'
                      }`}
                    >
                      <div className="font-semibold">{member.user_name}</div>
                      <div className="mb-2 text-sm">Budget: {member.budget_remaining}</div>

                      {isCurrentUser ? (
                        <button
                          onClick={() => placeBid(member)}
                          className="rounded bg-white px-3 py-1 font-semibold text-blue-700"
                        >
                          Place My Bid
                        </button>
                      ) : (
                        <div className="text-sm opacity-90">Only this user can bid</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {currentUser?.role === 'admin' && (
              <div className="flex gap-3">
                <button
                  onClick={markSold}
                  className="rounded bg-red-600 px-4 py-2 text-white"
                >
                  Mark Sold
                </button>

                <button
                  onClick={nextPlayer}
                  className="rounded bg-purple-600 px-4 py-2 text-white"
                >
                  Next Player
                </button>
              </div>
            )}
          </>
        )}

        {message && <p className="mt-4 font-medium text-red-600">{message}</p>}
      </div>
    </div>
  )
}
