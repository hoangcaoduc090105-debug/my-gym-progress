import { db } from '../../src/db/db';
import { ensureSeed } from '../../src/db/seed';

export async function resetDb(): Promise<void> {
  await db.open();
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear();
  });
  await ensureSeed();
}
