import { App, initializeApp } from 'firebase-admin/app';
import semver from 'semver';
import { getMigrationFiles } from './getMigrationFiles.js';
import { createLogger, LogLevelString } from './logger/index.js';

import { getFirestore, QuerySnapshot } from 'firebase-admin/firestore';
import { IMigrationResult } from './types/IMigrationResult.js';
import { IStatistics } from './types/IStatistics.js';
import { migrateScript } from './migrateScript.js';
import { proxyFirestore } from './proxyFirestore.js';

export interface MigrateProps {
  path: string;
  collection?: string;
  dryRun?: boolean;
  logLevel?: LogLevelString;
  // might be passed from tests
  app?: App;
}

export const migrate = async ({
  path: dir,
  collection = 'fireway',
  dryRun = false,
  logLevel = 'log',
  app,
}: MigrateProps) => {
  const logger = createLogger(logLevel);

  // might be passed from tests
  if (!app) {
    app = initializeApp();
  }

  const projectId = app.options.projectId ?? process?.env?.GCLOUD_PROJECT;

  // Create a new instance of Firestore, so we can override WriteBatch prototypes
  let firestore = getFirestore(app);
  const resultsCollection = firestore.collection(collection);

  logger.log(
    `Running @valian/fireway migrations for projectId: ${projectId ?? ''}`,
  );

  const stats: IStatistics = {
    scannedFiles: 0,
    executedFiles: 0,
    created: 0,
    set: 0,
    updated: 0,
    deleted: 0,
    added: 0,
  };

  let files = await getMigrationFiles(dir);

  stats.scannedFiles = files.length;

  if (stats.scannedFiles === 0) {
    logger.log(`No migration files found at "${dir}".`);
    return stats;
  } else {
    logger.debug(
      `Found ${stats.scannedFiles} migration file${
        stats.scannedFiles === 1 ? '' : 's'
      } at "${dir}".`,
    );
  }

  // Always apply the proxy to track statistics
  // In dryRun mode, it will also prevent actual writes
  if (dryRun) {
    logger.log(`Dry run mode, no records will be touched.`);
  }

  // Get the latest migration
  const result = (await resultsCollection
    .orderBy('installed_rank', 'desc')
    .limit(1)
    .get()) as QuerySnapshot<IMigrationResult>;

  const [latestDoc] = result.docs;
  const latest = latestDoc?.data();

  // Filter out applied migration files
  const targetFiles = latest?.version
    ? files.filter(
        (file) =>
          // run only files with greater version
          semver.gt(file.version, latest.version) ||
          // or if the latest is failed, we are going to re-run the script
          (!latest.success && semver.satisfies(file.version, latest.version)),
      )
    : [...files];

  // Sort them by semver
  targetFiles.sort((f1, f2) => semver.compare(f1.version, f2.version) ?? 0);

  if (targetFiles.length > 0) {
    logger.log(
      `Migrating ${targetFiles.length} new file${
        targetFiles.length === 1 ? '' : 's'
      }.`,
    );
  }

  let installed_rank = -1;
  if (latest) {
    installed_rank = latest.installed_rank;
  }

  // Execute them in order
  for (const file of targetFiles) {
    stats.executedFiles += 1;
    logger.log(`Executing "${file.filename}"`);

    installed_rank += 1;

    const migrationResult = await migrateScript({
      logger,
      app,
      firestore: proxyFirestore(firestore, logger, stats, dryRun),
      dryRun,
      installed_rank,
      file,
    });

    // Freeze stat tracking
    const id = `v${file.version}__${file.description}`;
    if (!dryRun) {
      await resultsCollection.doc(id).set(migrationResult);
    }

    if (!migrationResult.success) {
      throw new Error('Stopped at first failure');
    }
  }

  const { scannedFiles, executedFiles, added, created, updated, set, deleted } =
    stats;

  if (scannedFiles > 0) {
    if (executedFiles === 0) {
      logger.log(`Database is up to date.`);
    } else {
      logger.log(
        `Docs added: ${added}, created: ${created}, updated: ${updated}, set: ${set}, deleted: ${deleted}.`,
      );
    }
  }

  // Get the latest migration after migrations
  const resultAfterMigrations = (await resultsCollection
    .orderBy('installed_rank', 'desc')
    .limit(1)
    .get()) as QuerySnapshot<IMigrationResult>;

  const [latestDocAfterMigration] = resultAfterMigrations.docs;
  const latestMigration = latestDocAfterMigration?.data();

  if (latestMigration) {
    logger.log(
      `Current Firestore version: ${latestMigration.version} (${latestMigration.description})`,
    );
  }

  return stats;
};
