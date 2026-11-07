/** Nhắc sao lưu: hiện khi chưa từng sao lưu hoặc đã quá `maxDays` ngày, VÀ đã có ít nhất `minSessions` buổi tập. */
export const BACKUP_REMIND_DAYS = 30;
export const BACKUP_REMIND_MIN_SESSIONS = 5;

export type BackupReminder = { show: false } | { show: true; days: number | null };

export function backupReminder(lastBackupISO: string | null, completedSessions: number, now: Date = new Date()): BackupReminder {
  if (completedSessions < BACKUP_REMIND_MIN_SESSIONS) return { show: false };
  if (!lastBackupISO) return { show: true, days: null };
  const t = Date.parse(lastBackupISO);
  if (!Number.isFinite(t)) return { show: true, days: null };
  const days = Math.floor((now.getTime() - t) / 86_400_000);
  return days > BACKUP_REMIND_DAYS ? { show: true, days } : { show: false };
}

export function readLastBackup(): string | null {
  try {
    return localStorage.getItem('mgp.lastBackup');
  } catch {
    return null;
  }
}
