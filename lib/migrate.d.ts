import { App } from 'firebase-admin/app';
import { LogLevelString } from './logger';
import { IStatistics } from './types/IStatistics';
export interface MigrateProps {
    path: string;
    collection?: string;
    dryRun?: boolean;
    require?: string;
    logLevel?: LogLevelString;
    app?: App;
}
export declare const migrate: ({ path: dir, collection, dryRun, require: requireLibPath, logLevel, app, }: MigrateProps) => Promise<IStatistics>;
//# sourceMappingURL=migrate.d.ts.map