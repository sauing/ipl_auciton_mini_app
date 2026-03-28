import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function LeagueLobby() {
  const { leagueId } = useParams()
  const navigate = useNavigate()

  const [league, setLeague] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  const fetchLeagueData = useCallback(async () => {
    try {
      setLoading(true)
      setMessage('')

      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single()

      if (leagueError) throw leagueError

      const { data: memberData, error: memberError } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId)
        .order('joined_at', { ascending: true })

      if (memberError) throw memberError

      const storedUser = localStorage.getItem('auction_user')
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser))
      }

      setLeague(leagueData)
      setMembers(memberData || [])
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchLeagueData()
  }, [fetchLeagueData])

  useEffect(() => {
    const checkAuctionState = async () => {
      const { data, error } = await supabase
        .from('auction_state')
        .select('*')
        .eq('league_id', leagueId)
        .maybeSingle()

      if (error) {
        console.error('Auction state fetch error:', error)
        return
      }

      // ONLY redirect when auction is actually live
      if (data?.status === 'live') {
        navigate(`/auction/${leagueId}`)
        return
      }

      if (data?.status === 'finished') {
        navigate(`/winner/${leagueId}`)
      }
    }

    checkAuctionState()

    const auctionChannel = supabase
      .channel(`league-lobby-auction-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auction_state',
          filter: `league_id=eq.${leagueId}`,
        },
        (payload) => {
          const updatedAuction = payload.new

          // ONLY redirect when auction becomes live
          if (updatedAuction?.status === 'live') {
            navigate(`/auction/${leagueId}`)
            return
          }

          if (updatedAuction?.status === 'finished') {
            navigate(`/winner/${leagueId}`)
          }
        }
      )
      .subscribe()

    const memberChannel = supabase
      .channel(`league-lobby-members-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'league_members',
          filter: `league_id=eq.${leagueId}`,
        },
        () => {
          fetchLeagueData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(auctionChannel)
      supabase.removeChannel(memberChannel)
    }
  }, [leagueId, navigate, fetchLeagueData])

  const handleStartAuction = async () => {
    try {
      setMessage('')

      if (currentUser?.role !== 'admin') {
        setMessage('Only admin can start the auction')
        return
      }

      const { data: auctionData, error: auctionError } = await supabase
        .from('auction_state')
        .select('*')
        .eq('league_id', leagueId)
        .maybeSingle()

      if (auctionError) throw auctionError

      if (auctionData?.status === 'live') {
        setMessage('Auction is already live')
        return
      }

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('is_sold', false)
        .order('base_price', { ascending: false })

      if (playerError) throw playerError

      const nextPlayer = playerData?.[0]

      if (!nextPlayer) {
        setMessage('No players left to auction')
        return
      }

      if (auctionData) {
        const { error: updateError } = await supabase
          .from('auction_state')
          .update({
            current_player_id: nextPlayer.id,
            current_bid: nextPlayer.base_price,
            current_bidder_id: null,
            status: 'live',
            expires_at: new Date(Date.now() + 15000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', auctionData.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
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

        if (insertError) throw insertError
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading league...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">
              {league?.league_name || 'League Lobby'}
            </h1>
            <p className="mt-1 text-gray-600">
              Join Code: <span className="font-semibold">{league?.join_code}</span>
            </p>

            {currentUser && (
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  Logged in as: {currentUser.name}
                </span>

                <span
                  className={`rounded px-3 py-1 text-sm font-semibold ${
                    currentUser.role === 'admin'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {currentUser.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={handleStartAuction}
                  className="rounded bg-red-600 px-4 py-2 text-white"
                >
                  Start Auction
                </button>

                <Link
                  to="/auction-setup"
                  className="rounded bg-purple-600 px-4 py-2 text-white"
                >
                  Auction Setup
                </Link>
              </>
            )}

            <Link
              to={`/league/${leagueId}/leaderboard`}
              className="rounded bg-yellow-600 px-4 py-2 text-white"
            >
              Leaderboard
            </Link>

            <Link
              to={`/league/${leagueId}/winner`}
              className="rounded bg-green-700 px-4 py-2 text-white"
            >
              Winner Screen
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem('auction_user')
                localStorage.removeItem('joined_league')
                window.location.href = '/'
              }}
              className="rounded bg-gray-700 px-4 py-2 text-white"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">
            Members ({members.length})
          </h2>
        </div>

        {message && <p className="mb-4 text-red-600">{message}</p>}

        {members.length === 0 ? (
          <p className="text-gray-600">No members joined yet.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member, index) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">
                      {index + 1}. {member.user_name}
                    </p>

                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        member.role === 'admin'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    Budget: {member.budget_remaining}
                  </p>
                </div>

                <Link
                  to={`/league/${leagueId}/team/${member.id}`}
                  className="rounded bg-green-600 px-3 py-1 text-sm text-white"
                >
                  View Team
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}