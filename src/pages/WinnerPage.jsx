import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useParams, Link } from 'react-router-dom'

export default function WinnerPage() {
  const { leagueId } = useParams()
  const [winners, setWinners] = useState([])

  useEffect(() => {
    fetchWinners()
  }, [])

  const fetchWinners = async () => {
    const { data } = await supabase
      .from('team_players')
      .select('*, league_members(user_name), players(player_name)')
      .eq('league_id', leagueId)

    setWinners(data || [])
  }

  return (
    <div className="min-h-screen bg-green-100 p-6">
      <div className="mx-auto max-w-3xl bg-white p-6 rounded-xl shadow">
        <h1 className="text-3xl font-bold mb-4">🏆 Auction Results</h1>

        {winners.map((w) => (
          <div key={w.id} className="border p-3 mb-2 rounded">
            <p><b>{w.players.player_name}</b></p>
            <p>Owner: {w.league_members.user_name}</p>
            <p>Price: {w.purchase_price}</p>
          </div>
        ))}

        <Link
          to="/"
          className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}