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
  }, [])

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

      setMember(memberData)
      setTeamPlayers(teamData || [])
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const totalSpent = teamPlayers.reduce((sum, item) => sum + item.purchase_price, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading team...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">
              {member?.user_name}'s Team
            </h1>
            <p className="mt-1 text-gray-600">
              Remaining Budget: <span className="font-semibold">{member?.budget_remaining}</span>
            </p>
            <p className="text-gray-600">
              Total Spent: <span className="font-semibold">{totalSpent}</span>
            </p>
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