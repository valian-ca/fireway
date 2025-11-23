import { IMigrationFunctionsArguments } from './IMigrationFunctionsArguments.js';

export const IMigrationSource = {
  migrate: (_: IMigrationFunctionsArguments) => Promise<void>,
};
