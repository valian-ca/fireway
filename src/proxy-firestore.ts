/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-param-reassign */
import { CollectionReference, DocumentReference, type Firestore, WriteBatch } from 'firebase-admin/firestore'

import { type ILogger } from './logger'
import { type IStatistics } from './types'

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
export const proxyFirestore = (firestore: Firestore, logger: ILogger, stats: IStatistics, dryRun = false): Firestore =>
  new Proxy(firestore, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver)

      // If it's not a function, return as-is
      if (typeof original !== 'function') {
        return original
      }

      // Return a wrapped function
      return function (...args: unknown[]) {
        // Call the original method to get the result (e.g., collection, doc references)
        const result = original.apply(target, args)

        // If result is a WriteBatch, proxy it
        if (result instanceof WriteBatch) {
          return proxyWriteBatch(result, logger, stats, dryRun)
        }

        // If result is a CollectionReference, proxy it
        if (result instanceof CollectionReference) {
          return proxyCollectionReference(result, logger, stats, dryRun)
        }

        // If result is a DocumentReference, proxy it
        if (result instanceof DocumentReference) {
          return proxyDocumentReference(result, logger, stats, dryRun)
        }

        return result
      }
    },
  })

/**
 * Proxies a WriteBatch to track operations and optionally prevent execution
 */
function proxyWriteBatch(batch: WriteBatch, logger: ILogger, stats: IStatistics, dryRun: boolean): WriteBatch {
  return new Proxy(batch, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver)

      if (typeof original !== 'function') {
        return original
      }

      // Intercept write methods
      if (prop === 'create') {
        return (ref: DocumentReference, data: unknown) => {
          stats.created += 1
          logger.debug('Creating', ref.path, data)
          if (!dryRun) {
            return original.call(target, ref, data)
          }
          return receiver
        }
      }

      if (prop === 'set') {
        return function (ref: DocumentReference, data: unknown, options?: { merge?: boolean }) {
          stats.set += 1
          const action = options?.merge ? 'Merging' : 'Setting'
          logger.debug(action, ref.path, JSON.stringify(data))
          if (!dryRun) {
            return original.call(target, ref, data, options)
          }
          return receiver
        }
      }

      if (prop === 'update') {
        return function (ref: DocumentReference, data: unknown) {
          stats.updated += 1
          logger.debug('Updating', ref.path, JSON.stringify(data))
          if (!dryRun) {
            return original.call(target, ref, data)
          }
          return receiver
        }
      }

      if (prop === 'delete') {
        return function (ref: DocumentReference) {
          stats.deleted += 1
          logger.debug('Deleting', ref.path)
          if (!dryRun) {
            return original.call(target, ref)
          }
          return receiver
        }
      }

      if (prop === 'commit') {
        return function () {
          if (dryRun) {
            logger.debug('Committing batch (dry-run mode, no actual write)')
            return []
          }
          return original.call(target)
        }
      }

      return function (...args: unknown[]) {
        return original.apply(target, args)
      }
    },
  })
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
      const original = Reflect.get(target, prop, receiver)

      if (typeof original !== 'function') {
        return original
      }

      // Intercept add method
      if (prop === 'add') {
        return function (data: unknown) {
          stats.added += 1
          logger.debug('Adding to', target.path, JSON.stringify(data))
          if (!dryRun) {
            return original.call(target, data)
          }
          // Return a mock DocumentReference in dry-run mode
          return target.doc('mock-doc-id')
        }
      }

      // Intercept doc method to return proxied DocumentReference
      if (prop === 'doc') {
        return function (...args: unknown[]) {
          const docRef = original.apply(target, args)
          return proxyDocumentReference(docRef, logger, stats, dryRun)
        }
      }

      return function (...args: unknown[]) {
        const result = original.apply(target, args)

        // Proxy any returned CollectionReference
        if (result instanceof CollectionReference) {
          return proxyCollectionReference(result, logger, stats, dryRun)
        }

        return result
      }
    },
  })
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
      const original = Reflect.get(target, prop, receiver)

      if (typeof original !== 'function') {
        return original
      }

      // Intercept create method
      if (prop === 'create') {
        return function (data: unknown) {
          stats.created += 1
          logger.debug('Creating', target.path, JSON.stringify(data))
          if (!dryRun) {
            return original.call(target, data)
          }
          return { writeTime: new Date() }
        }
      }

      // Intercept set method
      if (prop === 'set') {
        return function (data: unknown, options?: { merge?: boolean }) {
          stats.set += 1
          const action = options?.merge ? 'Merging' : 'Setting'
          logger.debug(action, target.path, JSON.stringify(data))
          if (!dryRun) {
            return original.call(target, data, options)
          }
          return { writeTime: new Date() }
        }
      }

      // Intercept update method
      if (prop === 'update') {
        return function (...args: unknown[]) {
          stats.updated += 1
          logger.debug('Updating', target.path, ...args)
          if (!dryRun) {
            return original.call(target, ...args)
          }
          return { writeTime: new Date() }
        }
      }

      // Intercept delete method
      if (prop === 'delete') {
        return function (...args: unknown[]) {
          stats.deleted += 1
          logger.debug('Deleting', target.path, ...args)
          if (!dryRun) {
            return original.call(target, ...args)
          }
          return { writeTime: new Date() }
        }
      }

      // Intercept collection method to return proxied CollectionReference
      if (prop === 'collection') {
        return function (...args: unknown[]) {
          const collectionRef = original.apply(target, args)
          return proxyCollectionReference(collectionRef, logger, stats, dryRun)
        }
      }

      return function (...args: unknown[]) {
        const result = original.apply(target, args)

        // Proxy any returned DocumentReference
        if (result instanceof DocumentReference) {
          return proxyDocumentReference(result, logger, stats, dryRun)
        }

        // Proxy any returned CollectionReference
        if (result instanceof CollectionReference) {
          return proxyCollectionReference(result, logger, stats, dryRun)
        }

        return result
      }
    },
  })
}

/* eslint-enable @typescript-eslint/no-unsafe-call */
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable @typescript-eslint/no-unsafe-return */
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
/* eslint-enable @typescript-eslint/no-unsafe-argument */
/* eslint-enable no-param-reassign */
