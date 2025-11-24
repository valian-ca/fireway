import { type App, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { compare, gt, satisfies } from 'semver'

import { getMigrationFiles } from './get-migration-files'
import { createLogger, type LogLevelString } from './logger'
import { migrationResultConverter } from './migration-result-converter'
import { proxyFirestore } from './proxy-firestore'
import { runMigration } from './run-migration'
import { type IStatistics } from './types'

export type MigrateProps = {
  path: string
  collection?: string
  dryRun?: boolean
  logLevel?: LogLevelString
  // might be passed from tests
  app?: App
}

const envProjectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT

export const runMigratations = async ({
  path: migrationPath,
  collection = 'fireway',
  dryRun = false,
  logLevel = 'log',
  app = initializeApp(
    envProjectId
      ? {
          projectId: envProjectId,
        }
      : {},
  ),
}: MigrateProps) => {
  const logger = createLogger(logLevel)

  logger.log(`Running @valian/fireway migrations for projectId: ${app.options.projectId}`)
  const files = getMigrationFiles(migrationPath)

  const stats: IStatistics = {
    scannedFiles: files.length,
    executedFiles: 0,
    created: 0,
    set: 0,
    updated: 0,
    deleted: 0,
    added: 0,
  }

  if (stats.scannedFiles === 0) {
    logger.log(`No migration files found at "${migrationPath}".`)
    return stats
  }

  logger.debug(
    `Found ${stats.scannedFiles} migration file${stats.scannedFiles === 1 ? '' : 's'} at "${migrationPath}".`,
  )

  if (dryRun) {
    logger.log(`Dry run mode, no records will be touched.`)
  }

  const firestore = getFirestore(app)

  // Get the latest migration
  const result = await firestore
    .collection(collection)
    .withConverter(migrationResultConverter)
    .orderBy('installed_rank', 'desc')
    .limit(1)
    .get()

  const latestDoc = result.empty ? null : result.docs[0]
  const latest = latestDoc?.data()
  const latestVersion = latest?.version

  // Filter out applied migration files
  const targetFiles = latestVersion
    ? files.filter(
        (file) =>
          // run only files with greater version
          gt(file.version, latestVersion) ||
          // or if the latest is failed, we are going to re-run the script
          (!latest.success && satisfies(file.version, latestVersion)),
      )
    : [...files]

  // Sort them by semver
  targetFiles.sort((f1, f2) => compare(f1.version, f2.version))

  if (targetFiles.length > 0) {
    logger.log(`Migrating ${targetFiles.length} new file${targetFiles.length === 1 ? '' : 's'}.`)
  }

  let installedRank = latest?.installed_rank ?? -1

  // Execute them in order
  for (const file of targetFiles) {
    stats.executedFiles += 1
    logger.log(`Executing "${file.filename}"`)

    installedRank += 1

    // eslint-disable-next-line no-await-in-loop
    const migrationResult = await runMigration({
      path: migrationPath,
      logger,
      app,
      firestore: proxyFirestore(firestore, logger, stats, dryRun),
      dryRun,
      installed_rank: installedRank,
      file,
    })

    // Freeze stat tracking
    if (!dryRun) {
      // eslint-disable-next-line no-await-in-loop
      await firestore
        .collection(collection)
        .withConverter(migrationResultConverter)
        .doc(`v${file.version}__${file.description}`)
        .set(migrationResult)
    }

    if (!migrationResult.success) {
      throw new Error('Stopped at first failure')
    }
  }

  const { scannedFiles, executedFiles, added, created, updated, set, deleted } = stats

  if (scannedFiles > 0) {
    if (executedFiles === 0) {
      logger.log(`Database is up to date.`)
    } else {
      logger.log(`Docs added: ${added}, created: ${created}, updated: ${updated}, set: ${set}, deleted: ${deleted}.`)
    }
  }

  // Get the latest migration after migrations
  const resultAfterMigrations = await firestore
    .collection(collection)
    .withConverter(migrationResultConverter)
    .orderBy('installed_rank', 'desc')
    .limit(1)
    .get()

  const latestDocAfterMigration = resultAfterMigrations.empty ? null : resultAfterMigrations.docs[0]
  const latestMigration = latestDocAfterMigration?.data()

  if (latestMigration) {
    logger.log(`Current Firestore version: ${latestMigration.version} (${latestMigration.description})`)
  }

  return stats
}
