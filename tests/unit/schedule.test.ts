import { nextWorkout } from '../../src/domain/schedule';
import { createDefaultProgram } from '../../src/data/defaultProgram';
import { session } from './fixtures';

const program = createDefaultProgram('2026-01-01T00:00:00Z');

describe('nextWorkout', () => {
  it('chưa tập buổi nào => buổi A', () => {
    const r = nextWorkout({ program, programs: [program], sessions: [], schedule: [], today: '2026-11-07' });
    expect(r).toMatchObject({ source: 'rotation', day: { id: 'day-a' } });
  });
  it('xoay vòng A → B → C → A', () => {
    const s = (d: string, day: string) => session(d, [], { programId: program.id, programDayId: day });
    const after = (sessions: ReturnType<typeof s>[]) =>
      nextWorkout({ program, programs: [program], sessions, schedule: [], today: '2026-11-07' });
    expect(after([s('2026-11-01', 'day-a')])?.day.id).toBe('day-b');
    expect(after([s('2026-11-01', 'day-a'), s('2026-11-03', 'day-b')])?.day.id).toBe('day-c');
    expect(after([s('2026-11-01', 'day-a'), s('2026-11-03', 'day-b'), s('2026-11-05', 'day-c')])?.day.id).toBe('day-a');
  });
  it('buổi đã xóa không tính', () => {
    const r = nextWorkout({
      program,
      programs: [program],
      sessions: [session('2026-11-01', [], { programId: program.id, programDayId: 'day-a', deletedAt: 'x' })],
      schedule: [],
      today: '2026-11-07',
    });
    expect(r?.day.id).toBe('day-a');
  });
  it('lịch đặt trước được ưu tiên', () => {
    const r = nextWorkout({
      program,
      programs: [program],
      sessions: [],
      schedule: [{ id: 'x', date: '2026-11-09', programId: program.id, programDayId: 'day-c', createdAt: '' }],
      today: '2026-11-07',
    });
    expect(r).toMatchObject({ source: 'scheduled', date: '2026-11-09', day: { id: 'day-c' } });
  });
  it('lịch đã qua hoặc đã hoàn thành bị bỏ qua', () => {
    const r = nextWorkout({
      program,
      programs: [program],
      sessions: [session('2026-11-08', [], { scheduleId: 'y' })],
      schedule: [
        { id: 'x', date: '2026-11-01', programId: program.id, programDayId: 'day-c', createdAt: '' },
        { id: 'y', date: '2026-11-08', programId: program.id, programDayId: 'day-b', createdAt: '' },
      ],
      today: '2026-11-07',
    });
    expect(r?.source).toBe('rotation');
  });
});

describe('dueSchedules (v1.8.0)', () => {
  it('đến hạn = hôm nay hoặc đã qua, chưa có buổi hoàn thành gắn scheduleId', async () => {
    const { dueSchedules } = await import('../../src/domain/schedule');
    const sch = (id: string, date: string) => ({ id, date, programId: program.id, programDayId: 'day-a', createdAt: '' });
    const schedule = [sch('past', '2026-11-01'), sch('today', '2026-11-07'), sch('future', '2026-11-09'), sch('done', '2026-11-05'), sch('draft', '2026-11-06'), sch('deleted', '2026-11-04')];
    const sessions = [
      session('2026-11-05', [], { scheduleId: 'done' }),
      session('2026-11-06', [], { scheduleId: 'draft', status: 'draft' }),
      session('2026-11-04', [], { scheduleId: 'deleted', deletedAt: 'x' }),
    ];
    expect(dueSchedules(schedule, sessions, '2026-11-07').map((x) => x.id)).toEqual(['past', 'deleted', 'draft', 'today']);
  });
});
