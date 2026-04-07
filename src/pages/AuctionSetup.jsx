import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { eccAuctionPlayers } from '../utils/eccAuctionPlayers'

export default function AuctionSetup() {
  const { leagueId } = useParams()

  const [league, setLeague] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [seedingPlayers, setSeedingPlayers] = useState(false)

  useEffect(() => {
    fetchLeagueAndPlayers()
  }, [leagueId])

  const fetchLeagueAndPlayers = async () => {
    try {
      setLoading(true)
      setMessage('')

      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('id, league_name, join_code')
        .eq('id', leagueId)
        .single()

      if (leagueError) throw leagueError

      const { data, error } = await supabase
        .from('league_players')
        .select(`
          id,
          league_id,
          player_id,
          base_price,
          is_sold,
          is_unsold,
          sold_to_member_id,
          sold_price,
          players (
            id,
            player_name,
            ipl_team,
            role_type,
            base_price
          )
        `)
        .eq('league_id', leagueId)
        .order('base_price', { ascending: false })

      if (error) throw error

      setLeague(leagueData)
      setPlayers(data || [])
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const isEccLeague = () => {
    const leagueName = String(league?.league_name || '').toLowerCase()
    return leagueName.includes('ecc')
  }

  const seedLeaguePlayers = async () => {
    try {
      setSeedingPlayers(true)
      setMessage('')

      const { data: existingLeaguePlayers, error: existingError } = await supabase
        .from('league_players')
        .select('player_id')
        .eq('league_id', leagueId)

      if (existingError) throw existingError

      const existingPlayerIds = new Set(
        (existingLeaguePlayers || [])
          .map((item) => item.player_id)
          .filter(Boolean)
      )

      if (isEccLeague()) {
        const eccNames = eccAuctionPlayers.map((player) => player.player_name)

        const { data: dbPlayers, error: dbPlayersError } = await supabase
          .from('players')
          .select('id, player_name, role_type, base_price')
          .in('player_name', eccNames)

        if (dbPlayersError) throw dbPlayersError

        const dbPlayerMap = new Map()
        for (const player of dbPlayers || []) {
          dbPlayerMap.set(player.player_name, player)
        }

        const missingPlayers = eccAuctionPlayers.filter(
          (player) => !dbPlayerMap.has(player.player_name)
        )

        if (missingPlayers.length > 0) {
          const names = missingPlayers.map((player) => player.player_name).join(', ')
          setMessage(
            `These ECC players are missing in shared players table: ${names}. Please add them first, then load league players again.`
          )
          return
        }

        const playersToInsert = eccAuctionPlayers
          .map((eccPlayer) => {
            const matchedDbPlayer = dbPlayerMap.get(eccPlayer.player_name)

            if (!matchedDbPlayer) return null
            if (existingPlayerIds.has(matchedDbPlayer.id)) return null

            return {
              league_id: leagueId,
              player_id: matchedDbPlayer.id,
              base_price: eccPlayer.base_price ?? matchedDbPlayer.base_price ?? 0,
              is_sold: false,
              is_unsold: false,
              sold_to_member_id: null,
              sold_price: null,
            }
          })
          .filter(Boolean)

        if (playersToInsert.length === 0) {
          setMessage('All ECC players are already loaded into this league.')
          await fetchLeagueAndPlayers()
          return
        }

        const { error: insertError } = await supabase
          .from('league_players')
          .insert(playersToInsert)

        if (insertError) throw insertError

        setMessage(`${playersToInsert.length} ECC players loaded into this league successfully.`)
        await fetchLeagueAndPlayers()
        return
      }

      const { data: allPlayers, error: allPlayersError } = await supabase
        .from('players')
        .select('id, base_price')
        .order('base_price', { ascending: false })

      if (allPlayersError) throw allPlayersError

      const playersToInsert = (allPlayers || [])
        .filter((player) => !existingPlayerIds.has(player.id))
        .map((player) => ({
          league_id: leagueId,
          player_id: player.id,
          base_price: player.base_price ?? 0,
          is_sold: false,
          is_unsold: false,
          sold_to_member_id: null,
          sold_price: null,
        }))

      if (playersToInsert.length === 0) {
        setMessage('All available players are already loaded into this league.')
        await fetchLeagueAndPlayers()
        return
      }

      const { error: insertError } = await supabase
        .from('league_players')
        .insert(playersToInsert)

      if (insertError) throw insertError

      setMessage(`${playersToInsert.length} players loaded into this league successfully.`)
      await fetchLeagueAndPlayers()
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setSeedingPlayers(false)
    }
  }

  function getPlayerStatus(player) {
    if (player.is_unsold) return 'Unsold'
    if (player.is_sold) return 'Sold'
    return 'Available'
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Auction Setup</h1>
            <p className="mt-1 text-gray-600">
              Review league players before starting the auction.
            </p>
            {league?.league_name && (
              <p className="mt-2 text-sm text-gray-700">
                League: <span className="font-semibold">{league.league_name}</span>
                {isEccLeague() ? ' (ECC player list mode)' : ' (shared player pool mode)'}
              </p>
            )}
          </div>

          <button
            onClick={seedLeaguePlayers}
            disabled={seedingPlayers}
            className="rounded bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {seedingPlayers ? 'Loading Players...' : 'Load Players Into League'}
          </button>
        </div>

        {message && <p className="mb-4 text-red-600">{message}</p>}

        {loading ? (
          <p className="text-lg text-black">Loading players...</p>
        ) : players.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
            <p className="text-gray-700">No league players found for this league.</p>
            <p className="mt-2 text-sm text-gray-600">
              Click <span className="font-semibold">Load Players Into League</span> to seed the correct
              <span className="font-semibold"> league_players</span> for this auction.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600">
              Total league players: <span className="font-semibold text-black">{players.length}</span>
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2 text-left text-black">Player</th>
                    <th className="border px-4 py-2 text-left text-black">Team</th>
                    <th className="border px-4 py-2 text-left text-black">Role</th>
                    <th className="border px-4 py-2 text-left text-black">Base Price</th>
                    <th className="border px-4 py-2 text-left text-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr key={player.id}>
                      <td className="border px-4 py-2 text-black">
                        {player.players?.player_name || '-'}
                      </td>
                      <td className="border px-4 py-2 text-black">
                        {player.players?.ipl_team || '-'}
                      </td>
                      <td className="border px-4 py-2 text-black">
                        {player.players?.role_type || '-'}
                      </td>
                      <td className="border px-4 py-2 text-black">
                        {player.base_price}
                      </td>
                      <td className="border px-4 py-2 text-black">
                        {getPlayerStatus(player)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}