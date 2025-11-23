import {
  Firestore,
  WriteBatch,
  CollectionReference,
  DocumentReference,
} from 'firebase-admin/firestore';
import { ILogger } from './logger';
import { IStatistics } from './types/IStatistics';

/**
 * Creates a Proxy around a Firestore instance that intercepts write operations
 * to track statistics and optionally prevent actual writes (dry run mode).
 *
 * @param firestore - The Firestore instance to proxy
 * @param logger - Logger instance for outputting write operations
 * @param stats - Statistics object to track write operations
 * @param dryRun - If true, prevents actual writes; if false, allows real writes while tracking stats
 * @returns A proxied Firestore instance
 */
export const proxyFirestore = (
  firestore: Firestore,
  logger: ILogger,
  stats: IStatistics,
  dryRun: boolean = false,
): Firestore => {
  return new Proxy(firestore, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      // If it's not a function, return as-is
      if (typeof original !== 'function') {
        return original;
      }

      // Return a wrapped function
      return function (...args: any[]) {
        // Call the original method to get the result (e.g., collection, doc references)
        const result = original.apply(target, args);

        // If result is a WriteBatch, proxy it
        if (result instanceof WriteBatch) {
          return proxyWriteBatch(result, logger, stats, dryRun);
        }

        // If result is a CollectionReference, proxy it
        if (result instanceof CollectionReference) {
          return proxyCollectionReference(result, logger, stats, dryRun);
        }

        // If result is a DocumentReference, proxy it
        if (result instanceof DocumentReference) {
          return proxyDocumentReference(result, logger, stats, dryRun);
        }

        return result;
      };
    },
  });
};

/**
 * Proxies a WriteBatch to track operations and optionally prevent execution
 */
function proxyWriteBatch(
  batch: WriteBatch,
  logger: ILogger,
  stats: IStatistics,
  dryRun: boolean,
): WriteBatch {
  return new Proxy(batch, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== 'function') {
        return original;
      }

      // Intercept write methods
      if (prop === 'create') {
        return function (ref: DocumentReference, data: any) {
          stats.created += 1;
          logger.debug('Creating', ref.path, JSON.stringify(data));
          if (!dryRun) {
            return original.call(target, ref, data);
          }
          return receiver;
        };
      }

      if (prop === 'set') {
        return function (
          ref: DocumentReference,
          data: any,
          options?: { merge?: boolean },
        ) {
          stats.set += 1;
          const action = options?.merge ? 'Merging' : 'Setting';
          logger.debug(action, ref.path, JSON.stringify(data));
          if (!dryRun) {
            return original.call(target, ref, data, options);
          }
          return receiver;
        };
      }

      if (prop === 'update') {
        return function (ref: DocumentReference, data: any) {
          stats.updated += 1;
          logger.debug('Updating', ref.path, JSON.stringify(data));
          if (!dryRun) {
            return original.call(target, ref, data);
          }
          return receiver;
        };
      }

      if (prop === 'delete') {
        return function (ref: DocumentReference) {
          stats.deleted += 1;
          logger.debug('Deleting', ref.path);
          if (!dryRun) {
            return original.call(target, ref);
          }
          return receiver;
        };
      }

      if (prop === 'commit') {
        return async function () {
          if (dryRun) {
            logger.debug('Committing batch (dry-run mode, no actual write)');
            return [];
          }
          return original.call(target);
        };
      }

      return function (...args: any[]) {
        return original.apply(target, args);
      };
    },
  });
}

/**
 * Proxies a CollectionReference to track operations and optionally prevent execution
 */
function proxyCollectionReference(
  collection: CollectionReference,
  logger: ILogger,
  stats: IStatistics,
  dryRun: boolean,
): CollectionReference {
  return new Proxy(collection, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== 'function') {
        return original;
      }

      // Intercept add method
      if (prop === 'add') {
        return async function (data: any) {
          stats.added += 1;
          logger.debug('Adding to', target.path, JSON.stringify(data));
          if (!dryRun) {
            return original.call(target, data);
          }
          // Return a mock DocumentReference in dry-run mode
          return target.doc('mock-doc-id');
        };
      }

      // Intercept doc method to return proxied DocumentReference
      if (prop === 'doc') {
        return function (...args: any[]) {
          const docRef = original.apply(target, args);
          return proxyDocumentReference(docRef, logger, stats, dryRun);
        };
      }

      return function (...args: any[]) {
        const result = original.apply(target, args);

        // Proxy any returned CollectionReference
        if (result instanceof CollectionReference) {
          return proxyCollectionReference(result, logger, stats, dryRun);
        }

        return result;
      };
    },
  });
}

/**
 * Proxies a DocumentReference to track operations and optionally prevent execution
 */
function proxyDocumentReference(
  doc: DocumentReference,
  logger: ILogger,
  stats: IStatistics,
  dryRun: boolean,
): DocumentReference {
  return new Proxy(doc, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== 'function') {
        return original;
      }

      // Intercept create method
      if (prop === 'create') {
        return async function (data: any) {
          stats.created += 1;
          logger.debug('Creating', target.path, JSON.stringify(data));
          if (!dryRun) {
            return original.call(target, data);
          }
          return { writeTime: new Date() } as any;
        };
      }

      // Intercept set method
      if (prop === 'set') {
        return async function (data: any, options?: { merge?: boolean }) {
          stats.set += 1;
          const action = options?.merge ? 'Merging' : 'Setting';
          logger.debug(action, target.path, JSON.stringify(data));
          if (!dryRun) {
            return original.call(target, data, options);
          }
          return { writeTime: new Date() } as any;
        };
      }

      // Intercept update method
      if (prop === 'update') {
        return async function (data: any) {
          stats.updated += 1;
          logger.debug('Updating', target.path, JSON.stringify(data));
          if (!dryRun) {
            return original.call(target, data);
          }
          return { writeTime: new Date() } as any;
        };
      }

      // Intercept delete method
      if (prop === 'delete') {
        return async function () {
          stats.deleted += 1;
          logger.debug('Deleting', target.path);
          if (!dryRun) {
            return original.call(target);
          }
          return { writeTime: new Date() } as any;
        };
      }

      // Intercept collection method to return proxied CollectionReference
      if (prop === 'collection') {
        return function (...args: any[]) {
          const collectionRef = original.apply(target, args);
          return proxyCollectionReference(collectionRef, logger, stats, dryRun);
        };
      }

      return function (...args: any[]) {
        const result = original.apply(target, args);

        // Proxy any returned DocumentReference
        if (result instanceof DocumentReference) {
          return proxyDocumentReference(result, logger, stats, dryRun);
        }

        // Proxy any returned CollectionReference
        if (result instanceof CollectionReference) {
          return proxyCollectionReference(result, logger, stats, dryRun);
        }

        return result;
      };
    },
  });
}
