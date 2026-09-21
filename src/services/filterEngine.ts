import { PlayType, ExclusionFilterConfig } from '../types';

export const PRIME_NUMBERS = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31]);

export function countPrimes(numbers: number[]): number {
  return numbers.filter((n) => PRIME_NUMBERS.has(n)).length;
}

export function calculateConsecutiveRuns(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  let maxRun = 1;
  let currentRun = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 1;
    }
  }
  return maxRun;
}

export function calculateOverlapCount(numbers1: number[], numbers2: number[]): number {
  const set2 = new Set(numbers2);
  return numbers1.filter((n) => set2.has(n)).length;
}

export function getDefaultFilterConfig(playType: PlayType): ExclusionFilterConfig {
  if (playType === 'ssq') {
    return {
      enabled: true,
      killedReds: [],
      killedBlues: [],
      mustIncludeReds: [],
      sumRange: [75, 125],
      consecutiveMode: 'allow_pair_only',
      allowedOddEvenRatios: ['3:3', '4:2', '2:4'],
      repeatCountRange: [0, 2],
      primeCountRange: [1, 4]
    };
  } else {
    return {
      enabled: true,
      killedReds: [],
      killedBlues: [],
      mustIncludeReds: [],
      sumRange: [65, 120],
      consecutiveMode: 'allow_pair_only',
      allowedOddEvenRatios: ['3:2', '2:3', '4:1', '1:4'],
      repeatCountRange: [0, 2],
      primeCountRange: [1, 3]
    };
  }
}

export interface FilterValidationResult {
  passed: boolean;
  rejectReason?: string;
  passedReasons: string[];
  primeCount: number;
  consecutiveRun: number;
  repeatCount: number;
}

export function validateTicketFilter(
  reds: number[],
  blues: number[],
  config: ExclusionFilterConfig,
  baselineReds: number[] = []
): FilterValidationResult {
  const sortedReds = [...reds].sort((a, b) => a - b);
  const sumVal = sortedReds.reduce((a, b) => a + b, 0);
  const oddCount = sortedReds.filter((n) => n % 2 !== 0).length;
  const evenCount = sortedReds.length - oddCount;
  const oddEvenStr = `${oddCount}:${evenCount}`;
  const consecutiveRun = calculateConsecutiveRuns(sortedReds);
  const primeCount = countPrimes(sortedReds);
  const repeatCount = calculateOverlapCount(sortedReds, baselineReds);

  const passedReasons: string[] = [];

  if (!config.enabled) {
    return {
      passed: true,
      passedReasons: ['全局过滤已旁路'],
      primeCount,
      consecutiveRun,
      repeatCount
    };
  }

  // 1. 杀红球规则
  if (config.killedReds.length > 0) {
    const hitKilled = sortedReds.filter((r) => config.killedReds.includes(r));
    if (hitKilled.length > 0) {
      return {
        passed: false,
        rejectReason: `命中绝杀红球 [${hitKilled.map((n) => String(n).padStart(2, '0')).join(', ')}]`,
        passedReasons,
        primeCount,
        consecutiveRun,
        repeatCount
      };
    }
    passedReasons.push(`剔除${config.killedReds.length}个杀号`);
  }

  // 2. 杀蓝球规则
  if (config.killedBlues.length > 0) {
    const hitKilledBlue = blues.filter((b) => config.killedBlues.includes(b));
    if (hitKilledBlue.length > 0) {
      return {
        passed: false,
        rejectReason: `命中绝杀蓝球 [${hitKilledBlue.map((n) => String(n).padStart(2, '0')).join(', ')}]`,
        passedReasons,
        primeCount,
        consecutiveRun,
        repeatCount
      };
    }
    passedReasons.push(`剔除${config.killedBlues.length}个杀蓝`);
  }

  // 3. 必选红球胆码
  if (config.mustIncludeReds.length > 0) {
    const missingBankers = config.mustIncludeReds.filter((b) => !sortedReds.includes(b));
    if (missingBankers.length > 0) {
      return {
        passed: false,
        rejectReason: `缺少指定胆码 [${missingBankers.map((n) => String(n).padStart(2, '0')).join(', ')}]`,
        passedReasons,
        primeCount,
        consecutiveRun,
        repeatCount
      };
    }
    passedReasons.push(`锁定胆码 [${config.mustIncludeReds.map((n) => String(n).padStart(2, '0')).join(', ')}]`);
  }

  // 4. 和值区间过滤
  if (sumVal < config.sumRange[0] || sumVal > config.sumRange[1]) {
    return {
      passed: false,
      rejectReason: `和值 ${sumVal} 越界 (限定范围 ${config.sumRange[0]}~${config.sumRange[1]})`,
      passedReasons,
      primeCount,
      consecutiveRun,
      repeatCount
    };
  }
  passedReasons.push(`和值${sumVal}(最佳区间)`);

  // 5. 奇偶比过滤
  if (config.allowedOddEvenRatios.length > 0 && !config.allowedOddEvenRatios.includes(oddEvenStr)) {
    return {
      passed: false,
      rejectReason: `奇偶比 ${oddEvenStr} 属于非允许偏态比`,
      passedReasons,
      primeCount,
      consecutiveRun,
      repeatCount
    };
  }
  passedReasons.push(`奇偶比${oddEvenStr}`);

  // 6. 连号过滤
  if (config.consecutiveMode === 'no_consecutive' && consecutiveRun >= 2) {
    return {
      passed: false,
      rejectReason: `含有连号 (${consecutiveRun}连号)，已设为严禁连号`,
      passedReasons,
      primeCount,
      consecutiveRun,
      repeatCount
    };
  }
  if (config.consecutiveMode === 'allow_pair_only' && consecutiveRun >= 3) {
    return {
      passed: false,
      rejectReason: `含有三连号及以上 (${consecutiveRun}连号)，触发形态剪枝`,
      passedReasons,
      primeCount,
      consecutiveRun,
      repeatCount
    };
  }
  passedReasons.push(consecutiveRun >= 2 ? `${consecutiveRun}连号正常` : '无连号');

  // 7. 重号过滤
  if (baselineReds.length > 0) {
    if (repeatCount < config.repeatCountRange[0] || repeatCount > config.repeatCountRange[1]) {
      return {
        passed: false,
        rejectReason: `与上期重号数 ${repeatCount} 超出允许区间 [${config.repeatCountRange[0]}~${config.repeatCountRange[1]}]`,
        passedReasons,
        primeCount,
        consecutiveRun,
        repeatCount
      };
    }
    passedReasons.push(`上期重号${repeatCount}个`);
  }

  // 8. 质数个数过滤
  if (primeCount < config.primeCountRange[0] || primeCount > config.primeCountRange[1]) {
    return {
      passed: false,
      rejectReason: `质数个数 ${primeCount} 超出设定范围 [${config.primeCountRange[0]}~${config.primeCountRange[1]}]`,
      passedReasons,
      primeCount,
      consecutiveRun,
      repeatCount
    };
  }
  passedReasons.push(`质数${primeCount}个`);

  return {
    passed: true,
    passedReasons,
    primeCount,
    consecutiveRun,
    repeatCount
  };
}

