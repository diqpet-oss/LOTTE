import { GeneratedTicket, LotteryIssue, MarsGenerateResponse, PlayType } from '../types';
import {
  calculateACValue,
  calculateOddEvenRatio,
  calculateOmissions,
  calculateSum,
  computeUpcomingDrawInfo,
  getHistoricalData
} from './lotteryData';
import { analyzeBlueInference, sampleInferredBlues } from './blueEngine';

// Combinatorial helper: generates all k-combinations from an array
function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  function backtrack(start: number, path: T[]) {
    if (path.length === k) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      path.push(arr[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  backtrack(0, []);
  return result;
}

export function runMarsEngine(
  playType: PlayType,
  historyLimit: number = 50,
  maxTicketLimit?: number,
  customHistory?: LotteryIssue[]
): MarsGenerateResponse {
  const history = customHistory && customHistory.length > 0
    ? customHistory.slice(0, Math.min(historyLimit, customHistory.length))
    : getHistoricalData(playType, historyLimit);

  const targetIssueInfo = computeUpcomingDrawInfo(playType, history[0], history.length);
  const totalRedsCount = playType === 'ssq' ? 33 : 35;
  const k = playType === 'ssq' ? 6 : 5; // ticket size
  const targetMatch = playType === 'ssq' ? 5 : 4; // "中6保5" or "中5保4"
  const blueMax = playType === 'ssq' ? 16 : 12;

  // 1. Extreme Omission Analysis
  const omissions = calculateOmissions(history, totalRedsCount);
  const omissionValues = Object.values(omissions);
  const meanOmission = omissionValues.reduce((a, b) => a + b, 0) / omissionValues.length;
  const variance =
    omissionValues.reduce((acc, val) => acc + Math.pow(val - meanOmission, 2), 0) / omissionValues.length;
  const stdDev = Math.sqrt(variance) || 1;

  // Rank by deviation (Z-score)
  const numbersWithStats = [];
  for (let n = 1; n <= totalRedsCount; n++) {
    const omission = omissions[n];
    const zScore = (omission - meanOmission) / stdDev;
    numbersWithStats.push({ number: n, omission, zScore });
  }

  // Sort descending by omission / zScore (extreme cold numbers)
  numbersWithStats.sort((a, b) => b.omission - a.omission || b.zScore - a.zScore);

  // Top 12 numbers form the "极冷复式母集"
  const coldMotherSetStats = numbersWithStats.slice(0, 12);
  const motherSet = coldMotherSetStats.map((item) => item.number).sort((a, b) => a - b);

  // 2. Covering Design Rotation Matrix ("中6保5" or "中5保4")
  // For motherSet of 12 numbers:
  // All combinations of size k:
  const allCompoundCandidates = getCombinations(motherSet, k);
  const theoreticalCombinations = allCompoundCandidates.length; // 924 for SSQ, 792 for DLT

  // Sub-combinations to cover: each k-subset can be matched by targetMatch numbers
  const allSubsetsToCover = getCombinations(motherSet, targetMatch);
  const uncoveredSubsets = new Set<string>(allSubsetsToCover.map((sub) => sub.join(',')));

  // Map each candidate ticket to the targetMatch-subsets it covers
  const candidateCoverageMap = new Map<number, string[]>();
  for (let i = 0; i < allCompoundCandidates.length; i++) {
    const candidate = allCompoundCandidates[i];
    const coveredSubsets = getCombinations(candidate, targetMatch).map((sub) => sub.join(','));
    candidateCoverageMap.set(i, coveredSubsets);
  }

  // Greedy Set Cover Algorithm to find optimal Covering Matrix
  const chosenIndices: number[] = [];
  const candidateAvailable = new Set<number>(allCompoundCandidates.keys());

  while (uncoveredSubsets.size > 0 && candidateAvailable.size > 0) {
    let bestCandidateIdx = -1;
    let maxNewCovered = -1;

    for (const idx of candidateAvailable) {
      const covered = candidateCoverageMap.get(idx)!;
      let newCount = 0;
      for (const sub of covered) {
        if (uncoveredSubsets.has(sub)) {
          newCount++;
        }
      }
      if (newCount > maxNewCovered) {
        maxNewCovered = newCount;
        bestCandidateIdx = idx;
      }
    }

    if (bestCandidateIdx === -1 || maxNewCovered === 0) {
      break;
    }

    chosenIndices.push(bestCandidateIdx);
    candidateAvailable.delete(bestCandidateIdx);

    // Remove covered subsets
    for (const sub of candidateCoverageMap.get(bestCandidateIdx)!) {
      uncoveredSubsets.delete(sub);
    }
  }

  // 3. Isomorphism Defense (同构形态防御)
  // Filter out:
  // - All odd or all even
  // - Sum value out of historical empirical extreme limits
  const sumMin = playType === 'ssq' ? 58 : 48;
  const sumMax = playType === 'ssq' ? 142 : 132;

  let defenseFilteredCount = 0;
  const validCoveringTickets: GeneratedTicket[] = [];

  // Blue ball quantitative inference based on historical Markov transition & omission rebound
  const blueInference = analyzeBlueInference(playType, history);
  const allocatedBlues = sampleInferredBlues(blueInference, playType, chosenIndices.length);

  for (let i = 0; i < chosenIndices.length; i++) {
    const reds = allCompoundCandidates[chosenIndices[i]];
    const parity = calculateOddEvenRatio(reds);
    const sumVal = calculateSum(reds);

    // Defense 1: Reject All Odd or All Even
    if (parity.odd === k || parity.even === k) {
      defenseFilteredCount++;
      continue;
    }

    // Defense 2: Reject extreme historical sum bounds
    if (sumVal < sumMin || sumVal > sumMax) {
      defenseFilteredCount++;
      continue;
    }

    // Blue Ball Allocation: strictly driven by historical posterior probability
    const blues = allocatedBlues[validCoveringTickets.length % allocatedBlues.length];
    const ac = calculateACValue(reds);

    validCoveringTickets.push({
      id: `MARS-${validCoveringTickets.length + 1}`,
      reds,
      blues,
      acValue: ac,
      oddEvenRatio: parity.ratioStr,
      sumVal,
      bankerCount: reds.length, // All from cold mother set
      isCoveringTicket: true
    });
  }

  // If user capped ticket count, slice to requested limit
  const finalTickets = maxTicketLimit && maxTicketLimit > 0
    ? validCoveringTickets.slice(0, maxTicketLimit)
    : validCoveringTickets;

  const costRMB = finalTickets.length * 2;
  const circuitBreakerTriggered = costRMB > 2000;
  const compressionRatio = ((1 - finalTickets.length / theoreticalCombinations) * 100).toFixed(1) + '%';

  return {
    playType,
    engine: 'mars',
    targetIssueInfo,
    historyUsed: history.length,
    coldMotherSet: motherSet,
    motherSetOmissions: coldMotherSetStats,
    blueInference,
    coveringDesign: {
      rule: playType === 'ssq' ? '中6保5' : '中5保4',
      theoreticalCombinations,
      compressedTicketsCount: finalTickets.length,
      compressionRatio,
      defenseFilteredCount
    },
    tickets: finalTickets,
    costRMB,
    circuitBreakerTriggered
  };
}
