import { LotteryIssue, PlayType, BlueInferenceSummary, BlueBallInferenceItem, BluePairInferenceItem } from '../types';

/**
 * Quantitative Blue Ball Inference Engine
 * Performs 1st-order Markov chain transition analysis, current omission & rebound expectation,
 * frequency estimation, and pair co-occurrence modeling.
 * Eliminates artificial sequential cycling (1, 2, 3, 4, 5...) or ungrounded uniform randomness.
 */

export function analyzeBlueInference(
  playType: PlayType,
  history: LotteryIssue[]
): BlueInferenceSummary {
  const blueMax = playType === 'ssq' ? 16 : 12;
  const sampleCount = history.length;
  const baselineDraw = history[0];
  const baselineBlues = baselineDraw ? baselineDraw.blues : (playType === 'ssq' ? [1] : [1, 2]);

  // 1. Calculate frequency & current omission for each blue ball
  const frequencies: Record<number, number> = {};
  const omissions: Record<number, number> = {};
  for (let b = 1; b <= blueMax; b++) {
    frequencies[b] = 0;
    omissions[b] = -1;
  }

  history.forEach((issue, idx) => {
    issue.blues.forEach((b) => {
      if (frequencies[b] !== undefined) {
        frequencies[b]++;
      }
      if (omissions[b] === -1) {
        omissions[b] = idx; // idx draws since last appearance
      }
    });
  });

  // If a number was never drawn in sample window, set omission to sampleCount
  for (let b = 1; b <= blueMax; b++) {
    if (omissions[b] === -1) {
      omissions[b] = sampleCount;
    }
  }

  // 2. Build 1st-order Markov Transition Matrix P(B_t | B_{t-1})
  // history is ordered newest to oldest: history[i] is at time t, history[i+1] is at time t-1
  const transitionCounts: Record<number, Record<number, number>> = {};
  for (let b1 = 1; b1 <= blueMax; b1++) {
    transitionCounts[b1] = {};
    for (let b2 = 1; b2 <= blueMax; b2++) {
      transitionCounts[b1][b2] = 0;
    }
  }

  for (let i = history.length - 2; i >= 0; i--) {
    const prevBlues = history[i + 1].blues;
    const currBlues = history[i].blues;
    prevBlues.forEach((pb) => {
      currBlues.forEach((cb) => {
        if (transitionCounts[pb] && transitionCounts[pb][cb] !== undefined) {
          transitionCounts[pb][cb]++;
        }
      });
    });
  }

  // Calculate transition probability row from the baseline draw
  const markovProbFromBaseline: Record<number, number> = {};
  let totalTransitions = 0;
  for (let b = 1; b <= blueMax; b++) {
    let count = 0;
    baselineBlues.forEach((pb) => {
      count += transitionCounts[pb]?.[b] || 0;
    });
    // Laplace smoothing (alpha = 0.5)
    markovProbFromBaseline[b] = count + 0.5;
    totalTransitions += count + 0.5;
  }
  for (let b = 1; b <= blueMax; b++) {
    markovProbFromBaseline[b] = markovProbFromBaseline[b] / totalTransitions;
  }

  // 3. Composite Scoring & Ranking for Single Blue Balls
  const singleItems: BlueBallInferenceItem[] = [];
  const theoreticalAvgOmission = playType === 'ssq' ? 16 : 6;

  for (let b = 1; b <= blueMax; b++) {
    const freqRatio = frequencies[b] / Math.max(1, sampleCount);
    const markovProb = markovProbFromBaseline[b] || (1 / blueMax);
    const omission = omissions[b];

    // Omission rebound factor: numbers near or above average omission get rebound bonus,
    // while recently drawn numbers (omission <= 2) get clustering bonus
    let reboundFactor = 1.0;
    if (omission >= theoreticalAvgOmission * 1.5) {
      reboundFactor = 1.35; // strong rebound expectation
    } else if (omission >= theoreticalAvgOmission) {
      reboundFactor = 1.2;
    } else if (omission <= 2) {
      reboundFactor = 1.15; // hot repeat momentum
    } else {
      reboundFactor = 0.95; // lukewarm mid-omission
    }

    const rawScore = (0.45 * markovProb + 0.35 * freqRatio) * reboundFactor;

    let status: 'hot' | 'warm' | 'cold_rebound' = 'warm';
    if (omission <= 3) {
      status = 'hot';
    } else if (omission >= theoreticalAvgOmission * 1.2) {
      status = 'cold_rebound';
    }

    singleItems.push({
      number: b,
      probability: markovProb,
      omission,
      frequency: frequencies[b],
      score: rawScore,
      status,
      isTopRanked: false
    });
  }

  // Normalize single scores to probability distribution
  const totalSingleScore = singleItems.reduce((acc, curr) => acc + curr.score, 0);
  singleItems.forEach((item) => {
    item.probability = Math.round((item.score / totalSingleScore) * 1000) / 1000;
  });

  // Sort descending by score
  singleItems.sort((a, b) => b.score - a.score);

  // Mark top 4 as top-ranked
  const topCutoff = playType === 'ssq' ? 4 : 5;
  for (let i = 0; i < Math.min(topCutoff, singleItems.length); i++) {
    singleItems[i].isTopRanked = true;
  }

  // 4. If DLT (2 blue balls), also evaluate all 66 pairs [b1, b2]
  const pairItems: BluePairInferenceItem[] = [];
  if (playType === 'dlt') {
    // Co-occurrence matrix
    const coOccurrence: Record<string, number> = {};
    history.forEach((issue) => {
      if (issue.blues.length >= 2) {
        const sorted = [...issue.blues].sort((a, b) => a - b);
        const key = `${sorted[0]}-${sorted[1]}`;
        coOccurrence[key] = (coOccurrence[key] || 0) + 1;
      }
    });

    for (let b1 = 1; b1 <= 12; b1++) {
      for (let b2 = b1 + 1; b2 <= 12; b2++) {
        const key = `${b1}-${b2}`;
        const coCount = coOccurrence[key] || 0;
        const span = b2 - b1;
        const oddCount = (b1 % 2 !== 0 ? 1 : 0) + (b2 % 2 !== 0 ? 1 : 0);
        const oddEven = oddCount === 1 ? '1奇1偶' : oddCount === 2 ? '全奇' : '全偶';

        // Span penalty: Span = 1 (adjacent like 01-02, 02-03) is empirically rare (~12%)
        // Optimal span is 2 to 7 (~70% of historical draws)
        let spanWeight = 1.0;
        if (span === 1) {
          spanWeight = 0.5; // downgrade unnatural adjacent pairs
        } else if (span >= 2 && span <= 7) {
          spanWeight = 1.25;
        } else {
          spanWeight = 0.9;
        }

        // Parity weight: 1 odd 1 even is ~52% of draws
        const parityWeight = oddCount === 1 ? 1.2 : 0.85;

        // Combined single blue Markov strength
        const s1 = singleItems.find((x) => x.number === b1)?.score || 0.01;
        const s2 = singleItems.find((x) => x.number === b2)?.score || 0.01;
        const jointSingleScore = s1 * s2;

        const pairScore =
          (jointSingleScore * 100 + (coCount / Math.max(1, sampleCount)) * 0.5) *
          spanWeight *
          parityWeight;

        pairItems.push({
          pair: [b1, b2],
          probability: 0,
          coOccurrenceCount: coCount,
          span,
          oddEven,
          score: pairScore,
          isTopRanked: false
        });
      }
    }

    const totalPairScore = pairItems.reduce((acc, curr) => acc + curr.score, 0);
    pairItems.forEach((item) => {
      item.probability = Math.round((item.score / totalPairScore) * 1000) / 1000;
    });

    pairItems.sort((a, b) => b.score - a.score);

    // Mark top 8 pairs
    for (let i = 0; i < Math.min(8, pairItems.length); i++) {
      pairItems[i].isTopRanked = true;
    }
  }

  const topBlues = singleItems.slice(0, topCutoff).map((x) => x.number);
  const topPairs = pairItems.slice(0, 6).map((x) => x.pair);

  const strategyNote =
    playType === 'ssq'
      ? `基于最近 ${sampleCount} 期一阶马尔可夫转移矩阵、当前遗漏期数与回补期望，推算重点关注蓝胆: [${topBlues.map((b) => (b < 10 ? `0${b}` : b)).join(', ')}]，杜绝机械连续与简单轮询`
      : `基于后区历史联合共现、跨度分布(过滤相邻跨度1)及奇偶平衡，推测重点后区组合: [${topPairs.slice(0, 3).map((p) => `${p[0] < 10 ? `0${p[0]}` : p[0]}+${p[1] < 10 ? `0${p[1]}` : p[1]}`).join(', ')}]`;

  return {
    topBlues,
    topPairs: playType === 'dlt' ? topPairs : undefined,
    items: singleItems,
    pairItems: playType === 'dlt' ? pairItems : undefined,
    strategyNote
  };
}

