"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRequiredLib = void 0;
const loadRequiredLib = (requireLibPath, logger) => {
    if (requireLibPath) {
        try {
            require(requireLibPath);
        }
        catch (e) {
            logger.error(e);
            throw new Error(`Trouble executing require('${requireLibPath}');`);
        }
    }
};
exports.loadRequiredLib = loadRequiredLib;
//# sourceMappingURL=loadRequiredLib.js.map