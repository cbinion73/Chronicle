import { useEffect, useState } from 'react';
import { localDateKey } from './dailyScripture';

export function useLocalDateKey() {
  const [today, setToday] = useState(() => localDateKey());

  useEffect(() => {
    const refresh = () => setToday(localDateKey());
    let midnightTimer = 0;
    const scheduleMidnightRefresh = () => {
      window.clearTimeout(midnightTimer);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
      midnightTimer = window.setTimeout(() => {
        refresh();
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime());
    };
    const refreshAndReschedule = () => {
      refresh();
      scheduleMidnightRefresh();
    };
    const timezoneTimer = window.setInterval(refreshAndReschedule, 30_000);
    scheduleMidnightRefresh();
    window.addEventListener('focus', refreshAndReschedule);
    document.addEventListener('visibilitychange', refreshAndReschedule);
    return () => {
      window.clearInterval(timezoneTimer);
      window.clearTimeout(midnightTimer);
      window.removeEventListener('focus', refreshAndReschedule);
      document.removeEventListener('visibilitychange', refreshAndReschedule);
    };
  }, []);

  return today;
}
