import fs from 'node:fs'
import { userInfo } from 'node:os'
import path from 'node:path'

import { type ConsolaInstance } from 'consola'
import { type App } from 'firebase-admin/app'
import { type Firestore } from 'firebase-admin/firestore'
import { createJiti } from 'jiti'
import md5 from 'md5'

import { type MigrationResult } from './migration-converter'
import { type IMigrationFileMeta, type IMigrationSource } from './types'

const jiti = createJiti(import.meta.url)
const importMigrationFile = async (filePath: string) => {
  try {
    return await jiti.import<
      Partial<IMigrationSource> & {
        default?: Partial<IMigrationSource>
      }
    >(filePath)
  } catch (error) {
    throw new Error(`Error importing migration file ${filePath}`, {
      cause: error,
    })
  }
}

export const runMigration = async ({
  logger,
  file,
  app,
  firestore,
  dryRun,
  installed_rank,
}: {
  logger: ConsolaInstance
  file: IMigrationFileMeta
  app: App
  firestore: Firestore
  dryRun: boolean
  installed_rank: number
}) => {
  const migration = await importMigrationFile(file.path)
  const migrationScript = migration.migrate ?? migration.default?.migrate ?? migration.default

  if (!migrationScript || typeof migrationScript !== 'function') {
    throw new Error(`Migration file ${file.filename} must export a migrate function`)
  }

  let success = false
  let finish: Date
  const start = new Date()
  try {
    await migrationScript({
      app,
      firestore,
      dryRun,
    })
    success = true
  } catch (error) {
    logger.error(`Error in ${file.filename}`, error)
  } finally {
    finish = new Date()
  }

  // Upload the results
  logger.debug(`Uploading the results for ${file.filename}`)

  return {
    installed_rank,
    description: file.description,
    version: file.version,
    script: file.filename,
    type: path.extname(file.filename).slice(1),
    checksum: md5(fs.readFileSync(file.path, 'utf8')),
    installed_by: userInfo().username,
    installed_on: start,
    execution_time: finish.getTime() - start.getTime(),
    success,
  } as const satisfies MigrationResult
}
