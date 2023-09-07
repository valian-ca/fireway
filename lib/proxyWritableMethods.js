"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyWritableMethods = void 0;
const firestore_1 = require("firebase-admin/firestore");
let proxied = false;
const proxyWritableMethods = ({ logger, dryRun, }) => {
    // Only proxy once
    if (proxied) {
        return;
    }
    else {
        proxied = true;
    }
    let firewayQueue = [];
    const ogCommit = firestore_1.WriteBatch.prototype.commit;
    firestore_1.WriteBatch.prototype.commit = async function (...args) {
        // Empty the queue
        while (firewayQueue.length) {
            const fn = firewayQueue.shift();
            fn();
        }
        if (dryRun) {
            return [];
        }
        return ogCommit.apply(this, Array.from(args));
    };
    const skipWriteBatch = Symbol('Skip the WriteBatch proxy');
    function mitm(prototype, key, fn) {
        const original = prototype[key];
        prototype[key] = function () {
            const args = [...arguments];
            const stats = this._firestore.stats;
            // If this is a batch
            if (this instanceof firestore_1.WriteBatch) {
                const [_, doc] = args;
                if (doc && doc[skipWriteBatch]) {
                    delete doc[skipWriteBatch];
                }
                else if (!stats.frozen) {
                    firewayQueue.push(() => {
                        fn.call(this, args, stats, logger);
                    });
                }
            }
            else if (!stats.frozen) {
                fn.call(this, args, stats, logger);
            }
            return original.apply(this, args);
        };
    }
    // Add logs for each WriteBatch item
    mitm(firestore_1.WriteBatch.prototype, 'create', ([ref, doc], stats, logger) => {
        stats.created += 1;
        logger.debug('Creating', ref.path, JSON.stringify(doc));
    });
    mitm(firestore_1.WriteBatch.prototype, 'set', ([ref, doc, opts = {}], stats, logger) => {
        stats.set += 1;
        logger.debug(opts.merge ? 'Merging' : 'Setting', ref.path, JSON.stringify(doc));
    });
    mitm(firestore_1.WriteBatch.prototype, 'update', ([ref, doc], stats, logger) => {
        stats.updated += 1;
        logger.debug('Updating', ref.path, JSON.stringify(doc));
    });
    mitm(firestore_1.WriteBatch.prototype, 'delete', ([ref], stats, logger) => {
        stats.deleted += 1;
        logger.debug('Deleting', ref.path);
    });
    mitm(firestore_1.CollectionReference.prototype, 'add', ([data], stats, logger) => {
        data[skipWriteBatch] = true;
        stats.added += 1;
        logger.debug('Adding', JSON.stringify(data));
    });
};
exports.proxyWritableMethods = proxyWritableMethods;
//# sourceMappingURL=proxyWritableMethods.js.map