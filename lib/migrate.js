"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = void 0;
const app_1 = require("firebase-admin/app");
const semver_1 = __importDefault(require("semver"));
const getMigrationFiles_1 = require("./getMigrationFiles");
const logger_1 = require("./logger");
const firestore_1 = require("firebase-admin/firestore");
const loadRequiredLib_1 = require("./loadRequiredLib");
const proxyWritableMethods_1 = require("./proxyWritableMethods");
const migrateScript_1 = require("./migrateScript");
const migrate = async ({ path: dir, collection = 'fireway', dryRun = false, require: requireLibPath, logLevel = 'log', app, }) => {
    const logger = new logger_1.ConsoleLogger(logLevel);
    if (requireLibPath) {
        (0, loadRequiredLib_1.loadRequiredLib)(requireLibPath, logger);
    }
    // might be passed from tests
    if (!app) {
        app = (0, app_1.initializeApp)();
    }
    const projectId = app.options.projectId ?? process?.env?.GCLOUD_PROJECT;
    // Create a new instance of Firestore, so we can override WriteBatch prototypes
    const firestore = new firestore_1.Firestore({
        projectId,
    });
    logger.log(`Running @dev-aces/fireway migrations for projectId: ${projectId ?? ''}`);
    const stats = {
        scannedFiles: 0,
        executedFiles: 0,
        created: 0,
        set: 0,
        updated: 0,
        deleted: 0,
        added: 0,
    };
    let files = await (0, getMigrationFiles_1.getMigrationFiles)(dir);
    stats.scannedFiles = files.length;
    if (stats.scannedFiles === 0) {
        logger.log(`No migration files found at "${dir}".`);
        return stats;
    }
    else {
        logger.debug(`Found ${stats.scannedFiles} migration file${stats.scannedFiles === 1 ? '' : 's'} at "${dir}".`);
    }
    if (dryRun) {
        logger.log(`Dry run mode, no records will be touched.`);
    }
    // Extend Firestore instance with the "stats" field,
    // so it can be used inside proxyWritableMethods
    firestore.stats = stats;
    (0, proxyWritableMethods_1.proxyWritableMethods)({ logger, dryRun });
    const resultsCollection = firestore.collection(collection);
    // Get the latest migration
    const result = (await resultsCollection
        .orderBy('installed_rank', 'desc')
        .limit(1)
        .get());
    const [latestDoc] = result.docs;
    const latest = latestDoc?.data();
    // Filter out applied migration files
    const targetFiles = latest?.version
        ? files.filter((file) => 
        // run only files with greater version
        semver_1.default.gt(file.version, latest.version) ||
            // or if the latest is failed, we are going to re-run the script
            (!latest.success && semver_1.default.satisfies(file.version, latest.version)))
        : [...files];
    // Sort them by semver
    targetFiles.sort((f1, f2) => semver_1.default.compare(f1.version, f2.version) ?? 0);
    if (targetFiles.length > 0) {
        logger.log(`Migrating ${targetFiles.length} new file${targetFiles.length === 1 ? '' : 's'}.`);
    }
    let installed_rank = -1;
    if (latest) {
        installed_rank = latest.installed_rank;
    }
    // Execute them in order
    for (const file of targetFiles) {
        stats.executedFiles += 1;
        logger.log(`Executing "${file.filename}"`);
        installed_rank += 1;
        const migrationResult = await (0, migrateScript_1.migrateScript)({
            logger,
            app,
            firestore,
            dryRun,
            installed_rank,
            file,
        });
        // Freeze stat tracking
        stats.frozen = true;
        try {
            const id = `v${file.version}__${file.description}`;
            await resultsCollection.doc(id).set(migrationResult);
        }
        finally {
            // Unfreeze stat tracking
            delete stats.frozen;
        }
        if (!migrationResult.success) {
            throw new Error('Stopped at first failure');
        }
    }
    const { scannedFiles, executedFiles, added, created, updated, set, deleted } = stats;
    if (scannedFiles > 0) {
        if (executedFiles === 0) {
            logger.log(`Database is up to date.`);
        }
        else {
            logger.log(`Docs added: ${added}, created: ${created}, updated: ${updated}, set: ${set}, deleted: ${deleted}.`);
        }
    }
    // Get the latest migration after migrations
    const resultAfterMigrations = (await resultsCollection
        .orderBy('installed_rank', 'desc')
        .limit(1)
        .get());
    const [latestDocAfterMigration] = resultAfterMigrations.docs;
    const latestMigration = latestDocAfterMigration?.data();
    if (latestMigration) {
        logger.log(`Current Firestore version: ${latestMigration.version} (${latestMigration.description})`);
    }
    return stats;
};
exports.migrate = migrate;
//# sourceMappingURL=migrate.js.map