/// Timer store for Svelte 5 runes
/// This can be expanded later for shared state between components

export function createTimerStore() {
  // Placeholder for future shared timer state
  // Components currently manage their own state with $state runes

  const getStats = () => {
    const raw = localStorage.getItem('pomodoroStats');
    if (!raw) return { totalSessions: 0, totalMinutes: 0, streak: 0, lastDate: '' };
    return JSON.parse(raw);
  };

  const saveSession = () => {
    const stats = getStats();
    const today = new Date().toDateString();

    stats.totalSessions++;
    stats.totalMinutes += 25;

    if (stats.lastDate) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (stats.lastDate === yesterday) {
        stats.streak++;
      } else if (stats.lastDate !== today) {
        stats.streak = 1;
      }
    } else {
      stats.streak = 1;
    }

    stats.lastDate = today;
    localStorage.setItem('pomodoroStats', JSON.stringify(stats));
  };

  return {
    getStats,
    saveSession,
  };
}