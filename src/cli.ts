#!/usr/bin/env node

import { cac } from 'cac'

import pkg from '../package.json'

import { type MigrateProps, runMigratations } from './run-migrations.js'

const cli = cac('@valian/fireway')
cli.version(pkg.version)

cli
  .command('migrate', 'Migrates schema to the latest version')
  .option('--path <path>', 'Path to migration files', {
    default: './migrations',
  })
  .option('--collection <collection>', 'Firebase collection name for migration results', { default: 'fireway' })
  .option('--dryRun', 'Simulates changes')
  .option('--logLevel <level>', 'Log level, options: debug | log | warn | error', {
    default: 'log',
  })
  .example('migrate')
  .example('migrate --path=./my-migrations')
  .example('migrate --collection=fireway')
  .example('migrate --dryRun')
  .example('migrate --logLevel=debug')
  .action(async (opts: MigrateProps) => {
    try {
      await runMigratations(opts)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('ERROR:', error)
      process.exit(1)
    }
  })

cli.help()
cli.parse()
