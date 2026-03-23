import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function CreateLeague() {
  const [leagueName, setLeagueName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [createdLeague, setCreatedLeague] = useState(null)

  const handleCreateLeague = async () => {
    if (!leagueName.trim() || !creatorName.trim()) {
      setMessage('Please enter league name and your name')
      return
    }

    try {
      setLoading(true)
      setMessage('')
      setCreatedLeague(null)

      const joinCode = generateJoinCode()

      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .insert([
          {
            league_name: leagueName.trim(),
            join_code: joinCode,
          },
        ])
        .select()

      if (leagueError) throw leagueError

      const newLeague = leagueData[0]

      const { data: memberData, error: memberError } = await supabase
        .from('league_members')
        .insert([
          {
            league_id: newLeague.id,
            user_name: creatorName.trim(),
            role: 'admin',
          },
        ])
        .select()

      if (memberError) throw memberError

      const adminMember = memberData[0]

      localStorage.setItem(
        'auction_user',
        JSON.stringify({
          leagueId: newLeague.id,
          memberId: adminMember.id,
          name: adminMember.user_name,
          role: adminMember.role || 'admin',
        })
      )

      setCreatedLeague(newLeague)
      setMessage(
        `League created successfully. Join Code: ${newLeague.join_code}`
      )
      setLeagueName('')
      setCreatorName('')
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-black">Create League</h1>

        <input
          type="text"
          placeholder="Enter league name"
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 p-3 text-black outline-none"
        />

        <input
          type="text"
          placeholder="Enter your name"
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 p-3 text-black outline-none"
        />

        <button
          onClick={handleCreateLeague}
          disabled={loading}
          className="w-full rounded bg-blue-600 px-4 py-3 text-white disabled:bg-gray-400"
        >
          {loading ? 'Creating...' : 'Create League'}
        </button>

        {message && (
          <p className="mt-4 text-sm font-medium text-black">{message}</p>
        )}

        {createdLeague && (
          <Link
            to={`/league/${createdLeague.id}`}
            className="mt-4 block rounded bg-black px-4 py-3 text-center text-white"
          >
            Go to League Lobby
          </Link>
        )}
      </div>
    </div>
  )
}