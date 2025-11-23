import { type App } from 'firebase-admin/app'
import { type Firestore } from 'firebase-admin/firestore'

import { type MigrationResult } from './migration-converter'

export { MigrationResult } from './migration-converter'

export type IMigrationFunctionsArguments = {
  app: App
  firestore: Firestore
  dryRun: boolean
}

// @deprecated Use MigrationResult instead
export type IMigrationResult = MigrationResult

export type IMigrationFileMeta = {
  filename: string
  path: string
  version: string
  description: string
}

export type IStatistics = {
  scannedFiles: number
  executedFiles: number
  created: number
  set: number
  updated: number
  deleted: number
  added: number
}

export type IMigrationSource = {
  migrate: (_: IMigrationFunctionsArguments) => Promise<void>
}
