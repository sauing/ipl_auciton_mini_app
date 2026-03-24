export function parseCricsheetMatch(matchJson) {
    const info = matchJson.info || {};
    const innings = matchJson.innings || [];
  
    const playerStats = {};
    const bowlerOverTracker = {};
  
    function ensurePlayer(playerName) {
      if (!playerName) return;
  
      if (!playerStats[playerName]) {
        playerStats[playerName] = {
          player_name: playerName,
  
          // batting
          runs: 0,
          balls_faced: 0,
          fours: 0,
          sixes: 0,
          dismissal_type: null,
  
          // bowling
          wickets: 0,
          balls_bowled: 0,
          runs_conceded: 0,
          maiden_overs: 0,
  
          // fielding
          catches: 0,
          stumpings: 0,
          runouts: 0,
        };
      }
    }
  
    function ensureBowlerOver(bowlerName, overNumber) {
      const key = `${bowlerName}_${overNumber}`;
      if (!bowlerOverTracker[key]) {
        bowlerOverTracker[key] = {
          bowler: bowlerName,
          over: overNumber,
          runs: 0,
          legalBalls: 0,
        };
      }
      return bowlerOverTracker[key];
    }
  
    for (const inning of innings) {
      // Supports BOTH formats:
      // Format A:
      // { "team": "RCB", "overs": [...] }
      //
      // Format B:
      // { "RCB": { "overs": [...] } }
  
      let inningData = null;
  
      if (inning.overs) {
        inningData = inning;
      } else {
        const inningKey = Object.keys(inning)[0];
        inningData = inning[inningKey];
      }
  
      const overs = inningData?.overs || [];
  
      for (const overObj of overs) {
        const overNumber = overObj.over;
        const deliveries = overObj.deliveries || [];
  
        for (const delivery of deliveries) {
          const batter = delivery.batter;
          const bowler = delivery.bowler;
          const runs = delivery.runs || {};
          const extras = delivery.extras || {};
          const wickets = delivery.wickets || [];
  
          ensurePlayer(batter);
          ensurePlayer(bowler);
  
          const batterRuns = runs.batter || 0;
          const totalRuns = runs.total || 0;
  
          // batting
          playerStats[batter].runs += batterRuns;
  
          if (!("wides" in extras)) {
            playerStats[batter].balls_faced += 1;
          }
  
          if (batterRuns === 4) {
            playerStats[batter].fours += 1;
          }
  
          if (batterRuns === 6) {
            playerStats[batter].sixes += 1;
          }
  
          // bowling
          const isLegalBall = !("wides" in extras) && !("noballs" in extras);
  
          if (isLegalBall) {
            playerStats[bowler].balls_bowled += 1;
          }
  
          playerStats[bowler].runs_conceded += totalRuns;
  
          const overTracker = ensureBowlerOver(bowler, overNumber);
          overTracker.runs += totalRuns;
          if (isLegalBall) {
            overTracker.legalBalls += 1;
          }
  
          // wickets and fielding
          for (const wicket of wickets) {
            const kind = wicket.kind;
            const playerOut = wicket.player_out;
            const fielders = wicket.fielders || [];
  
            ensurePlayer(playerOut);
  
            if (playerOut && !playerStats[playerOut].dismissal_type) {
              playerStats[playerOut].dismissal_type = kind;
            }
  
            const bowlingWicketKinds = [
              "bowled",
              "caught",
              "caught and bowled",
              "lbw",
              "stumped",
              "hit wicket",
            ];
  
            if (bowlingWicketKinds.includes(kind)) {
              playerStats[bowler].wickets += 1;
            }
  
            if (kind === "caught") {
              for (const fielder of fielders) {
                const fielderName = fielder.name || fielder;
                ensurePlayer(fielderName);
                playerStats[fielderName].catches += 1;
              }
            }
  
            if (kind === "stumped") {
              for (const fielder of fielders) {
                const fielderName = fielder.name || fielder;
                ensurePlayer(fielderName);
                playerStats[fielderName].stumpings += 1;
              }
            }
  
            if (kind === "run out") {
              for (const fielder of fielders) {
                const fielderName = fielder.name || fielder;
                ensurePlayer(fielderName);
                playerStats[fielderName].runouts += 1;
              }
            }
  
            if (kind === "caught and bowled") {
              playerStats[bowler].catches += 1;
            }
          }
        }
      }
    }
  
    // maiden overs
    for (const key in bowlerOverTracker) {
      const overData = bowlerOverTracker[key];
  
      if (overData.legalBalls === 6 && overData.runs === 0) {
        ensurePlayer(overData.bowler);
        playerStats[overData.bowler].maiden_overs += 1;
      }
    }
  
    const matchSummary = {
      match_type: info.match_type || null,
      date: info.dates?.[0] || null,
      venue: info.venue || null,
      city: info.city || null,
      teams: info.teams || [],
      event_name: info.event?.name || null,
      winner: info.outcome?.winner || null,
      result: info.outcome || {},
    };
  
    return {
      matchSummary,
      playerStats: Object.values(playerStats),
    };
  }