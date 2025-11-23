#!/usr/bin/env node

import { cac } from 'cac';
import { MigrateProps, migrate } from './migrate.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8'),
);

const cli = cac('@valian/fireway');
cli.version(pkg.version);

cli
  .command('migrate', 'Migrates schema to the latest version')
  .option('--path <path>', 'Path to migration files', {
    default: './migrations',
  })
  .option(
    '--collection <collection>',
    'Firebase collection name for migration results',
    { default: 'fireway' },
  )
  .option('--dryRun', 'Simulates changes')
  .option(
    '--logLevel <level>',
    'Log level, options: debug | log | warn | error',
    {
      default: 'log',
    },
  )
  .example('migrate')
  .example('migrate --path=./my-migrations')
  .example('migrate --collection=fireway')
  .example('migrate --dryRun')
  .example('migrate --logLevel=debug')
  .action(async (opts: MigrateProps) => {
    try {
      await migrate(opts);
    } catch (e: any) {
      console.error('ERROR:', e.message);
      process.exit(1);
    }
  });

cli.help();
cli.parse();
