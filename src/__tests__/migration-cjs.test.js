import { consola } from 'consola'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import functionsTest from 'firebase-functions-test'
import { nanoid } from 'nanoid'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { runMigratations } from '../run-migrations'

let app
let firestore

const testHelper = functionsTest()

beforeEach(async () => {
  // // Clear the terminal tracking
  // terminal.reset();

  const name = nanoid()

  app = initializeApp({ projectId: `demo-fireway` }, name)
  firestore = getFirestore(app)
})

beforeAll(() => {
  consola.wrapAll()
})

beforeEach(() => {
  consola.mockTypes(() => vi.fn())
})

afterEach(() => testHelper.firestore.clearFirestoreData({ projectId: `demo-fireway` }))

afterEach(async () => {
  testHelper.cleanup()
})

async function assertData(path, value) {
  const ref = await firestore.doc(path).get()
  expect(ref.exists).toBe(true)
  const data = ref.data()

  if (value.execution_time) {
    expect('execution_time' in data).toBe(true)
    expect(typeof data.execution_time).toBe('number')
    delete data.execution_time
    delete value.execution_time
  }

  if (value.installed_on) {
    expect('installed_on' in data).toBe(true)
    expect('seconds' in data.installed_on).toBe(true)
    expect('nanoseconds' in data.installed_on).toBe(true)
    delete data.installed_on
    delete value.installed_on
  }

  if (value.installed_by) {
    expect('installed_by' in data).toBe(true)
    expect(typeof data.installed_by).toBe('string')
    delete data.installed_by
    delete value.installed_by
  }

  expect(data).toEqual(value)
}

describe('merge: iterative', () => {
  it('should run iterative migrations', async () => {
    // Empty migration
    const stats0 = await runMigratations({
      path: `${import.meta.dirname}/fixtures/emptyMigration`,
      app,
      firestore,
    })
    let snapshot = await firestore.collection('fireway').get()
    expect(snapshot.size).toBe(0)

    // First migration
    const stats1 = await runMigratations({
      path: `${import.meta.dirname}/fixtures/oneMigration`,
      app,
      firestore,
    })
    snapshot = await firestore.collection('fireway').get()
    let dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(1)
    const [m1doc1] = dataSnapshot.docs
    expect(m1doc1.data()).toEqual({ key: 'value' })
    await assertData('fireway/v0.0.0__first', {
      checksum: '3a29bfbd4a83273c613ca3d9bf40e549',
      description: 'first',
      execution_time: 251,
      installed_by: 'len',
      installed_on: {
        seconds: 1_564_681_117,
        nanoseconds: 401_000_000,
      },
      installed_rank: 0,
      script: 'v0__first.js',
      success: true,
      type: 'js',
      version: '0.0.0',
    })

    // Second migration
    const stats2 = await runMigratations({
      path: `${import.meta.dirname}/fixtures/iterativeMigration`,
      app,
      firestore,
    })
    snapshot = await firestore.collection('fireway').get()
    dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(2)
    expect(dataSnapshot.size).toBe(2)
    const [m2doc1, m2doc2] = dataSnapshot.docs
    expect(m2doc1.data()).toEqual({ key: 'value' })
    expect(m2doc2.data()).toEqual({ key: 'value' })
    await assertData('fireway/v0.1.0__second', {
      checksum: '95031069f80997d046b3cf405af9b524',
      description: 'second',
      execution_time: 251,
      installed_by: 'len',
      installed_on: {
        seconds: 1_564_681_117,
        nanoseconds: 401_000_000,
      },
      installed_rank: 1,
      script: 'v0.1__second.js',
      success: true,
      type: 'js',
      version: '0.1.0',
    })

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
        firestore,
      })
    } catch {
      errorThrown = true
      const snapshot = await firestore.collection('fireway').get()
      expect(snapshot.size).toBe(1)
      await assertData('fireway/v0.0.0__error', {
        checksum: '82c81f69f2c5276ef1eefff58c62ce5a',
        description: 'error',
        execution_time: 251,
        installed_by: 'len',
        installed_on: {
          seconds: 1_564_681_117,
          nanoseconds: 401_000_000,
        },
        installed_rank: 0,
        script: 'v0__error.js',
        success: false,
        type: 'js',
        version: '0.0.0',
      })
    }
    expect(errorThrown).toBe(true)

    errorThrown = false
    try {
      await runMigratations({
        path: `${import.meta.dirname}/fixtures/errorIterativeMigration`,
        app,
        firestore,
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
    const snapshot = await firestore.collection('fireway').get()
    const dataSnapshot = await firestore.collection('data').get()

    expect(snapshot.size).toBe(0)
    expect(dataSnapshot.size).toBe(0)

    await runMigratations({
      dryRun: true,
      path: `${import.meta.dirname}/fixtures/oneMigration`,
      app,
      firestore,
    })

    const snapshot2 = await firestore.collection('fireway').get()
    const dataSnapshot2 = await firestore.collection('data').get()
    expect(snapshot2.size).toBe(0)
    expect(dataSnapshot2.size).toBe(0)
  })
})

describe('dryRun: delete', () => {
  it('should simulate delete operations', async () => {
    await runMigratations({
      path: `${import.meta.dirname}/fixtures/oneMigration`,
      app,
      firestore,
    })

    let snapshot = await firestore.collection('fireway').get()
    let dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(1)

    await runMigratations({
      dryRun: true,
      path: `${import.meta.dirname}/fixtures/deleteMigration`,
      app,
      firestore,
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
        firestore,
      })
    ).rejects.toThrow(/This filename doesn't match the required format.*/)

    try {
      await runMigratations({
        path: `${import.meta.dirname}/fixtures/invalidNameMigration`,
        app,
        firestore,
      })
    } catch (error) {
      expect(error.message).toMatch(/This filename doesn't match the required format.*/)
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
      firestore,
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
})

describe('all methods', () => {
  it('should track all Firestore operations', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/allMethodMigration`,
      app,
      firestore,
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
      firestore,
    })

    const snapshot = await firestore.collection('fireway').get()
    const dataSnapshot = await firestore.collection('data').get()
    expect(snapshot.size).toBe(1)
    expect(dataSnapshot.size).toBe(1)
    await assertData('data/doc', {
      field2: 'field2',
    })
  })
})

describe('TypeScript', () => {
  it('should run TypeScript migrations (run all TS last for perf reasons and only require TS once)', async () => {
    const stats = await runMigratations({
      path: `${import.meta.dirname}/fixtures/tsMigration`,
      app,
      firestore,
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

    await assertData('fireway/v0.0.0__first', {
      checksum: '542faba96904b63068c101daeefa2c3e',
      description: 'first',
      execution_time: 251,
      installed_by: 'len',
      installed_on: {
        seconds: 1_564_681_117,
        nanoseconds: 401_000_000,
      },
      installed_rank: 0,
      script: 'v0__first.ts',
      success: true,
      type: 'ts',
      version: '0.0.0',
    })
  })
})
