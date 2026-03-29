import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function JoinLeague() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [joinedLeague, setJoinedLeague] = useState(null)
  const [auctionFinished, setAuctionFinished] = useState(false)

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('auction_user'))
    const storedLeague = JSON.parse(localStorage.getItem('joined_league'))

    if (storedUser && storedLeague && storedUser.leagueId === storedLeague.id) {
      setJoinedLeague(storedLeague)
      setMessage(`Welcome back to ${storedLeague.league_name}`)
    }
  }, [])

  useEffect(() => {
    if (!joinedLeague) return

    const checkAuction = async () => {
      const { data, error } = await supabase
        .from('auction_state')
        .select('status')
        .eq('league_id', joinedLeague.id)
        .maybeSingle()

      if (error) {
        console.error('Auction state fetch error:', error)
        return
      }

      setAuctionFinished(data?.status === 'finished')
    }

    checkAuction()
  }, [joinedLeague])

  const handleJoinLeague = async () => {
    if (!userName.trim() || !joinCode.trim()) {
      setMessage('Please enter your name and join code')
      return
    }

    try {
      setLoading(true)
      setMessage('')
      setJoinedLeague(null)
      setAuctionFinished(false)

      const cleanJoinCode = joinCode.trim().toUpperCase()
      const cleanUserName = userName.trim()

      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('join_code', cleanJoinCode)
        .single()

      if (leagueError || !leagueData) {
        setMessage('Invalid join code')
        return
      }

      const { data: existingMember, error: existingMemberError } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueData.id)
        .ilike('user_name', cleanUserName)
        .maybeSingle()

      if (existingMemberError) {
        throw existingMemberError
      }

      const { data: auctionData, error: auctionError } = await supabase
        .from('auction_state')
        .select('status')
        .eq('league_id', leagueData.id)
        .maybeSingle()

      if (auctionError) {
        throw auctionError
      }

      const isLeagueClosed = auctionData?.status === 'finished'

      if (existingMember) {
        localStorage.setItem(
          'auction_user',
          JSON.stringify({
            leagueId: leagueData.id,
            memberId: existingMember.id,
            name: existingMember.user_name,
            role: existingMember.role || 'member',
          })
        )

        localStorage.setItem(
          'joined_league',
          JSON.stringify({
            id: leagueData.id,
            league_name: leagueData.league_name,
            join_code: leagueData.join_code,
          })
        )

        setJoinedLeague({
          id: leagueData.id,
          league_name: leagueData.league_name,
          join_code: leagueData.join_code,
        })
        setAuctionFinished(isLeagueClosed)
        setMessage(`Welcome back, ${existingMember.user_name}`)
        setUserName('')
        setJoinCode('')
        return
      }

      if (isLeagueClosed) {
        setMessage('League is closed. New users cannot join now.')
        return
      }

      const { data: newMember, error: memberError } = await supabase
        .from('league_members')
        .insert([
          {
            league_id: leagueData.id,
            user_name: cleanUserName,
          },
        ])
        .select()

      if (memberError) throw memberError

      localStorage.setItem(
        'auction_user',
        JSON.stringify({
          leagueId: leagueData.id,
          memberId: newMember[0].id,
          name: cleanUserName,
          role: newMember[0].role || 'member',
        })
      )

      localStorage.setItem(
        'joined_league',
        JSON.stringify({
          id: leagueData.id,
          league_name: leagueData.league_name,
          join_code: leagueData.join_code,
        })
      )

      setJoinedLeague({
        id: leagueData.id,
        league_name: leagueData.league_name,
        join_code: leagueData.join_code,
      })
      setMessage(`Joined league successfully: ${leagueData.league_name}`)
      setUserName('')
      setJoinCode('')
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyan-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-black">Join League</h1>

        <input
          type="text"
          placeholder="Enter your name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 p-3 text-black outline-none"
        />

        <input
          type="text"
          placeholder="Enter join code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 p-3 uppercase text-black outline-none"
        />

        <button
          onClick={handleJoinLeague}
          disabled={loading}
          className="w-full rounded bg-green-600 px-4 py-3 text-white disabled:bg-gray-400"
        >
          {loading ? 'Joining...' : 'Join League'}
        </button>

        {message && (
          <p className="mt-4 text-sm font-medium text-black">{message}</p>
        )}

        {joinedLeague && (
          <div className="mt-4 space-y-3">
            {auctionFinished ? (
              <button
                disabled
                className="block w-full cursor-not-allowed rounded bg-gray-400 px-4 py-3 text-center text-white"
              >
                League Lobby (Closed)
              </button>
            ) : (
              <Link
                to={`/league/${joinedLeague.id}`}
                className="block rounded bg-black px-4 py-3 text-center text-white"
              >
                Go to League Lobby
              </Link>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => navigate(`/fantasy-import/${joinedLeague.id}`)}
                className="rounded bg-green-700 px-4 py-3 text-white"
              >
                Fantasy Import
              </button>

              <button
                onClick={() => navigate(`/leaderboard`)}
                className="rounded bg-indigo-600 px-4 py-3 text-white"
              >
                Fantasy Leaderboard
              </button>
            </div>

            <button
              onClick={() => {
                const storedUser = JSON.parse(localStorage.getItem('auction_user'))
                if (storedUser?.memberId) {
                  navigate(`/league/${joinedLeague.id}/team/${storedUser.memberId}`)
                }
              }}
              className="w-full rounded bg-purple-600 px-4 py-3 text-white"
            >
              My Fantasy Team
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('auction_user')
                localStorage.removeItem('joined_league')
                setJoinedLeague(null)
                setAuctionFinished(false)
                setMessage('Logged out successfully')
              }}
              className="w-full rounded bg-red-600 px-4 py-3 text-white"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}