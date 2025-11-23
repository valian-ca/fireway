import { App } from 'firebase-admin/app';
import type { ConsolaInstance } from 'consola/core';
import { IMigrationFileMeta } from './types/IMigrationFileMeta.js';
import { Firestore } from 'firebase-admin/firestore';
import md5 from 'md5';
import { userInfo } from 'node:os';
import { IMigrationResult } from './types/IMigrationResult.js';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';

const jiti = createJiti(fileURLToPath(import.meta.url));

export const migrateScript = async ({
  logger,
  file,
  app,
  firestore,
  dryRun,
  installed_rank,
}: {
  logger: ConsolaInstance;
  file: IMigrationFileMeta;
  app: App;
  firestore: Firestore;
  dryRun: boolean;
  installed_rank: number;
}) => {
  let migrationScript: any;
  try {
    const mod = await jiti.import<
      { migrate: () => Promise<void> } & {
        default: { migrate: () => Promise<void> };
      }
    >(file.path);
    // Handle both CommonJS (module.exports.migrate) and ESM (export const migrate or export default)
    // CommonJS: module.exports.migrate -> mod.migrate
    // ESM named: export const migrate -> mod.migrate
    // ESM default: export default { migrate } -> mod.default.migrate
    migrationScript = mod.migrate || mod.default?.migrate || mod.default;
  } catch (e) {
    logger.error(e);
    throw new Error(`Error importing migration file ${file.filename}`, {
      cause: e,
    });
  }

  if (!migrationScript || typeof migrationScript !== 'function') {
    throw new Error(
      `Migration file ${file.filename} must export a migrate function`,
    );
  }

  let success = false;
  let start: Date, finish: Date;
  start = new Date();
  try {
    await migrationScript({
      app,
      firestore,
      dryRun,
    });
    success = true;
  } catch (e) {
    logger.error(`Error in ${file.filename}`, e);
  } finally {
    finish = new Date();
  }

  // Upload the results
  logger.debug(`Uploading the results for ${file.filename}`);

  return {
    installed_rank,
    description: file.description,
    version: file.version,
    script: file.filename,
    type: path.extname(file.filename).slice(1),
    checksum: md5(readFileSync(file.path, 'utf-8')),
    installed_by: userInfo().username,
    installed_on: start,
    execution_time: finish.getTime() - start.getTime(),
    success,
  } as const satisfies IMigrationResult;
};
