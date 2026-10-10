import { readFile, writeFile, rename, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export const dataDir = path.resolve(process.env.DATA_DIR || 'data');
export async function readContent() {
  return JSON.parse(await readFile(path.join(dataDir, 'content.json'), 'utf8'));
}
let queue = Promise.resolve();
export function persistContent(c: any) {
  const task = queue.then(async () => {
    const old = await readContent();
    if (c.revision !== old.revision)
      throw Error(
        'Conflict: another editor saved changes. Reload before saving.',
      );
    await mkdir(path.join(dataDir, 'backups'), { recursive: true });
    await copyFile(
      path.join(dataDir, 'content.json'),
      path.join(dataDir, 'backups', `${Date.now()}-${old.revision}.json`),
    );
    const next = { ...c, revision: old.revision + 1 };
    const temp = path.join(dataDir, `${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(next, null, 2));
    await rename(temp, path.join(dataDir, 'content.json'));
    return next;
  });
  queue = task.then(
    () => {},
    () => {},
  );
  return task;
}
