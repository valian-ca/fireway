import { consola } from 'consola'
import { type App, initializeApp } from 'firebase-admin/app'
import { type DocumentData, type Firestore, getFirestore, Timestamp } from 'firebase-admin/firestore'
import functionsTest from 'firebase-functions-test'
import { nanoid } from 'nanoid'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { runMigratations } from '../run-migrations'

let app: App
let firestore: Firestore

const testHelper = functionsTest()

beforeEach(() => {
  app = initializeApp({ projectId: `demo-fireway` }, nanoid())
  firestore = getFirestore(app)
})

beforeAll(() => {
  consola.wrapAll()
})

beforeEach(() => {
  consola.mockTypes(() => vi.fn())
})

afterEach(() => testHelper.firestore.clearFirestoreData({ projectId: `demo-fireway` }))

afterEach(() => {
  testHelper.cleanup()
})

const documentData = async <T = DocumentData>(path: string): Promise<T> => {
  const ref = await firestore.doc(path).get()
  expect(ref.exists).toBe(true)
  return ref.data() as T
}

// async function assertData(path: string, expectedData: Record<string, unknown>) {
//   const ref = await firestore.doc(path).get()
//   expect(ref.exists).toBe(true)

//   // Use toMatchSnapshot with matchers, snapshot name will be auto-generated
//   expect(ref.data()).toMatchSnapshot({
//     execution_time: expect.any(Number),
//     installed_on: expect.any(Object),
//     installed_by: expect.any(String),
//   })

//   // Verify the expected data matches
//   const data = ref.data()
//   for (const [key, value] of Object.entries(expectedData)) {
//     expect(data?.[key]).toEqual(value)
//   }
// }

describe('merge: iterative', () => {
  it('should run iterative migrations', async () => {
    // Empty migration
    const stats0 = await runMigratations({
      path: `${import.meta.dirname}/fixtures/emptyMigration`,
      app,
    })
    let snapshot = await firestore.collection('fireway').get()
    expect(snapshot.size).toBe(0)

    // First migration
    const stats1 = await runMigratations({
      path: `${import.meta.dirname}/fixtures/oneMigration`,
      app,
    })
    snapshot = await firestore.collection('fireway').get()
    let dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(1)
    const [m1doc1] = dataSnapshot.docs
    expect(m1doc1.data()).toEqual({ key: 'value' })

    expect(await documentData('fireway/v0.0.0__first')).toMatchInlineSnapshot(
      {
        execution_time: expect.any(Number),
        installed_on: expect.any(Timestamp),
        installed_by: expect.any(String),
      },
      `
      {
        "checksum": "f8fa4bf33c820a3049f6948ca8efd38908f5b8a8ef95a79f869fdba95ea8f60d",
        "description": "first",
        "execution_time": Any<Number>,
        "installed_by": Any<String>,
        "installed_on": Any<Timestamp>,
        "installed_rank": 0,
        "script": "v0__first.cjs",
        "success": true,
        "type": "cjs",
        "version": "0.0.0",
      }
    `,
    )

    // Second migration
    const stats2 = await runMigratations({
      path: `${import.meta.dirname}/fixtures/iterativeMigration`,
      app,
    })
    snapshot = await firestore.collection('fireway').get()
    dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(2)
    expect(dataSnapshot.size).toBe(2)
    const [m2doc1, m2doc2] = dataSnapshot.docs
    expect(m2doc1.data()).toEqual({ key: 'value' })
    expect(m2doc2.data()).toEqual({ key: 'value' })

    expect(await documentData('fireway/v0.1.0__second')).toMatchInlineSnapshot(
      {
        execution_time: expect.any(Number),
        installed_on: expect.any(Timestamp),
        installed_by: expect.any(String),
      },
      `
      {
        "checksum": "ac8babd85f1e73ca5c39d154a9f75ccd1aaf5153adea71e506c3c981fd187f84",
        "description": "second",
        "execution_time": Any<Number>,
        "installed_by": Any<String>,
        "installed_on": Any<Timestamp>,
        "installed_rank": 1,
        "script": "v0.1__second.mjs",
        "success": true,
        "type": "mjs",
        "version": "0.1.0",
      }
    `,
    )

    expect(stats0).toEqual({
      scannedFiles: 0,
      executedFiles: 0,
      created: 0,
      set: 0,
      updated: 0,
      deleted: 0,
      added: 0,
    })
    expect(stats1).toEqual({
      scannedFiles: 1,
      executedFiles: 1,
      created: 0,
      set: 1,
      updated: 0,
      deleted: 0,
      added: 0,
    })
    expect(stats2).toEqual({
      scannedFiles: 2,
      executedFiles: 1,
      created: 0,
      set: 1,
      updated: 0,
      deleted: 0,
      added: 0,
    })
  })
})

