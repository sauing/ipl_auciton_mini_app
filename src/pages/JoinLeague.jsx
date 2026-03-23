import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function JoinLeague() {
  const [userName, setUserName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [joinedLeague, setJoinedLeague] = useState(null)

  const handleJoinLeague = async () => {
    if (!userName.trim() || !joinCode.trim()) {
      setMessage('Please enter your name and join code')
      return
    }
  
    try {
      setLoading(true)
      setMessage('')
      setJoinedLeague(null)
  
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
  
        setJoinedLeague(leagueData)
        setMessage(`Welcome back, ${existingMember.user_name}`)
        setUserName('')
        setJoinCode('')
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
        })
      )
  
      setJoinedLeague(leagueData)
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
          <Link
            to={`/league/${joinedLeague.id}`}
            className="mt-4 block rounded bg-black px-4 py-3 text-center text-white"
          >
            Go to League Lobby
          </Link>
        )}
      </div>
    </div>
  )
}