import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function TeamPage() {
  const { leagueId, memberId } = useParams()

  const [member, setMember] = useState(null)
  const [teamPlayers, setTeamPlayers] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeamData()
  }, [leagueId, memberId])

  const fetchTeamData = async () => {
    try {
      setLoading(true)
      setMessage('')

      const { data: memberData, error: memberError } = await supabase
        .from('league_members')
        .select('*')
        .eq('id', memberId)
        .single()

      if (memberError) throw memberError

      const { data: teamData, error: teamError } = await supabase
        .from('team_players')
        .select(`
          id,
          player_id,
          purchase_price,
          players (
            player_name,
            ipl_team,
            role_type
          )
        `)
        .eq('league_id', leagueId)
        .eq('member_id', memberId)

      if (teamError) throw teamError

      const teamRows = teamData || []
      const playerIds = teamRows.map((item) => item.player_id)

      let statsMap = {}

      if (playerIds.length > 0) {
        const { data: statsData, error: statsError } = await supabase
          .from('player_match_stats')
          .select('*')
          .in('player_id', playerIds)

        if (statsError) throw statsError

        for (const stat of statsData || []) {
          const playerId = stat.player_id
          const points = Number(stat.fantasy_points || 0)

          if (!statsMap[playerId]) {
            statsMap[playerId] = 0
          }

          statsMap[playerId] += points
        }
      }

      const finalTeamPlayers = teamRows.map((item) => ({
        ...item,
        fantasy_points: statsMap[item.player_id] || 0,
      }))

      setMember(memberData)
      setTeamPlayers(finalTeamPlayers)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const totalSpent = teamPlayers.reduce((sum, item) => sum + item.purchase_price, 0)
  const totalFantasyPoints = teamPlayers.reduce(
    (sum, item) => sum + item.fantasy_points,
    0
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading team...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">
              {member?.user_name}&apos;s Team
            </h1>
            <p className="mt-1 text-gray-600">
              Remaining Budget: <span className="font-semibold">{member?.budget_remaining}</span>
            </p>
            <p className="text-gray-600">
              Total Spent: <span className="font-semibold">{totalSpent}</span>
            </p>
            <p className="text-gray-600">
              Total Fantasy Points:{' '}
              <span className="font-semibold text-green-700">{totalFantasyPoints}</span>
            </p>
          </div>

          <Link
            to="/"
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Back to Home
          </Link>
        </div>

        {message && <p className="mb-4 text-red-600">{message}</p>}

        {teamPlayers.length === 0 ? (
          <p className="text-gray-600">No players bought yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2 text-left text-black">Player</th>
                  <th className="border px-4 py-2 text-left text-black">IPL Team</th>
                  <th className="border px-4 py-2 text-left text-black">Role</th>
                  <th className="border px-4 py-2 text-left text-black">Price</th>
                  <th className="border px-4 py-2 text-left text-black">Fantasy Points</th>
                </tr>
              </thead>
              <tbody>
                {teamPlayers.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-4 py-2 text-black">
                      {item.players?.player_name}
                    </td>
                    <td className="border px-4 py-2 text-black">
                      {item.players?.ipl_team}
                    </td>
                    <td className="border px-4 py-2 text-black">
                      {item.players?.role_type}
                    </td>
                    <td className="border px-4 py-2 text-black">
                      {item.purchase_price}
                    </td>
                    <td className="border px-4 py-2 font-semibold text-green-700">
                      {item.fantasy_points}
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