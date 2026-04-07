export function calculateFantasyPoints(playerStat) {
  let points = 0;

  const runs = Number(playerStat.runs || 0);
  const fours = Number(playerStat.fours || 0);
  const sixes = Number(playerStat.sixes || 0);

  const wickets = Number(playerStat.wickets || 0);
  const maidenOvers = Number(playerStat.maiden_overs || 0);

  const catches = Number(playerStat.catches || 0);
  const directRunouts = Number(playerStat.direct_runouts || 0);
  const sharedRunouts = Number(playerStat.shared_runouts || 0);

  const oversBowled = Number(playerStat.overs_bowled || 0);
  const runsConceded = Number(playerStat.runs_conceded || 0);

  // -------------------------
  // Batting points
  // -------------------------
  points += runs;
  points += fours * 1;
  points += sixes * 2;

  // Batting milestone bonus (non-stacking)
  if (runs >= 100) {
    points += 8;
  } else if (runs >= 50) {
    points += 4;
  }

  // -------------------------
  // Bowling points
  // -------------------------
  points += wickets * 20;
  points += maidenOvers * 2;

  // Wicket haul bonus (non-stacking)
  if (wickets >= 10) {
    points += 16;
  } else if (wickets >= 5) {
    points += 8;
  } else if (wickets >= 3) {
    points += 4;
  }

  // Economy rate bonus / penalty
  // Apply only if minimum 4 overs bowled
  if (oversBowled >= 4) {
    const economy = oversBowled > 0 ? runsConceded / oversBowled : 0;

    if (economy < 3) {
      points += 2;
    } else if (economy > 12) {
      points -= 8;
    } else if (economy > 8) {
      points -= 4;
    } else if (economy > 6) {
      points -= 2;
    }
  }

  // -------------------------
  // Fielding points
  // -------------------------
  points += catches * 8;
  points += directRunouts * 8;
  points += sharedRunouts * 4;

  return points;
}

export function addFantasyPointsToStats(playerStats) {
  return playerStats.map((player) => ({
    ...player,
    fantasy_points: calculateFantasyPoints(player),
  }));
}