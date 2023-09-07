import { ILogger } from './ILogger';
import { LogLevelString } from './LogLevel';
export declare class ConsoleLogger implements ILogger {
    private readonly levelOrder;
    constructor(level: LogLevelString);
    error(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    log(message?: any, ...optionalParams: any[]): void;
    debug(message?: any, ...optionalParams: any[]): void;
}
//# sourceMappingURL=ConsoleLogger.d.ts.map