describe('merge: error iterative', () => {
  it('should handle error migrations', async () => {
    let errorThrown = false
    try {
      await runMigratations({
        path: `${import.meta.dirname}/fixtures/errorMigration`,
        app,
      })
    } catch {
      errorThrown = true
      const snapshot = await firestore.collection('fireway').get()
      expect(snapshot.size).toBe(1)
      expect(await documentData('fireway/v0.0.0__error')).toMatchInlineSnapshot(
        {
          execution_time: expect.any(Number),
          installed_on: expect.any(Timestamp),
          installed_by: expect.any(String),
        },
        `
        {
          "checksum": "c69abad14c75916339062459b41c3925cd1bc1b5209c9d18c707fca9853c6639",
          "description": "error",
          "execution_time": Any<Number>,
          "installed_by": Any<String>,
          "installed_on": Any<Timestamp>,
          "installed_rank": 0,
          "script": "v0__error.cjs",
          "success": false,
          "type": "cjs",
          "version": "0.0.0",
        }
      `,
      )
    }
    expect(errorThrown).toBe(true)

    errorThrown = false
    try {
      await runMigratations({
        path: `${import.meta.dirname}/fixtures/errorIterativeMigration`,
        app,
      })
    } catch {
      errorThrown = true
      const snapshot = await firestore.collection('fireway').get()
      const dataSnapshot = await firestore.collection('data').get()
      expect(snapshot.size).toBe(1)
      expect(dataSnapshot.size).toBe(0)
    }
    expect(errorThrown).toBe(true)
  })
})

describe('dryRun', () => {
  it('should simulate changes without applying them', async () => {
    await runMigratations({
      dryRun: true,
      path: `${import.meta.dirname}/fixtures/oneMigration`,
      app,
    })

    const snapshot = await firestore.collection('fireway').get()
    const dataSnapshot = await firestore.collection('data').get()

    expect(snapshot.size).toBe(0)
    expect(dataSnapshot.size).toBe(0)
  })
})

describe('dryRun: delete', () => {
  it('should simulate delete operations', async () => {
    await runMigratations({
      path: `${import.meta.dirname}/fixtures/oneMigration`,
      app,
    })

    let snapshot = await firestore.collection('fireway').get()
    let dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(1)

    await runMigratations({
      dryRun: true,
      path: `${import.meta.dirname}/fixtures/deleteMigration`,
      app,
    })

    snapshot = await firestore.collection('fireway').get()
    dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1) // Dry run doesn't write migration results
    expect(dataSnapshot.size).toBe(1) // Dry run doesn't delete data
  })
})

