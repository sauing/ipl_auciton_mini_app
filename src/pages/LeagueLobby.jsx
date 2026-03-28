import { useEffect, useState } from 'react'
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

  useEffect(() => {
    fetchLeagueData()
  }, [leagueId])

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

      if (data?.status === 'live' || data?.status === 'sold') {
        navigate(`/auction/${leagueId}`)
        return
      }

      if (data?.status === 'finished') {
        navigate(`/winner/${leagueId}`)
      }
    }

    checkAuctionState()

    const channel = supabase
      .channel(`league-lobby-${leagueId}`)
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

          if (updatedAuction?.status === 'live' || updatedAuction?.status === 'sold') {
            navigate(`/auction/${leagueId}`)
            return
          }

          if (updatedAuction?.status === 'finished') {
            navigate(`/winner/${leagueId}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leagueId, navigate])

  const fetchLeagueData = async () => {
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
                <Link
                  to={`/auction/${leagueId}`}
                  className="rounded bg-red-600 px-4 py-2 text-white"
                >
                  Start Auction
                </Link>

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
