import { ExclusionFilterConfig, GeneratedTicket, LotteryIssue, MarkovNumberProb, PlayType, V2GenerateResponse } from '../types';
import {
  calculateACValue,
  calculateMaxConsecutive,
  calculateOddEvenRatio,
  calculateOmissions,
  calculateSum,
  computeUpcomingDrawInfo,
  getHistoricalData
} from './lotteryData';
import { analyzeBlueInference, sampleInferredBlues } from './blueEngine';
import { getDefaultFilterConfig, validateTicketFilter } from './filterEngine';

export function runMarkovEngine(
  playType: PlayType,
  historyLimit: number = 50,
  ticketCount: number = 10,
  customHistory?: LotteryIssue[],
  filterConfig?: ExclusionFilterConfig
): V2GenerateResponse {
  const history = customHistory && customHistory.length > 0
    ? customHistory.slice(0, Math.min(historyLimit, customHistory.length))
    : getHistoricalData(playType, historyLimit);

  const activeFilter = filterConfig || getDefaultFilterConfig(playType);
  const baselineReds = history[0]?.reds || [];

  const targetIssueInfo = computeUpcomingDrawInfo(playType, history[0], history.length);
  const totalRedsCount = playType === 'ssq' ? 33 : 35;
  const redDrawCount = playType === 'ssq' ? 6 : 5;
  const blueMax = playType === 'ssq' ? 16 : 12;
  const blueDrawCount = playType === 'ssq' ? 1 : 2;

  // Quantitative Blue Ball Inference Engine (Markov transition + omission rebound + co-occurrence)
  const blueInference = analyzeBlueInference(playType, history);
  const allocatedBlues = sampleInferredBlues(blueInference, playType, ticketCount);

  // 1. Build Markov Transition Matrix
  // Transitions between number appearances from issue t to t+1
  // Matrix size: (totalRedsCount + 1) x (totalRedsCount + 1)
  const transitionMatrix: number[][] = Array.from({ length: totalRedsCount + 1 }, () =>
    new Array(totalRedsCount + 1).fill(0.01) // Laplace smoothing
  );

  for (let t = history.length - 1; t > 0; t--) {
    const prevDraw = history[t].reds;
    const nextDraw = history[t - 1].reds;

    for (const p of prevDraw) {
      for (const n of nextDraw) {
        transitionMatrix[p][n] += 1;
      }
    }
  }

  // Row normalization
  for (let i = 1; i <= totalRedsCount; i++) {
    const rowSum = transitionMatrix[i].slice(1).reduce((a, b) => a + b, 0);
    if (rowSum > 0) {
      for (let j = 1; j <= totalRedsCount; j++) {
        transitionMatrix[i][j] /= rowSum;
      }
    }
  }

  // Multiply by latest draw vector (history[0].reds)
  const latestReds = history[0].reds;
  const nextProbVector: number[] = new Array(totalRedsCount + 1).fill(0);

  for (const lr of latestReds) {
    for (let j = 1; j <= totalRedsCount; j++) {
      nextProbVector[j] += transitionMatrix[lr][j];
    }
  }

  // Normalize probability vector
  const totalProbSum = nextProbVector.slice(1).reduce((a, b) => a + b, 0);
  const omissions = calculateOmissions(history, totalRedsCount);

  // Frequency in history
  const freqMap: { [n: number]: number } = {};
  for (let n = 1; n <= totalRedsCount; n++) freqMap[n] = 0;
  for (const h of history) {
    for (const r of h.reds) {
      freqMap[r] = (freqMap[r] || 0) + 1;
    }
  }

  const allNumbersProb: { number: number; prob: number }[] = [];
  for (let n = 1; n <= totalRedsCount; n++) {
    const normalizedProb = totalProbSum > 0 ? nextProbVector[n] / totalProbSum : 1 / totalRedsCount;
    allNumbersProb.push({ number: n, prob: normalizedProb });
  }

  // Sort descending by probability to select Top 12 Bankers
  allNumbersProb.sort((a, b) => b.prob - a.prob);
  const top12Bankers = allNumbersProb.slice(0, 12).map((item) => item.number);
  const bankerSet = new Set(top12Bankers);

  const markovProbs: MarkovNumberProb[] = allNumbersProb.map((item) => ({
    number: item.number,
    probability: Number((item.prob * 100).toFixed(2)),
    isBanker: bankerSet.has(item.number),
    frequency: freqMap[item.number] || 0,
    currentOmission: omissions[item.number] || 0
  })).sort((a, b) => a.number - b.number);

  // 2. Monte Carlo Sampling with strict rules
  // Rule 1: Parity ratio (SSQ 4:2, DLT 3:2)
  const targetOdd = playType === 'ssq' ? 4 : 3;
  const targetEven = playType === 'ssq' ? 2 : 2;
  const targetParityStr = `${targetOdd}:${targetEven}`;

  // Rule 2: AC value limits
  const acRange: [number, number] = playType === 'ssq' ? [6, 10] : [4, 8];

  // Rule 3: Distinct full-coverage blue balls distribution
  // Generate all possible blue ball choices to cycle through
  const blueCombinations: number[][] = [];
  if (playType === 'ssq') {
    for (let b = 1; b <= blueMax; b++) {
      blueCombinations.push([b]);
    }
  } else {
    for (let b1 = 1; b1 <= blueMax; b1++) {
      for (let b2 = b1 + 1; b2 <= blueMax; b2++) {
        blueCombinations.push([b1, b2]);
      }
    }
  }
  // Shuffle blue combinations to ensure diverse spread
  blueCombinations.sort(() => Math.random() - 0.5);

  const generatedTickets: GeneratedTicket[] = [];
  const maxAttempts = 10000;
  let attempts = 0;
  const seenTicketKeys = new Set<string>();

  while (generatedTickets.length < ticketCount && attempts < maxAttempts) {
    attempts++;

    const killedRedSet = new Set(activeFilter.killedReds);
    const mustIncludeReds = activeFilter.mustIncludeReds.filter((r) => r <= totalRedsCount);

    // Pick 2 or 3 bankers, prioritizing user's mustIncludeReds
    const bankerSampleCount = Math.min(redDrawCount - 1, Math.max(2, mustIncludeReds.length));
    const availableTopBankers = top12Bankers.filter((b) => !killedRedSet.has(b) && !mustIncludeReds.includes(b));
    const shuffledBankers = [...availableTopBankers].sort(() => Math.random() - 0.5);
    const chosenBankers = [
      ...mustIncludeReds,
      ...shuffledBankers.slice(0, Math.max(0, bankerSampleCount - mustIncludeReds.length))
    ];

    // Remaining needed from other pool numbers (can include other numbers weighted by probability)
    const remainingCount = redDrawCount - chosenBankers.length;
    const remainingCandidates = [];
    for (let n = 1; n <= totalRedsCount; n++) {
      if (!chosenBankers.includes(n) && !killedRedSet.has(n)) {
        remainingCandidates.push(n);
      }
    }

    if (remainingCandidates.length < remainingCount) {
      break;
    }

    // Weighted random sample based on Markov probabilities
    const chosenOthers: number[] = [];
    while (chosenOthers.length < remainingCount) {
      const rand = Math.random();
      let cumulative = 0;
      let picked = remainingCandidates[Math.floor(Math.random() * remainingCandidates.length)];
      for (const cand of remainingCandidates) {
        if (!chosenOthers.includes(cand)) {
          cumulative += (nextProbVector[cand] || 1);
          if (rand <= cumulative / totalProbSum) {
            picked = cand;
            break;
          }
        }
      }
      if (!chosenOthers.includes(picked)) {
        chosenOthers.push(picked);
      }
    }

    const candidateReds = [...chosenBankers, ...chosenOthers].sort((a, b) => a - b);

    // Filter by AC Value
    const ac = calculateACValue(candidateReds);
    if (ac < acRange[0] || ac > acRange[1]) {
      continue;
    }

    // Deduplicate red combination
    const redKey = candidateReds.join('-');
    if (seenTicketKeys.has(redKey)) {
      continue;
    }

    // Blue Ball: Allocate based on historical Markov & omission inference, excluding killed blues
    let blueSelection = allocatedBlues[generatedTickets.length % allocatedBlues.length];
    if (activeFilter.killedBlues.length > 0) {
      const safeBlues = blueSelection.filter((b) => !activeFilter.killedBlues.includes(b));
      if (safeBlues.length < blueDrawCount) {
        // Find alternative blue not killed
        const fallbackBlues: number[] = [];
        for (let b = 1; b <= blueMax; b++) {
          if (!activeFilter.killedBlues.includes(b)) {
            fallbackBlues.push(b);
          }
        }
        if (fallbackBlues.length >= blueDrawCount) {
          blueSelection = fallbackBlues.slice(0, blueDrawCount);
        }
      }
    }

    // Comprehensive exclusion and reduction filter validation
    const filterResult = validateTicketFilter(candidateReds, blueSelection, activeFilter, baselineReds);
    if (!filterResult.passed) {
      continue;
    }

    seenTicketKeys.add(redKey);
    const parity = calculateOddEvenRatio(candidateReds);

    generatedTickets.push({
      id: `V2-${generatedTickets.length + 1}`,
      reds: candidateReds,
      blues: blueSelection,
      acValue: ac,
      oddEvenRatio: parity.ratioStr,
      sumVal: calculateSum(candidateReds),
      bankerCount: chosenBankers.length,
      filterReasons: filterResult.passedReasons,
      primeCount: filterResult.primeCount,
      consecutiveCount: filterResult.consecutiveRun,
      repeatCount: filterResult.repeatCount
    });
  }

  const costRMB = ticketCount * 2;
  const circuitBreakerTriggered = costRMB > 2000;

  return {
    playType,
    engine: 'v2',
    targetIssueInfo,
    historyUsed: history.length,
    bankers: top12Bankers,
    markovProbs,
    blueInference,
    tickets: generatedTickets,
    generatedCount: generatedTickets.length,
    costRMB,
    circuitBreakerTriggered,
    summary: {
      targetParity: targetParityStr,
      acRange,
      blueCoverageCount: Math.min(generatedTickets.length, blueInference.topBlues.length)
    }
  };
}
