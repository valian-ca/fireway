import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { consola, type ConsolaInstance } from 'consola'
import { type App } from 'firebase-admin/app'
import { type Firestore } from 'firebase-admin/firestore'
import { createJiti } from 'jiti'

import { type MigrationResult } from './migration-result-converter'
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
    consola.error(`Error importing migration file ${filePath}`, error)
    throw new Error(`Error importing migration file ${filePath}`, {
      cause: error,
    })
  }
}

export const runMigration = async ({
  path: migrationPath,
  logger,
  file,
  app,
  firestore,
  dryRun,
  installed_rank,
}: {
  path: string
  logger: ConsolaInstance
  file: IMigrationFileMeta
  app: App
  firestore: Firestore
  dryRun: boolean
  installed_rank: number
}) => {
  const migration = await importMigrationFile(path.resolve('.', migrationPath, file.filename))
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
    checksum: crypto.createHash('sha256').update(fs.readFileSync(file.path, 'utf8')).digest('hex'),
    installed_by: os.userInfo().username,
    installed_on: start,
    execution_time: finish.getTime() - start.getTime(),
    success,
  } as const satisfies MigrationResult
}
