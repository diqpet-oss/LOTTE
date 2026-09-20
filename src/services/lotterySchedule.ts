import { LotteryIssue, PlayType, TargetIssueInfo } from '../types';

/**
 * 官方彩票开奖日历规律：
 * 双色球 (SSQ): 每周二(2)、周四(4)、周日(0) 21:15 开奖
 * 大乐透 (DLT): 每周一(1)、周三(3)、周六(6) 21:25 开奖
 */

export interface RealtimeDrawScheduleInfo extends TargetIssueInfo {
  isToday: boolean;
  countdown: string;
  secondsRemaining: number;
  nowFormatted: string;
  isLiveTarget: boolean;
  salesClosingCountdown?: string;
}

// 统一转换为北京时间 (UTC+8)
export function getBeijingDate(dateInput?: Date | string | number): Date {
  const now = dateInput ? new Date(dateInput) : new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 8);
}

export function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateTimeStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

export function formatDateChinese(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function isDrawDay(playType: PlayType, date: Date): boolean {
  const day = date.getDay();
  return playType === 'ssq' ? [0, 2, 4].includes(day) : [1, 3, 6].includes(day);
}

export function getDrawHourMinute(playType: PlayType): { hour: number; minute: number } {
  return playType === 'ssq' ? { hour: 21, minute: 15 } : { hour: 21, minute: 25 };
}

/**
 * 计算距离目标时间点的剩余秒数与友好倒计时字符串
 */
export function getCountdownInfo(targetTime: Date, now: Date): { seconds: number; text: string } {
  const diffMs = targetTime.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { seconds: 0, text: '开奖计算中...' };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  if (days > 0) {
    return {
      seconds: totalSecs,
      text: `${days}天${hours}小时${minutes}分${seconds}秒`
    };
  }
  if (hours > 0) {
    return {
      seconds: totalSecs,
      text: `${hours}小时${minutes}分${seconds}秒`
    };
  }
  return {
    seconds: totalSecs,
    text: `${minutes}分${seconds}秒`
  };
}

/**
 * 确定当前实时时刻下的【目标待开奖日与时刻】
 * 如果今天是开奖日且当前北京时间未到 21:15 (或 21:25)，则目标待开奖日就是今天今晚！
 * 如果已过开奖时刻或今天不是开奖日，则自动向前推移至下一个开奖日。
 */
export function getUpcomingDrawDateTime(playType: PlayType, nowBeijing: Date): Date {
  const { hour, minute } = getDrawHourMinute(playType);
  const cursor = new Date(nowBeijing.getTime());

  // 如果今天是开奖日
  if (isDrawDay(playType, cursor)) {
    const todayDraw = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hour, minute, 0);
    if (cursor.getTime() < todayDraw.getTime()) {
      return todayDraw;
    }
  }

  // 逐日往后寻找下一个开奖日
  cursor.setDate(cursor.getDate() + 1);
  while (!isDrawDay(playType, cursor)) {
    cursor.setDate(cursor.getDate() + 1);
  }

  return new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hour, minute, 0);
}

/**
 * 确定当前时刻之前最近一期【已开奖完成的基准日与时刻】
 */
export function getPreviousCompletedDrawDate(playType: PlayType, nowBeijing: Date): Date {
  const { hour, minute } = getDrawHourMinute(playType);
  const cursor = new Date(nowBeijing.getTime());

  // 如果今天是开奖日，且当前时刻已过开奖时间，则今天就是最新已完成的一期
  if (isDrawDay(playType, cursor)) {
    const todayDraw = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hour, minute, 0);
    if (cursor.getTime() >= todayDraw.getTime()) {
      return todayDraw;
    }
  }

  // 往前回溯到上一个开奖日
  cursor.setDate(cursor.getDate() - 1);
  while (!isDrawDay(playType, cursor)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  return new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hour, minute, 0);
}

/**
 * 计算双色球与大乐透基于日历的期号跨度
 * 以 2026-09-15 第 2026107 期 (双色球) 和 2026-09-16 第 26106 期 (大乐透) 为基准锚点
 */
const SSQ_ANCHOR = { dateStr: '2026-09-15', issueNum: 2026107 };
const DLT_ANCHOR = { dateStr: '2026-09-16', issueNum: 26106 };

export function calculateIssueNumberByDate(playType: PlayType, targetDate: Date): string {
  const anchor = playType === 'ssq' ? SSQ_ANCHOR : DLT_ANCHOR;
  const [ay, am, ad] = anchor.dateStr.split('-').map(Number);
  const anchorDate = new Date(ay, am - 1, ad, 12, 0, 0);

  const targetDayNoon = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12, 0, 0);
  const diffTime = targetDayNoon.getTime() - anchorDate.getTime();

  let issueCount = anchor.issueNum;
  if (diffTime >= 0) {
    const cursor = new Date(anchorDate.getTime());
    cursor.setDate(cursor.getDate() + 1);
    while (cursor.getTime() <= targetDayNoon.getTime()) {
      if (isDrawDay(playType, cursor)) {
        issueCount++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const cursor = new Date(anchorDate.getTime());
    cursor.setDate(cursor.getDate() - 1);
    while (cursor.getTime() >= targetDayNoon.getTime()) {
      if (isDrawDay(playType, cursor)) {
        issueCount--;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return String(issueCount);
}

/**
 * 获取完整的实时动态开奖及基准信息
 */
export function getRealtimeDrawSchedule(
  playType: PlayType,
  historyData: LotteryIssue[],
  customDate?: Date
): RealtimeDrawScheduleInfo {
  const now = getBeijingDate(customDate);
  const upcomingDraw = getUpcomingDrawDateTime(playType, now);
  const targetDrawDate = formatDateStr(upcomingDraw);
  const targetIssue = calculateIssueNumberByDate(playType, upcomingDraw);

  const dayOfWeekStr = DAY_NAMES[upcomingDraw.getDay()];
  const { hour, minute } = getDrawHourMinute(playType);
  const targetDayOfWeek = `${dayOfWeekStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const todayStr = formatDateStr(now);
  const isToday = targetDrawDate === todayStr;

  const { seconds, text: countdown } = getCountdownInfo(upcomingDraw, now);

  // 获取最近已开奖基准
  // 查找历史数据中最近的一期
  const baseline = historyData[0] || {
    issue: playType === 'ssq' ? '2026107' : '26106',
    date: playType === 'ssq' ? '2026-09-15' : '2026-09-16',
    reds: playType === 'ssq' ? [4, 6, 11, 14, 19, 26] : [3, 8, 19, 24, 31],
    blues: playType === 'ssq' ? [15] : [4, 11]
  };

  return {
    targetIssue,
    targetDrawDate,
    targetDayOfWeek,
    status: 'upcoming',
    baselineIssue: baseline.issue,
    baselineDrawDate: baseline.date,
    baselineReds: baseline.reds,
    baselineBlues: baseline.blues,
    historySampleCount: historyData.length,
    isToday,
    countdown,
    secondsRemaining: seconds,
    nowFormatted: formatDateTimeStr(now),
    isLiveTarget: true
  };
}
