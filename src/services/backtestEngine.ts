import { BacktestPoint, BacktestSummary, EngineType, GeneratedTicket, PlayType } from '../types';
import { getHistoricalData } from './lotteryData';
import { runMarkovEngine } from './markovEngine';
import { runMarsEngine } from './marsEngine';

// Calculate payout for SSQ ticket
function evaluateSSQTicket(ticket: GeneratedTicket, winReds: number[], winBlues: number[]): { prize: number; tier: string; redHits: number; blueHits: number } {
  const redHits = ticket.reds.filter((r) => winReds.includes(r)).length;
  const blueHits = ticket.blues.filter((b) => winBlues.includes(b)).length;

  let prize = 0;
  let tier = '未中奖';

  if (redHits === 6 && blueHits === 1) {
    prize = 5000000;
    tier = '一等奖 (500万)';
  } else if (redHits === 6 && blueHits === 0) {
    prize = 100000;
    tier = '二等奖 (10万)';
  } else if (redHits === 5 && blueHits === 1) {
    prize = 3000;
    tier = '三等奖 (3000元)';
  } else if ((redHits === 5 && blueHits === 0) || (redHits === 4 && blueHits === 1)) {
    prize = 200;
    tier = '四等奖 (200元)';
  } else if ((redHits === 4 && blueHits === 0) || (redHits === 3 && blueHits === 1)) {
    prize = 10;
    tier = '五等奖 (10元)';
  } else if (blueHits === 1) {
    prize = 5;
    tier = '六等奖 (5元)';
  }

  return { prize, tier, redHits, blueHits };
}

// Calculate payout for DLT ticket
function evaluateDLTTicket(ticket: GeneratedTicket, winReds: number[], winBlues: number[]): { prize: number; tier: string; redHits: number; blueHits: number } {
  const redHits = ticket.reds.filter((r) => winReds.includes(r)).length;
  const blueHits = ticket.blues.filter((b) => winBlues.includes(b)).length;

  let prize = 0;
  let tier = '未中奖';

  if (redHits === 5 && blueHits === 2) {
    prize = 5000000;
    tier = '一等奖 (500万)';
  } else if (redHits === 5 && blueHits === 1) {
    prize = 100000;
    tier = '二等奖 (10万)';
  } else if (redHits === 5 && blueHits === 0) {
    prize = 10000;
    tier = '三等奖 (10000元)';
  } else if (redHits === 4 && blueHits === 2) {
    prize = 3000;
    tier = '四等奖 (3000元)';
  } else if (redHits === 4 && blueHits === 1) {
    prize = 300;
    tier = '五等奖 (300元)';
  } else if (redHits === 3 && blueHits === 2) {
    prize = 200;
    tier = '六等奖 (200元)';
  } else if (redHits === 4 && blueHits === 0) {
    prize = 100;
    tier = '七等奖 (100元)';
  } else if ((redHits === 3 && blueHits === 1) || (redHits === 2 && blueHits === 2)) {
    prize = 15;
    tier = '八等奖 (15元)';
  } else if (
    (redHits === 3 && blueHits === 0) ||
    (redHits === 1 && blueHits === 2) ||
    (redHits === 2 && blueHits === 1) ||
    (redHits === 0 && blueHits === 2)
  ) {
    prize = 5;
    tier = '九等奖 (5元)';
  }

  return { prize, tier, redHits, blueHits };
}

export function runSandboxBacktest(
  playType: PlayType,
  engineType: EngineType,
  periods: number = 40,
  ticketsPerPeriod: number = 10
): BacktestSummary {
  const allHistory = getHistoricalData(playType, 100);
  const testPeriods = Math.min(periods, allHistory.length - 10);

  let cumulativePnL = 0;
  let peakPnL = 0;
  let maxDrawdown = 0;
  let totalInvested = 0;
  let totalReturned = 0;
  let winningPeriods = 0;

  const tierHits: Record<string, number> = {};
  const points: BacktestPoint[] = [];

  // Replay backwards in chronological order
  for (let i = testPeriods - 1; i >= 0; i--) {
    const targetIssue = allHistory[i];
    // Past slice available prior to this issue
    const pastSlice = allHistory.slice(i + 1);
    if (pastSlice.length < 10) continue;

    // Run engine on past slice
    let generatedTickets: GeneratedTicket[] = [];
    if (engineType === 'v2') {
      const v2Res = runMarkovEngine(playType, Math.min(pastSlice.length, 30), ticketsPerPeriod);
      generatedTickets = v2Res.tickets;
    } else {
      const marsRes = runMarsEngine(playType, Math.min(pastSlice.length, 30), ticketsPerPeriod);
      generatedTickets = marsRes.tickets;
    }

    const periodCost = generatedTickets.length * 2;
    totalInvested += periodCost;

    let periodPrize = 0;
    let bestTier = '未中奖';
    let maxReds = 0;
    let maxBlues = 0;

    for (const t of generatedTickets) {
      const evalRes =
        playType === 'ssq'
          ? evaluateSSQTicket(t, targetIssue.reds, targetIssue.blues)
          : evaluateDLTTicket(t, targetIssue.reds, targetIssue.blues);

      if (evalRes.prize > 0) {
        periodPrize += evalRes.prize;
        tierHits[evalRes.tier] = (tierHits[evalRes.tier] || 0) + 1;
        bestTier = evalRes.tier;
      }
      if (evalRes.redHits > maxReds) maxReds = evalRes.redHits;
      if (evalRes.blueHits > maxBlues) maxBlues = evalRes.blueHits;
    }

    totalReturned += periodPrize;
    if (periodPrize > 0) winningPeriods++;

    const periodPnL = periodPrize - periodCost;
    cumulativePnL += periodPnL;

    if (cumulativePnL > peakPnL) {
      peakPnL = cumulativePnL;
    }
    const currentDrawdown = peakPnL - cumulativePnL;
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }

    points.push({
      issue: targetIssue.issue,
      date: targetIssue.date,
      cost: periodCost,
      winning: periodPrize,
      pnl: periodPnL,
      cumulativePnL,
      hitTier: bestTier,
      redHits: maxReds,
      blueHits: maxBlues
    });
  }

  const netPnL = totalReturned - totalInvested;
  const roi = totalInvested > 0 ? Number(((netPnL / totalInvested) * 100).toFixed(2)) : 0;
  const winRate = points.length > 0 ? Number(((winningPeriods / points.length) * 100).toFixed(1)) : 0;
  const maxDrawdownPercent =
    totalInvested > 0 ? Number(((maxDrawdown / totalInvested) * 100).toFixed(2)) : 0;

  return {
    totalPeriods: points.length,
    totalInvested,
    totalReturned,
    netPnL,
    roi,
    maxDrawdown,
    maxDrawdownPercent,
    winRate,
    tierHits,
    points
  };
}
