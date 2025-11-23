import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as firewayModule from '../index.ts';
import { consola } from 'consola';
import functionsTest from 'firebase-functions-test';
import { nanoid } from 'nanoid';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let fireway = firewayModule;
let app;
let firestore;
let currentProjectId;

const testHelper = functionsTest();

beforeEach(async () => {
  // // Clear the terminal tracking
  // terminal.reset();

  const name = nanoid();
  currentProjectId = `demo-fireway`;

  app = initializeApp({ projectId: currentProjectId }, name);
  firestore = getFirestore(app);
});

beforeAll(() => {
  consola.wrapAll();
});

beforeEach(() => {
  consola.mockTypes(() => vi.fn());
});

afterEach(() =>
  testHelper.firestore.clearFirestoreData({ projectId: currentProjectId }),
);

afterEach(async () => {
  testHelper.cleanup();
});

function wrapper(fn) {
  return async () => {
    try {
      await fn({ firestore, app });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };
}

async function assertData(firestore, path, value) {
  const ref = await firestore.doc(path).get();
  expect(ref.exists).toBe(true);
  const data = ref.data();

  if (value.execution_time) {
    expect('execution_time' in data).toBe(true);
    expect(typeof data.execution_time).toBe('number');
    delete data.execution_time;
    delete value.execution_time;
  }

  if (value.installed_on) {
    expect('installed_on' in data).toBe(true);
    expect('seconds' in data.installed_on).toBe(true);
    expect('nanoseconds' in data.installed_on).toBe(true);
    delete data.installed_on;
    delete value.installed_on;
  }

  if (value.installed_by) {
    expect('installed_by' in data).toBe(true);
    expect(typeof data.installed_by).toBe('string');
    delete data.installed_by;
    delete value.installed_by;
  }

  expect(data).toEqual(value);
}

describe('merge: iterative', () => {
  it(
    'should run iterative migrations',
    wrapper(async ({ firestore, app }) => {
      // Empty migration
      const stats0 = await fireway.migrate({
        path: __dirname + '/fixtures/emptyMigration',
        app,
        firestore,
      });
      let snapshot = await firestore.collection('fireway').get();
      expect(snapshot.size).toBe(0);

      // First migration
      const stats1 = await fireway.migrate({
        path: __dirname + '/fixtures/oneMigration',
        app,
        firestore,
      });
      snapshot = await firestore.collection('fireway').get();
      let dataSnapshot = await firestore.collection('data').get();
      expect(snapshot.size).toBe(1);
      expect(dataSnapshot.size).toBe(1);
      let [doc1] = dataSnapshot.docs;
      expect(doc1.data()).toEqual({ key: 'value' });
      await assertData(firestore, 'fireway/v0.0.0__first', {
        checksum: '3a29bfbd4a83273c613ca3d9bf40e549',
        description: 'first',
        execution_time: 251,
        installed_by: 'len',
        installed_on: {
          seconds: 1564681117,
          nanoseconds: 401000000,
        },
        installed_rank: 0,
        script: 'v0__first.js',
        success: true,
        type: 'js',
        version: '0.0.0',
      });

      // Second migration
      const stats2 = await fireway.migrate({
        path: __dirname + '/fixtures/iterativeMigration',
        app,
        firestore,
      });
      snapshot = await firestore.collection('fireway').get();
      dataSnapshot = await firestore.collection('data').get();
      expect(snapshot.size).toBe(2);
      expect(dataSnapshot.size).toBe(2);
      doc1 = dataSnapshot.docs[0];
      const doc2 = dataSnapshot.docs[1];
      expect(doc1.data()).toEqual({ key: 'value' });
      expect(doc2.data()).toEqual({ key: 'value' });
      await assertData(firestore, 'fireway/v0.1.0__second', {
        checksum: '95031069f80997d046b3cf405af9b524',
        description: 'second',
        execution_time: 251,
        installed_by: 'len',
        installed_on: {
          seconds: 1564681117,
          nanoseconds: 401000000,
        },
        installed_rank: 1,
        script: 'v0.1__second.js',
        success: true,
        type: 'js',
        version: '0.1.0',
      });

      expect(stats0).toEqual({
        scannedFiles: 0,
        executedFiles: 0,
        created: 0,
        set: 0,
        updated: 0,
        deleted: 0,
        added: 0,
      });
      expect(stats1).toEqual({
        scannedFiles: 1,
        executedFiles: 1,
        created: 0,
        set: 1,
        updated: 0,
        deleted: 0,
        added: 0,
      });
      expect(stats2).toEqual({
        scannedFiles: 2,
        executedFiles: 1,
        created: 0,
        set: 1,
        updated: 0,
        deleted: 0,
        added: 0,
      });
    }),
  );
});

describe('merge: error iterative', () => {
  it(
    'should handle error migrations',
    wrapper(async ({ firestore, app }) => {
      let errorThrown = false;
      try {
        await fireway.migrate({
          path: __dirname + '/fixtures/errorMigration',
          app,
          firestore,
        });
      } catch (e) {
        errorThrown = true;
        const snapshot = await firestore.collection('fireway').get();
        expect(snapshot.size).toBe(1);
        await assertData(firestore, 'fireway/v0.0.0__error', {
          checksum: '82c81f69f2c5276ef1eefff58c62ce5a',
          description: 'error',
          execution_time: 251,
          installed_by: 'len',
          installed_on: {
            seconds: 1564681117,
            nanoseconds: 401000000,
          },
          installed_rank: 0,
          script: 'v0__error.js',
          success: false,
          type: 'js',
          version: '0.0.0',
        });
      }
      expect(errorThrown).toBe(true);

      errorThrown = false;
      try {
        await fireway.migrate({
          path: __dirname + '/fixtures/errorIterativeMigration',
          app,
          firestore,
        });
      } catch (e) {
        errorThrown = true;
        const snapshot = await firestore.collection('fireway').get();
        const dataSnapshot = await firestore.collection('data').get();
        expect(snapshot.size).toBe(1);
        expect(dataSnapshot.size).toBe(0);
      }
      expect(errorThrown).toBe(true);
    }),
  );
});

describe('dryRun', () => {
  it(
    'should simulate changes without applying them',
    wrapper(async ({ firestore, app }) => {
      const snapshot = await firestore.collection('fireway').get();
      const dataSnapshot = await firestore.collection('data').get();

      expect(snapshot.size).toBe(0);
      expect(dataSnapshot.size).toBe(0);

      await fireway.migrate({
        dryRun: true,
        path: __dirname + '/fixtures/oneMigration',
        app,
        firestore,
      });

      const snapshot2 = await firestore.collection('fireway').get();
      const dataSnapshot2 = await firestore.collection('data').get();
      expect(snapshot2.size).toBe(0);
      expect(dataSnapshot2.size).toBe(0);
    }),
  );
});

describe('dryRun: delete', () => {
  it(
    'should simulate delete operations',
    wrapper(async ({ firestore, app }) => {
      await fireway.migrate({
        path: __dirname + '/fixtures/oneMigration',
        app,
        firestore,
      });

      let snapshot = await firestore.collection('fireway').get();
      let dataSnapshot = await firestore.collection('data').get();
      expect(snapshot.size).toBe(1);
      expect(dataSnapshot.size).toBe(1);

      await fireway.migrate({
        dryRun: true,
        path: __dirname + '/fixtures/deleteMigration',
        app,
        firestore,
      });

      snapshot = await firestore.collection('fireway').get();
      dataSnapshot = await firestore.collection('data').get();
      expect(snapshot.size).toBe(1); // Dry run doesn't write migration results
      expect(dataSnapshot.size).toBe(1); // Dry run doesn't delete data
    }),
  );
});

describe('invalid name', () => {
  it(
    'should reject invalid migration file names',
    wrapper(async ({ firestore, app }) => {
      await expect(
        fireway.migrate({
          path: __dirname + '/fixtures/invalidNameMigration',
          app,
          firestore,
        }),
      ).rejects.toThrow(/This filename doesn't match the required format.*/);

      try {
        await fireway.migrate({
          path: __dirname + '/fixtures/invalidNameMigration',
          app,
          firestore,
        });
      } catch (e) {
        expect(e.message).toMatch(
          /This filename doesn't match the required format.*/,
        );
        const snapshot = await firestore.collection('fireway').get();
        expect(snapshot.size).toBe(0);
      }
    }),
  );
});

describe('batch: migration count', () => {
  it(
    'should count batch operations correctly',
    wrapper(async ({ firestore, app }) => {
      const stats = await fireway.migrate({
        path: __dirname + '/fixtures/batchMigration',
        app,
        firestore,
      });

      const snapshot = await firestore.collection('fireway').get();
      const dataSnapshot = await firestore.collection('data').get();
      expect(snapshot.size).toBe(1);
      expect(dataSnapshot.size).toBe(2);
      expect(stats).toEqual({
        scannedFiles: 1,
        executedFiles: 1,
        created: 0,
        set: 4,
        updated: 0,
        deleted: 0,
        added: 0,
      });
    }),
  );
});

describe('all methods', () => {
  it(
    'should track all Firestore operations',
    wrapper(async ({ firestore, app }) => {
      const stats = await fireway.migrate({
        path: __dirname + '/fixtures/allMethodMigration',
        app,
        firestore,
      });

      const snapshot = await firestore.collection('fireway').get();
      const dataSnapshot = await firestore.collection('data').get();
      expect(snapshot.size).toBe(1);
      expect(dataSnapshot.size).toBe(1);
      expect(stats).toEqual({
        scannedFiles: 1,
        executedFiles: 1,
        created: 0,
        set: 2,
        updated: 2,
        deleted: 2,
        added: 1,
      });
    }),
  );
});

// Bug in "@firebase/rules-unit-testing" FieldValue.Delete is no supported
// https://github.com/firebase/firebase-js-sdk/issues/6077
// Commented the test.
//
// describe('Delete a field', () => {
//   it('should delete fields', wrapper(async ({ firestore, app }) => {
//     await firestore.collection('data').doc('doc').set({
//       field1: 'field1',
//       field2: 'field2',
//     });

//     await fireway.migrate({
//       path: __dirname + '/deleteFieldMigration',
//       app,
//       firestore,
//     });

//     const snapshot = await firestore.collection('fireway').get();
//     const dataSnapshot = await firestore.collection('data').get();
//     expect(snapshot.size).toBe(1);
//     expect(dataSnapshot.size).toBe(1);
//     await assertData(firestore, 'data/doc', {
//       field2: 'field2',
//     });
//   }));
// });

describe('TypeScript', () => {
  it(
    'should run TypeScript migrations (run all TS last for perf reasons and only require TS once)',
    wrapper(async ({ firestore, app }) => {
      const stats = await fireway.migrate({
        path: __dirname + '/fixtures/tsMigration',
        app,
        firestore,
        require: 'jiti',
      });

      const snapshot = await firestore.collection('fireway').get();
      const dataSnapshot = await firestore.collection('data').get();
      expect(snapshot.size).toBe(1);
      expect(dataSnapshot.size).toBe(1);
      expect(stats).toEqual({
        scannedFiles: 1,
        executedFiles: 1,
        created: 0,
        set: 1,
        updated: 0,
        deleted: 0,
        added: 0,
      });

      await assertData(firestore, 'fireway/v0.0.0__first', {
        checksum: '542faba96904b63068c101daeefa2c3e',
        description: 'first',
        execution_time: 251,
        installed_by: 'len',
        installed_on: {
          seconds: 1564681117,
          nanoseconds: 401000000,
        },
        installed_rank: 0,
        script: 'v0__first.ts',
        success: true,
        type: 'ts',
        version: '0.0.0',
      });
    }),
  );
});