/**
 * 计算当前过滤规则相较于全彩票空间的综合理论剔除/缩水率
 */
export function estimateReductionRate(
  config: ExclusionFilterConfig,
  playType: PlayType
): { reductionRate: number; activeRulesCount: number } {
  if (!config.enabled) {
    return { reductionRate: 0, activeRulesCount: 0 };
  }

  let activeRules = 0;
  let retainedProbability = 1.0;

  // 杀红球效应 (每杀1个球，全空间减少约 k/N)
  const totalReds = playType === 'ssq' ? 33 : 35;
  const k = playType === 'ssq' ? 6 : 5;
  if (config.killedReds.length > 0) {
    activeRules++;
    const safeReds = totalReds - config.killedReds.length;
    if (safeReds >= k) {
      // 组合数比 C(safeReds, k) / C(totalReds, k)
      let ratio = 1;
      for (let i = 0; i < k; i++) {
        ratio *= (safeReds - i) / (totalReds - i);
      }
      retainedProbability *= ratio;
    } else {
      retainedProbability = 0;
    }
  }

  // 杀蓝球效应
  const totalBlues = playType === 'ssq' ? 16 : 12;
  if (config.killedBlues.length > 0) {
    activeRules++;
    const safeBlues = Math.max(0, totalBlues - config.killedBlues.length);
    retainedProbability *= safeBlues / totalBlues;
  }

  // 必含胆码
  if (config.mustIncludeReds.length > 0) {
    activeRules++;
    // 锁定 m 个胆码后，只剩 C(total-m, k-m) / C(total, k)
    const m = Math.min(config.mustIncludeReds.length, k - 1);
    let ratio = 1;
    for (let i = 0; i < m; i++) {
      ratio *= (k - i) / (totalReds - i);
    }
    retainedProbability *= ratio;
  }

  // 和值过滤效应: 约剔除 20%~35% 的极端偏态
  const defaultMin = playType === 'ssq' ? 75 : 65;
  const defaultMax = playType === 'ssq' ? 125 : 120;
  if (config.sumRange[0] > defaultMin - 10 || config.sumRange[1] < defaultMax + 10) {
    activeRules++;
    retainedProbability *= 0.72;
  }

  // 奇偶比过滤效应
  const totalPossibleParities = playType === 'ssq' ? 7 : 6;
  if (config.allowedOddEvenRatios.length < totalPossibleParities) {
    activeRules++;
    const ratioCoverage = config.allowedOddEvenRatios.length / totalPossibleParities;
    retainedProbability *= Math.max(0.4, ratioCoverage * 0.85);
  }

  // 连号过滤效应
  if (config.consecutiveMode === 'allow_pair_only') {
    activeRules++;
    retainedProbability *= 0.98; // 剔除三连号（约占2%）
  } else if (config.consecutiveMode === 'no_consecutive') {
    activeRules++;
    retainedProbability *= 0.45; // 彻底排除所有连号（历史约55%存在连号）
  }

  // 重号过滤效应
  if (config.repeatCountRange[1] <= 2) {
    activeRules++;
    retainedProbability *= 0.88;
  }

  // 质数过滤
  if (config.primeCountRange[0] > 0 || config.primeCountRange[1] < k) {
    activeRules++;
    retainedProbability *= 0.85;
  }

  const reductionPercent = Math.min(99.9, Math.max(0, (1 - retainedProbability) * 100));

  return {
    reductionRate: Number(reductionPercent.toFixed(1)),
    activeRulesCount: activeRules
  };
}
