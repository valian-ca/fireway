"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
const LogLevel_1 = require("./LogLevel");
class ConsoleLogger {
    constructor(level) {
        this.levelOrder = LogLevel_1.LogLevel.debug;
        this.levelOrder = LogLevel_1.LogLevel[level];
    }
    error(message, ...optionalParams) {
        if (this.levelOrder <= LogLevel_1.LogLevel.error) {
            console.error(message, optionalParams);
        }
    }
    warn(message, ...optionalParams) {
        if (this.levelOrder <= LogLevel_1.LogLevel.warn) {
            console.warn(message, optionalParams);
        }
    }
    log(message, ...optionalParams) {
        if (this.levelOrder <= LogLevel_1.LogLevel.log) {
            console.log(message, optionalParams);
        }
    }
    debug(message, ...optionalParams) {
        if (this.levelOrder <= LogLevel_1.LogLevel.debug) {
            console.debug(message, optionalParams);
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
//# sourceMappingURL=ConsoleLogger.js.map