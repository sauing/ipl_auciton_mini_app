import { Routes, Route } from 'react-router-dom'
import CreateLeague from './pages/CreateLeague'
import JoinLeague from './pages/JoinLeague'
import LeagueLobby from './pages/LeagueLobby'
import Home from './pages/Home'
import AuctionSetup from './pages/AuctionSetup'
import AuctionRoom from './pages/AuctionRoom'
import TeamPage from './pages/TeamPage'
import Leaderboard from './pages/Leaderboard'
import WinnerPage from './pages/WinnerPage'
import FantasyImport from './pages/FantasyImport'
import FantasyLeaderboard from "./pages/FantasyLeaderboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateLeague />} />
      <Route path="/join" element={<JoinLeague />} />
      <Route path="/league/:leagueId" element={<LeagueLobby />} />
      <Route path="/auction-setup" element={<AuctionSetup />} />
      <Route path="/auction/:leagueId" element={<AuctionRoom />} />
      <Route path="/league/:leagueId/team/:memberId" element={<TeamPage />} />
      <Route path="/league/:leagueId/leaderboard" element={<Leaderboard />} />
      <Route path="/winner/:leagueId" element={<WinnerPage />} />
      <Route path="/fantasy-import/:leagueId" element={<FantasyImport />} />
      <Route path="/leaderboard" element={<FantasyLeaderboard />} />
    </Routes>
  )
}

export default App