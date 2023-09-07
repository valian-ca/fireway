#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sade_1 = __importDefault(require("sade"));
const migrate_1 = require("./migrate");
// @ts-ignore
const package_json_1 = __importDefault(require("../package.json"));
const prog = (0, sade_1.default)('@dev-aces/fireway').version(package_json_1.default.version);
prog
    .command('migrate')
    .option('--path', 'Path to migration files', './migrations')
    .option('--collection', 'Firebase collection name for migration results', 'fireway')
    .option('--dryRun', 'Simulates changes')
    .option('--require', 'Requires a module before executing')
    .option('--logLevel', 'Log level, options: debug | log | warn | error', 'log')
    .describe('Migrates schema to the latest version')
    .example('migrate')
    .example('migrate --path=./my-migrations')
    .example('migrate --collection=fireway')
    .example('migrate --dryRun')
    .example('migrate --require="ts-node/register"')
    .example('migrate --logLevel=debug')
    .action(async (opts) => {
    try {
        await (0, migrate_1.migrate)(opts);
    }
    catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
});
prog.parse(process.argv);
//# sourceMappingURL=cli.js.map