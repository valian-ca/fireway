"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMigrationFiles = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const getMigrationFiles = async (dir) => {
    // Get all the scripts
    if (!path_1.default.isAbsolute(dir)) {
        dir = path_1.default.join(process.cwd(), dir);
    }
    if (!(0, fs_1.existsSync)(dir)) {
        throw new Error(`No directory at ${dir}`);
    }
    const filenames = [];
    for (const file of await fs_1.promises.readdir(dir)) {
        if (!(await fs_1.promises.stat(path_1.default.join(dir, file))).isDirectory()) {
            filenames.push(file);
        }
    }
    // Parse the version numbers from the script filenames
    const versionToFile = new Map();
    const files = filenames
        .map((filename) => {
        // Skip files that start with a dot
        if (filename[0] === '.')
            return null;
        const [filenameVersion, description] = filename.split('__');
        const coerced = semver_1.default.coerce(filenameVersion);
        if (!coerced) {
            if (description) {
                throw new Error(`This filename doesn't match the required format 'v0.0.0__description', please provide semver for: ${filename}`);
            }
            return null;
        }
        // If there's a version, but no description, we have an issue
        if (!description) {
            throw new Error(`This filename doesn't match the required format 'v0.0.0__description', please provide description for: ${filename}`);
        }
        const { version } = coerced;
        const existingFile = versionToFile.get(version);
        if (existingFile) {
            throw new Error(`Both ${filename} and ${existingFile} have the same version`);
        }
        versionToFile.set(version, filename);
        return {
            filename,
            path: path_1.default.join(dir, filename),
            version: version,
            description: path_1.default.basename(description, path_1.default.extname(description)),
        };
    })
        .filter(Boolean)
        .map((f) => f);
    return files;
};
exports.getMigrationFiles = getMigrationFiles;
//# sourceMappingURL=getMigrationFiles.js.map