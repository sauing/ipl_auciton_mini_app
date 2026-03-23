import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function AuctionSetup() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      setMessage('')

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('base_price', { ascending: false })

      if (error) throw error

      setPlayers(data || [])
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-black">Auction Setup</h1>
        <p className="mb-6 text-gray-600">
          Review players before starting the auction.
        </p>

        {message && <p className="mb-4 text-red-600">{message}</p>}

        {loading ? (
          <p className="text-lg text-black">Loading players...</p>
        ) : players.length === 0 ? (
          <p className="text-gray-600">No players found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2 text-left text-black">Player</th>
                  <th className="border px-4 py-2 text-left text-black">IPL Team</th>
                  <th className="border px-4 py-2 text-left text-black">Role</th>
                  <th className="border px-4 py-2 text-left text-black">Base Price</th>
                  <th className="border px-4 py-2 text-left text-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id}>
                    <td className="border px-4 py-2 text-black">{player.player_name}</td>
                    <td className="border px-4 py-2 text-black">{player.ipl_team}</td>
                    <td className="border px-4 py-2 text-black">{player.role_type}</td>
                    <td className="border px-4 py-2 text-black">{player.base_price}</td>
                    <td className="border px-4 py-2 text-black">
                      {player.is_sold ? 'Sold' : 'Available'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}