import type { Program, ProgramDay, ScheduledWorkout, WorkoutSession } from '../db/types';

export type NextWorkout =
  | { source: 'scheduled'; day: ProgramDay; program: Program; date: string; scheduleId: string }
  | { source: 'rotation'; day: ProgramDay; program: Program }
  | null;

/** Lịch hẹn CHƯA được hoàn thành (không có buổi completed, chưa xóa, mang scheduleId của nó). Một nơi duy nhất. */
export function openSchedules(schedule: ScheduledWorkout[], sessions: Pick<WorkoutSession, 'status' | 'deletedAt' | 'scheduleId'>[]): ScheduledWorkout[] {
  const used = new Set(sessions.filter((s) => s.status === 'completed' && !s.deletedAt).map((s) => s.scheduleId).filter(Boolean));
  return schedule.filter((x) => !used.has(x.id)).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Lịch hẹn ĐẾN HẠN: hôm nay hoặc đã qua mà chưa có buổi hoàn thành gắn scheduleId.
 * Dùng chung cho huy hiệu app, thông báo khi mở app và thẻ trên trang Hôm nay.
 */
export function dueSchedules(schedule: ScheduledWorkout[], sessions: Pick<WorkoutSession, 'status' | 'deletedAt' | 'scheduleId'>[], today: string): ScheduledWorkout[] {
  return openSchedules(schedule, sessions).filter((x) => x.date <= today);
}

/**
 * Buổi kế tiếp:
 * 1) Lịch đã đặt sớm nhất từ hôm nay trở đi mà chưa có buổi hoàn thành gắn với nó.
 * 2) Nếu không có: ngày tiếp theo trong vòng xoay của giáo án đang dùng (sau buổi hoàn thành gần nhất).
 * Không giả định ngày cố định trong tuần.
 */
export function nextWorkout(params: {
  program: Program | null;
  programs: Program[];
  sessions: WorkoutSession[];
  schedule: ScheduledWorkout[];
  today: string;
}): NextWorkout {
  const { program, programs, sessions, schedule, today } = params;
  const done = sessions.filter((s) => s.status === 'completed' && !s.deletedAt);
  const upcoming = openSchedules(schedule, sessions).filter((x) => x.date >= today);
  for (const sch of upcoming) {
    const p = programs.find((pp) => pp.id === sch.programId);
    const d = p?.days.find((dd) => dd.id === sch.programDayId);
    if (p && d) return { source: 'scheduled', day: d, program: p, date: sch.date, scheduleId: sch.id };
  }
  if (!program || program.days.length === 0) return null;
  const last = done
    .filter((s) => s.programId === program.id && s.programDayId)
    .sort((a, b) => (a.date === b.date ? b.startedAt.localeCompare(a.startedAt) : b.date.localeCompare(a.date)))[0];
  if (!last) return { source: 'rotation', day: program.days[0]!, program };
  const idx = program.days.findIndex((d) => d.id === last.programDayId);
  const next = program.days[(idx + 1) % program.days.length]!;
  return { source: 'rotation', day: next, program };
}
