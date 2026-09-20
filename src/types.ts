export type PlayType = 'ssq' | 'dlt';
export type EngineType = 'v2' | 'mars';

export interface LotteryIssue {
  issue: string;
  date: string;
  reds: number[];     // SSQ: 6 balls (1-33); DLT: 5 balls (1-35)
  blues: number[];    // SSQ: 1 ball (1-16); DLT: 2 balls (1-12)
  sales?: number;
  pool?: number;
}

export interface TicketValidation {
  acValue: number;
  oddEvenRatio: string; // e.g. "4:2" or "3:2"
  consecutiveCount: number; // max consecutive run
  sumVal: number;
  bankersContained: number[];
  isValid: boolean;
  filterReasons: string[];
}

export interface GeneratedTicket {
  id: string;
  reds: number[];
  blues: number[];
  acValue: number;
  oddEvenRatio: string;
  sumVal: number;
  bankerCount: number;
  isCoveringTicket?: boolean;
}

export interface MarkovNumberProb {
  number: number;
  probability: number;
  isBanker: boolean;
  frequency: number;
  currentOmission: number;
}

export interface TargetIssueInfo {
  targetIssue: string; // e.g. "2026109"
  targetDrawDate: string; // e.g. "2026-09-20"
  targetDayOfWeek: string; // e.g. "周日 21:15"
  status: 'upcoming'; // 待开奖
  baselineIssue: string; // e.g. "2026108"
  baselineDrawDate: string; // e.g. "2026-09-17"
  baselineReds: number[];
  baselineBlues: number[];
  historySampleCount: number; // e.g. 50 期
  isToday?: boolean; // 当天是否为开奖日
  countdown?: string; // 实时倒计时 例如 "10小时50分23秒"
  secondsRemaining?: number; // 剩余秒数
  nowFormatted?: string; // 当前系统北京时间
  isLiveTarget?: boolean; // 是否处于实时最新期
}

export interface BlueBallInferenceItem {
  number: number;
  probability: number;
  omission: number;
  frequency: number;
  score: number;
  status: 'hot' | 'warm' | 'cold_rebound';
  isTopRanked: boolean;
}

export interface BluePairInferenceItem {
  pair: [number, number];
  probability: number;
  coOccurrenceCount: number;
  span: number;
  oddEven: string;
  score: number;
  isTopRanked: boolean;
}

export interface BlueInferenceSummary {
  topBlues: number[];
  topPairs?: [number, number][];
  items: BlueBallInferenceItem[];
  pairItems?: BluePairInferenceItem[];
  strategyNote: string;
}

export interface V2GenerateResponse {
  playType: PlayType;
  engine: 'v2';
  targetIssueInfo: TargetIssueInfo;
  historyUsed: number;
  bankers: number[];
  markovProbs: MarkovNumberProb[];
  blueInference?: BlueInferenceSummary;
  tickets: GeneratedTicket[];
  generatedCount: number;
  costRMB: number;
  circuitBreakerTriggered: boolean;
  summary: {
    targetParity: string;
    acRange: [number, number];
    blueCoverageCount: number;
  };
}

export interface MarsGenerateResponse {
  playType: PlayType;
  engine: 'mars';
  targetIssueInfo: TargetIssueInfo;
  historyUsed: number;
  coldMotherSet: number[]; // 12 numbers
  motherSetOmissions: { number: number; omission: number; zScore: number }[];
  blueInference?: BlueInferenceSummary;
  coveringDesign: {
    rule: string; // "中6保5" or "中5保4"
    theoreticalCombinations: number;
    compressedTicketsCount: number;
    compressionRatio: string;
    defenseFilteredCount: number;
  };
  tickets: GeneratedTicket[];
  costRMB: number;
  circuitBreakerTriggered: boolean;
}

export interface BacktestPoint {
  issue: string;
  date: string;
  cost: number;
  winning: number;
  pnl: number;
  cumulativePnL: number;
  hitTier?: string;
  redHits: number;
  blueHits: number;
}

export interface BacktestSummary {
  totalPeriods: number;
  totalInvested: number;
  totalReturned: number;
  netPnL: number;
  roi: number; // percentage
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number; // percentage of periods with any return
  tierHits: Record<string, number>;
  points: BacktestPoint[];
}