describe('invalid name', () => {
  it('should reject invalid migration file names', async () => {
    await expect(
      runMigratations({
        path: `${import.meta.dirname}/fixtures/invalidNameMigration`,
        app,
      }),
    ).rejects.toThrow(/This filename doesn't match the required format.*/)

    try {
      await runMigratations({
        path: `${import.meta.dirname}/fixtures/invalidNameMigration`,
        app,
      })
    } catch (error) {
      expect((error as Error).message).toMatch(/This filename doesn't match the required format.*/)
      const snapshot = await firestore.collection('fireway').get()
      expect(snapshot.size).toBe(0)
    }
  })
})

describe('batch: migration count', () => {
  it('should count batch operations correctly', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/batchMigration`,
      app,
    })

    const snapshot = await firestore.collection('fireway').get()
    const dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(2)
    expect(stats).toEqual({
      scannedFiles: 1,
      executedFiles: 1,
      created: 0,
      set: 4,
      updated: 0,
      deleted: 0,
      added: 0,
    })
  })

  it('should execute batch operations in real mode', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/batchRealModeMigration`,
      app,
    })

    expect(stats.created).toBe(1)
    expect(stats.set).toBeGreaterThanOrEqual(1)
    expect(stats.updated).toBeGreaterThanOrEqual(1)
    expect(stats.deleted).toBeGreaterThanOrEqual(1)

    // Verify the operations were actually committed
    const testSnapshot = await firestore.collection('test').get()
    expect(testSnapshot.size).toBeGreaterThan(0)
  })
})

describe('all methods', () => {
  it('should track all Firestore operations', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/allMethodMigration`,
      app,
    })

    const snapshot = await firestore.collection('fireway').get()
    const dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(1)
    expect(stats).toEqual({
      scannedFiles: 1,
      executedFiles: 1,
      created: 0,
      set: 2,
      updated: 2,
      deleted: 2,
      added: 1,
    })
  })
})

describe('Delete a field', () => {
  it('should delete fields', async () => {
    await firestore.collection('data').doc('doc').set({
      field1: 'field1',
      field2: 'field2',
    })

    await runMigratations({
      path: `${import.meta.dirname}/fixtures/deleteFieldMigration`,
      app,
    })

    const snapshot = await firestore.collection('fireway').get()
    const dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(1)
    await expect(documentData('data/doc')).resolves.toEqual({
      field2: 'field2',
    })
  })
})

describe('TypeScript', () => {
  it('should run TypeScript migrations (run all TS last for perf reasons and only require TS once)', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/tsMigration`,
      app,
    })

    const snapshot = await firestore.collection('fireway').get()
    const dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(1)
    expect(stats).toEqual({
      scannedFiles: 1,
      executedFiles: 1,
      created: 0,
      set: 1,
      updated: 0,
      deleted: 0,
      added: 0,
    })
    expect(await documentData('fireway/v0.0.0__first')).toMatchInlineSnapshot(
      {
        execution_time: expect.any(Number),
        installed_on: expect.any(Timestamp),
        installed_by: expect.any(String),
      },
      `
      {
        "checksum": "d5cd4570cd3242faff7b70aa6f164c29209757d7f13f886b447e0945170a8aac",
        "description": "first",
        "execution_time": Any<Number>,
        "installed_by": Any<String>,
        "installed_on": Any<Timestamp>,
        "installed_rank": 0,
        "script": "v0__first.ts",
        "success": true,
        "type": "ts",
        "version": "0.0.0",
      }
    `,
    )
  })
})

describe('get-migration-files: edge cases', () => {
  it('should handle relative paths', async () => {
    const stats = await runMigratations({
      path: 'src/__tests__/fixtures/oneMigration',
      app,
    })
    expect(stats.scannedFiles).toBe(1)
  })

  it('should throw error for non-existent directory', async () => {
    await expect(
      runMigratations({
        path: `${import.meta.dirname}/fixtures/nonExistentDirectory`,
        app,
      }),
    ).rejects.toThrow(/No directory at/)
  })

  it('should throw error for migration without description', async () => {
    await expect(
      runMigratations({
        path: `${import.meta.dirname}/fixtures/noDescriptionMigration`,
        app,
      }),
    ).rejects.toThrow(/please provide description for/)
  })

  it('should throw error for duplicate versions', async () => {
    await expect(
      runMigratations({
        path: `${import.meta.dirname}/fixtures/duplicateVersionMigration`,
        app,
      }),
    ).rejects.toThrow(/have the same version/)
  })

  it('should throw error for invalid version with description', async () => {
    await expect(
      runMigratations({
        path: `${import.meta.dirname}/fixtures/invalidVersionMigration`,
        app,
      }),
    ).rejects.toThrow(/please provide semver for/)
  })
})

