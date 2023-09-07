import { App } from 'firebase-admin/app';
import { ILogger } from './logger';
import { IMigrationFileMeta } from './types/IMigrationFileMeta';
import { Firestore } from 'firebase-admin/firestore';
import { IMigrationResult } from './types/IMigrationResult';
export declare const migrateScript: ({ logger, file, app, firestore, dryRun, installed_rank, }: {
    logger: ILogger;
    file: IMigrationFileMeta;
    app: App;
    firestore: Firestore;
    dryRun: boolean;
    installed_rank: number;
}) => Promise<IMigrationResult>;
//# sourceMappingURL=migrateScript.d.ts.map