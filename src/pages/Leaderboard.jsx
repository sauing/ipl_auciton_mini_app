import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Leaderboard() {
  const { leagueId } = useParams()

  const [members, setMembers] = useState([])
  const [teamPlayers, setTeamPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  const fetchLeaderboardData = async () => {
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
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const leaderboardData = members
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
      return a.budget_remaining - b.budget_remaining
    })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading leaderboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Leaderboard</h1>
            <p className="mt-1 text-gray-600">League ranking overview</p>
          </div>

          <Link
            to={`/league/${leagueId}`}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Back to Lobby
          </Link>
        </div>

        {message && (
          <p className="mb-4 text-red-600">{message}</p>
        )}

        {leaderboardData.length === 0 ? (
          <p className="text-gray-600">No members found.</p>
        ) : (
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
                {leaderboardData.map((member, index) => (
                  <tr key={member.id}>
                    <td className="border px-4 py-2 text-black font-semibold">
                      #{index + 1}
                    </td>
                    <td className="border px-4 py-2 text-black">
                      {member.user_name}
                    </td>
                    <td className="border px-4 py-2 text-black">
                      {member.playersBought}
                    </td>
                    <td className="border px-4 py-2 text-black">
                      {member.totalSpent}
                    </td>
                    <td className="border px-4 py-2 text-black">
                      {member.budget_remaining}
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