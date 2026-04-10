import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('auction_user') || 'null')

      if (storedUser) {
        navigate('/join')
      }
    } catch (error) {
      console.error('Failed to parse auction_user from localStorage:', error)
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white text-black p-6">
      <h1 className="text-3xl font-bold">IPL Auction Game</h1>
      <p>Create a league or join an existing one.</p>

      <div className="flex gap-3">
        <Link to="/create" className="rounded bg-blue-600 px-4 py-2 text-white">
          Create League
        </Link>
        <Link to="/join" className="rounded bg-green-600 px-4 py-2 text-white">
          Join League
        </Link>
      </div>
    </div>
  )
}