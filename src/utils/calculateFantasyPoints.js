export function calculateFantasyPoints(playerStat) {
    let points = 0;
  
    const runs = playerStat.runs || 0;
    const fours = playerStat.fours || 0;
    const sixes = playerStat.sixes || 0;
    const wickets = playerStat.wickets || 0;
    const maidenOvers = playerStat.maiden_overs || 0;
    const catches = playerStat.catches || 0;
    const stumpings = playerStat.stumpings || 0;
    const runouts = playerStat.runouts || 0;
    const ballsFaced = playerStat.balls_faced || 0;
    const dismissalType = playerStat.dismissal_type || null;
  
    // -------------------------
    // Batting points
    // -------------------------
    points += runs;
    points += fours * 1;
    points += sixes * 2;
  
    // Run milestone bonus (non-stacking)
    if (runs >= 100) {
      points += 16;
    } else if (runs >= 50) {
      points += 8;
    } else if (runs >= 30) {
      points += 4;
    }
  
    // Duck penalty
    if (runs === 0 && ballsFaced > 0 && dismissalType) {
      points -= 2;
    }
  
    // -------------------------
    // Bowling points
    // -------------------------
    points += wickets * 25;
  
    // Wicket milestone bonus (non-stacking)
    if (wickets >= 5) {
      points += 16;
    } else if (wickets >= 4) {
      points += 8;
    } else if (wickets >= 3) {
      points += 4;
    }
  
    points += maidenOvers * 12;
  
    // -------------------------
    // Fielding points
    // -------------------------
    points += catches * 8;
    points += stumpings * 12;
    points += runouts * 6;
  
    return points;
  }
  
  export function addFantasyPointsToStats(playerStats) {
    return playerStats.map((player) => ({
      ...player,
      fantasy_points: calculateFantasyPoints(player),
    }));
  }