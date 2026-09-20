import { useState, useEffect } from 'react';
import { PlayType, LotteryIssue, TargetIssueInfo } from '../types';
import { getRealtimeDrawSchedule, RealtimeDrawScheduleInfo, formatDateTimeStr, getBeijingDate } from '../services/lotterySchedule';

export function useRealtimeLottery(
  playType: PlayType,
  historyData: LotteryIssue[],
  onAutoAdvance?: () => void
) {
  const [scheduleInfo, setScheduleInfo] = useState<RealtimeDrawScheduleInfo>(() =>
    getRealtimeDrawSchedule(playType, historyData)
  );
  const [currentLiveTime, setCurrentLiveTime] = useState<string>(() =>
    formatDateTimeStr(getBeijingDate())
  );

  useEffect(() => {
    // Immediate calculation on playType or history change
    setScheduleInfo(getRealtimeDrawSchedule(playType, historyData));
  }, [playType, historyData]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getBeijingDate();
      setCurrentLiveTime(formatDateTimeStr(now));

      const updated = getRealtimeDrawSchedule(playType, historyData);
      setScheduleInfo((prev) => {
        // If the target issue advanced (e.g., passed 21:15 draw cutoff)
        if (prev.targetIssue !== updated.targetIssue && onAutoAdvance) {
          onAutoAdvance();
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [playType, historyData, onAutoAdvance]);

  return {
    scheduleInfo,
    currentLiveTime
  };
}
