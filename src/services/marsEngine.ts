import { ExclusionFilterConfig, GeneratedTicket, LotteryIssue, MarsGenerateResponse, PlayType } from '../types';
import {
  calculateACValue,
  calculateOddEvenRatio,
  calculateOmissions,
  calculateSum,
  computeUpcomingDrawInfo,
  getHistoricalData
} from './lotteryData';
import { analyzeBlueInference, sampleInferredBlues } from './blueEngine';
import { getDefaultFilterConfig, validateTicketFilter } from './filterEngine';

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
  customHistory?: LotteryIssue[],
  filterConfig?: ExclusionFilterConfig
): MarsGenerateResponse {
  const history = customHistory && customHistory.length > 0
    ? customHistory.slice(0, Math.min(historyLimit, customHistory.length))
    : getHistoricalData(playType, historyLimit);

  const activeFilter = filterConfig || getDefaultFilterConfig(playType);
  const baselineReds = history[0]?.reds || [];

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

  // Rank by deviation (Z-score), excluding killed reds
  const killedRedSet = new Set(activeFilter.killedReds);
  const mustIncludeReds = activeFilter.mustIncludeReds.filter((r) => r <= totalRedsCount);

  const numbersWithStats = [];
  for (let n = 1; n <= totalRedsCount; n++) {
    if (killedRedSet.has(n)) continue;
    const omission = omissions[n];
    const zScore = (omission - meanOmission) / stdDev;
    numbersWithStats.push({ number: n, omission, zScore });
  }

  // Sort descending by omission / zScore (extreme cold numbers)
  numbersWithStats.sort((a, b) => b.omission - a.omission || b.zScore - a.zScore);

  // Top 12 numbers form the "极冷复式母集", embedding user's must-include numbers
  const availableMotherCandidates = numbersWithStats.filter((item) => !mustIncludeReds.includes(item.number));
  const mustIncludeStats = mustIncludeReds.map((n) => ({
    number: n,
    omission: omissions[n] || 0,
    zScore: ((omissions[n] || 0) - meanOmission) / stdDev
  }));
  const neededFromStats = Math.max(0, 12 - mustIncludeStats.length);
  const coldMotherSetStats = [...mustIncludeStats, ...availableMotherCandidates.slice(0, neededFromStats)];
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

    // Blue Ball Allocation: strictly driven by historical posterior probability, avoiding killed blues
    let blues = allocatedBlues[validCoveringTickets.length % allocatedBlues.length];
    if (activeFilter.killedBlues.length > 0) {
      const safeBlues = blues.filter((b) => !activeFilter.killedBlues.includes(b));
      const blueDrawCount = playType === 'ssq' ? 1 : 2;
      if (safeBlues.length < blueDrawCount) {
        const fallbackBlues: number[] = [];
        for (let b = 1; b <= blueMax; b++) {
          if (!activeFilter.killedBlues.includes(b)) {
            fallbackBlues.push(b);
          }
        }
        if (fallbackBlues.length >= blueDrawCount) {
          blues = fallbackBlues.slice(0, blueDrawCount);
        }
      }
    }

    // Comprehensive exclusion and reduction filter validation
    const filterResult = validateTicketFilter(reds, blues, activeFilter, baselineReds);
    if (!filterResult.passed) {
      defenseFilteredCount++;
      continue;
    }

    const ac = calculateACValue(reds);

    validCoveringTickets.push({
      id: `MARS-${validCoveringTickets.length + 1}`,
      reds,
      blues,
      acValue: ac,
      oddEvenRatio: parity.ratioStr,
      sumVal,
      bankerCount: reds.length, // All from cold mother set
      isCoveringTicket: true,
      filterReasons: filterResult.passedReasons,
      primeCount: filterResult.primeCount,
      consecutiveCount: filterResult.consecutiveRun,
      repeatCount: filterResult.repeatCount
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
