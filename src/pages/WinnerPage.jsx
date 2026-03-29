import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useParams, Link } from 'react-router-dom'

export default function WinnerPage() {
  const { leagueId } = useParams()
  const [winners, setWinners] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchWinners()
  }, [leagueId])

  const fetchWinners = async () => {
    try {
      setMessage('')

      const { data, error } = await supabase
        .from('team_players')
        .select('*, league_members(user_name), players(player_name)')
        .eq('league_id', leagueId)

      if (error) throw error

      setWinners(data || [])
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-green-100 p-6">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-3xl font-bold text-black">🏆 Auction Results</h1>

        {message && (
          <p className="mb-4 text-red-600">{message}</p>
        )}

        {winners.length === 0 ? (
          <p className="text-gray-700">No auction results found.</p>
        ) : (
          <div className="space-y-3">
            {winners.map((w) => (
              <div key={w.id} className="rounded border p-3">
                <p className="text-black">
                  <b>{w.players?.player_name}</b>
                </p>
                <p className="text-black">Owner: {w.league_members?.user_name}</p>
                <p className="text-black">Price: {w.purchase_price}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/league/${leagueId}`}
            className="inline-block rounded bg-blue-600 px-4 py-2 text-white"
          >
            Back to Lobby
          </Link>

          <button
            onClick={() => {
              localStorage.removeItem('auction_user')
              localStorage.removeItem('joined_league')
              window.location.href = '/'
            }}
            className="rounded bg-red-600 px-4 py-2 text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}