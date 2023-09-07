"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateScript = void 0;
const md5_1 = __importDefault(require("md5"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const migrateScript = async ({ logger, file, app, firestore, dryRun, installed_rank, }) => {
    var _a;
    let migrationScript;
    try {
        migrationScript = await (_a = file.path, Promise.resolve().then(() => __importStar(require(_a))));
    }
    catch (e) {
        logger.error(e);
        throw e;
    }
    let success = false;
    let start, finish;
    start = new Date();
    try {
        await migrationScript.migrate({
            app,
            firestore,
            dryRun,
        });
        success = true;
    }
    catch (e) {
        logger.error(`Error in ${file.filename}`, e);
    }
    finally {
        finish = new Date();
    }
    // Upload the results
    logger.debug(`Uploading the results for ${file.filename}`);
    const migrationResult = {
        installed_rank,
        description: file.description,
        version: file.version,
        script: file.filename,
        type: path_1.default.extname(file.filename).slice(1),
        checksum: (0, md5_1.default)(await fs_1.promises.readFile(file.path)),
        installed_by: (0, os_1.userInfo)().username,
        installed_on: start,
        execution_time: finish.getTime() - start.getTime(),
        success,
    };
    return migrationResult;
};
exports.migrateScript = migrateScript;
//# sourceMappingURL=migrateScript.js.map