describe('run-migration: edge cases', () => {
  it('should throw error when migration has no migrate function', async () => {
    await expect(
      runMigratations({
        path: `${import.meta.dirname}/fixtures/noMigrateFunctionMigration`,
        app,
      }),
    ).rejects.toThrow(/must export a migrate function/)
  })

  it('should handle import errors gracefully', async () => {
    await expect(
      runMigratations({
        path: `${import.meta.dirname}/fixtures/importErrorMigration`,
        app,
      }),
    ).rejects.toThrow(/Error importing migration file/)
  })
})

describe('proxy-firestore: comprehensive coverage', () => {
  it('should track all proxy operations', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/proxyTestMigration`,
      app,
    })

    expect(stats.added).toBeGreaterThan(0)
    expect(stats.created).toBeGreaterThan(0)
    expect(stats.set).toBeGreaterThan(0)
    expect(stats.updated).toBeGreaterThan(0)
    expect(stats.deleted).toBeGreaterThan(0)

    const snapshot = await firestore.collection('fireway').get()
    const testSnapshot = await firestore.collection('test').get()
    expect(snapshot.size).toBe(1)
    expect(testSnapshot.size).toBeGreaterThan(0)
  })

  it('should track operations in dry run mode', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/proxyTestMigration`,
      dryRun: true,
      app,
    })

    expect(stats.added).toBeGreaterThan(0)
    expect(stats.created).toBeGreaterThan(0)
    expect(stats.set).toBeGreaterThan(0)
    expect(stats.updated).toBeGreaterThan(0)
    expect(stats.deleted).toBeGreaterThan(0)

    // In dry run mode, nothing should be persisted
    const testSnapshot = await firestore.collection('test').get()
    expect(testSnapshot.size).toBe(0)
  })

  it('should handle nested collections and proxy chains', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/nonFunctionProxyMigration`,
      app,
    })

    expect(stats.executedFiles).toBe(1)
    const nestedSnapshot = await firestore.collection('test').doc('parent').collection('nested').get()
    expect(nestedSnapshot.size).toBe(1)
  })

  it('should handle non-function properties and real operations', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/proxyNonFunctionMigration`,
      app,
    })

    expect(stats.executedFiles).toBe(1)
    expect(stats.added).toBeGreaterThan(0)
    expect(stats.created).toBeGreaterThan(0)
    expect(stats.set).toBeGreaterThan(0)
    expect(stats.updated).toBeGreaterThan(0)
    expect(stats.deleted).toBeGreaterThan(0)

    // Verify real operations were persisted
    const testSnapshot = await firestore.collection('test').get()
    expect(testSnapshot.size).toBeGreaterThan(0)
  })

  it('should handle edge cases with non-proxied return types', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/proxyEdgeCasesMigration`,
      app,
    })

    expect(stats.executedFiles).toBe(1)
  })
})

describe('run-migrations: database up to date', () => {
  it('should display "database is up to date" message when no new migrations', async () => {
    // Run migrations once
    await runMigratations({
      path: `${import.meta.dirname}/fixtures/oneMigration`,
      app,
    })

    // Run migrations again (database should be up to date)
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/oneMigration`,
      app,
    })

    expect(stats).toEqual({
      scannedFiles: 1,
      executedFiles: 0,
      created: 0,
      set: 0,
      updated: 0,
      deleted: 0,
      added: 0,
    })
  })
})
