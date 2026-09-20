import { useState, useEffect, useRef } from 'react';
import { PlayType, LotteryIssue } from '../types';
import {
  getRealtimeDrawSchedule,
  RealtimeDrawScheduleInfo,
  formatDateTimeStr,
  getBeijingDate
} from '../services/lotterySchedule';

export function useRealtimeLottery(
  playType: PlayType,
  historyData: LotteryIssue[],
  onAutoAdvance?: () => void
) {
  // Use refs to avoid unstable dependencies triggering re-render loops
  const historyRef = useRef<LotteryIssue[]>(historyData);
  historyRef.current = historyData;

  const onAutoAdvanceRef = useRef(onAutoAdvance);
  onAutoAdvanceRef.current = onAutoAdvance;

  const [scheduleInfo, setScheduleInfo] = useState<RealtimeDrawScheduleInfo>(() =>
    getRealtimeDrawSchedule(playType, historyData)
  );

  const [currentLiveTime, setCurrentLiveTime] = useState<string>(() =>
    formatDateTimeStr(getBeijingDate())
  );

  // Primitive dependency check: only recalculate if playType or the top baseline issue string changes
  const latestIssueId = historyData[0]?.issue || '';
  const historyLength = historyData.length;

  useEffect(() => {
    setScheduleInfo(getRealtimeDrawSchedule(playType, historyRef.current));
  }, [playType, latestIssueId, historyLength]);

  // Stable 1-second interval that does not recreate on every render
  useEffect(() => {
    const timer = setInterval(() => {
      const now = getBeijingDate();
      setCurrentLiveTime(formatDateTimeStr(now));

      const updated = getRealtimeDrawSchedule(playType, historyRef.current);
      setScheduleInfo((prev) => {
        if (prev.targetIssue !== updated.targetIssue && onAutoAdvanceRef.current) {
          onAutoAdvanceRef.current();
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [playType]);

  return {
    scheduleInfo,
    currentLiveTime
  };
}