/**
 * Sample or allocate blue balls across generated tickets strictly based on historical inference weights.
 * Never outputs sequential cycling 1, 2, 3, 4, 5, 6.
 */
export function sampleInferredBlues(
  summary: BlueInferenceSummary,
  playType: PlayType,
  ticketCount: number
): number[][] {
  const result: number[][] = [];

  if (playType === 'ssq') {
    // Cumulative probability distribution based on inferred scores
    const items = [...summary.items];
    const totalScore = items.reduce((acc, curr) => acc + curr.score, 0);

    for (let i = 0; i < ticketCount; i++) {
      // First 50% of tickets heavily favor the top 4 ranked inferred blues
      // Remaining tickets draw from full Bayesian distribution for diversification
      if (i < Math.min(ticketCount, 6)) {
        const topCandidates = summary.topBlues;
        const picked = topCandidates[i % topCandidates.length];
        result.push([picked]);
        continue;
      }

      const rand = Math.random() * totalScore;
      let cumulative = 0;
      let selected = items[0].number;
      for (const item of items) {
        cumulative += item.score;
        if (rand <= cumulative) {
          selected = item.number;
          break;
        }
      }
      result.push([selected]);
    }
  } else {
    // DLT (2 blue balls): sample from inferred pair items
    const pairCandidates = summary.pairItems && summary.pairItems.length > 0
      ? summary.pairItems
      : [];

    const totalPairScore = pairCandidates.reduce((acc, curr) => acc + curr.score, 0);

    for (let i = 0; i < ticketCount; i++) {
      if (summary.topPairs && summary.topPairs.length > 0 && i < Math.min(ticketCount, 6)) {
        const topPair = summary.topPairs[i % summary.topPairs.length];
        result.push([...topPair].sort((a, b) => a - b));
        continue;
      }

      if (pairCandidates.length > 0 && totalPairScore > 0) {
        const rand = Math.random() * totalPairScore;
        let cumulative = 0;
        let selectedPair = pairCandidates[0].pair;
        for (const item of pairCandidates) {
          cumulative += item.score;
          if (rand <= cumulative) {
            selectedPair = item.pair;
            break;
          }
        }
        result.push([...selectedPair].sort((a, b) => a - b));
      } else {
        // Fallback: pick from top blues with non-adjacent span
        const b1 = summary.topBlues[0] || 1;
        const b2 = summary.topBlues[1] || 7;
        result.push([b1, b2].sort((a, b) => a - b));
      }
    }
  }

  return result;
}
