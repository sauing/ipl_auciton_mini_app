import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function WinnerPage() {
  const { leagueId } = useParams()

  const [winner, setWinner] = useState(null)
  const [members, setMembers] = useState([])
  const [teamPlayers, setTeamPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchWinnerData()
  }, [leagueId])

  const fetchWinnerData = async () => {
    try {
      setLoading(true)
      setMessage('')

      const { data: membersData, error: membersError } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId)

      if (membersError) throw membersError

      const { data: teamData, error: teamError } = await supabase
        .from('team_players')
        .select('*')
        .eq('league_id', leagueId)

      if (teamError) throw teamError

      setMembers(membersData || [])
      setTeamPlayers(teamData || [])

      const ranked = (membersData || [])
        .map((member) => {
          const memberPlayers = (teamData || []).filter(
            (player) => player.member_id === member.id
          )

          const totalSpent = memberPlayers.reduce(
            (sum, player) => sum + player.purchase_price,
            0
          )

          return {
            ...member,
            playersBought: memberPlayers.length,
            totalSpent,
          }
        })
        .sort((a, b) => {
          if (b.playersBought !== a.playersBought) {
            return b.playersBought - a.playersBought
          }
          return b.totalSpent - a.totalSpent
        })

      setWinner(ranked[0] || null)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading winner...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-yellow-50 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black">🏆 Winner Screen</h1>
          <p className="mt-2 text-gray-600">Auction result for this league</p>
        </div>

        {message && <p className="mt-4 text-red-600">{message}</p>}

        {winner ? (
          <div className="mt-8 rounded-xl border border-yellow-300 bg-yellow-100 p-6 text-center">
            <h2 className="text-3xl font-bold text-black">{winner.user_name}</h2>
            <p className="mt-3 text-lg text-black">
              Players Bought: <span className="font-semibold">{winner.playersBought}</span>
            </p>
            <p className="text-lg text-black">
              Total Spent: <span className="font-semibold">{winner.totalSpent}</span>
            </p>
            <p className="text-lg text-black">
              Remaining Budget: <span className="font-semibold">{winner.budget_remaining}</span>
            </p>
          </div>
        ) : (
          <p className="mt-8 text-center text-gray-600">No winner data available.</p>
        )}

        <div className="mt-8">
          <h3 className="mb-4 text-2xl font-semibold text-black">All Members</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2 text-left text-black">Rank</th>
                  <th className="border px-4 py-2 text-left text-black">Member</th>
                  <th className="border px-4 py-2 text-left text-black">Players Bought</th>
                  <th className="border px-4 py-2 text-left text-black">Total Spent</th>
                  <th className="border px-4 py-2 text-left text-black">Remaining Budget</th>
                </tr>
              </thead>
              <tbody>
                {members
                  .map((member) => {
                    const memberPlayers = teamPlayers.filter(
                      (player) => player.member_id === member.id
                    )

                    const totalSpent = memberPlayers.reduce(
                      (sum, player) => sum + player.purchase_price,
                      0
                    )

                    return {
                      ...member,
                      playersBought: memberPlayers.length,
                      totalSpent,
                    }
                  })
                  .sort((a, b) => {
                    if (b.playersBought !== a.playersBought) {
                      return b.playersBought - a.playersBought
                    }
                    return b.totalSpent - a.totalSpent
                  })
                  .map((member, index) => (
                    <tr key={member.id}>
                      <td className="border px-4 py-2 text-black font-semibold">#{index + 1}</td>
                      <td className="border px-4 py-2 text-black">{member.user_name}</td>
                      <td className="border px-4 py-2 text-black">{member.playersBought}</td>
                      <td className="border px-4 py-2 text-black">{member.totalSpent}</td>
                      <td className="border px-4 py-2 text-black">{member.budget_remaining}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            to={`/league/${leagueId}`}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Back to Lobby
          </Link>

          <Link
            to={`/league/${leagueId}/leaderboard`}
            className="rounded bg-yellow-600 px-4 py-2 text-white"
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  )
}