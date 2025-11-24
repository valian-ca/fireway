import { type FirestoreDataConverter, Timestamp } from 'firebase-admin/firestore'
import * as z from 'zod'

/**
 * Zod schema for validating migration data from Firestore
 * Accepts both Date objects and Firestore Timestamp-like objects
 */
export const MigrationResultZod = z.object({
  installed_rank: z.int(),
  description: z.string(),
  version: z.string(),
  script: z.string(),
  type: z.string(),
  checksum: z.string(),
  installed_by: z.string(),
  installed_on: z.instanceof(Timestamp).transform((timestamp) => timestamp.toDate()),
  execution_time: z.number(),
  success: z.boolean(),
})

export type MigrationResult = z.infer<typeof MigrationResultZod>

/**
 * Firestore converter for migration documents
 * Converts between Firestore Timestamp and JavaScript Date objects
 * Validates data structure with Zod
 */
export const migrationResultConverter: FirestoreDataConverter<z.infer<typeof MigrationResultZod>> = {
  fromFirestore(snapshot): z.infer<typeof MigrationResultZod> {
    return MigrationResultZod.parse(snapshot.data())
  },

  toFirestore(model: z.input<typeof MigrationResultZod>) {
    return model
  },
}
