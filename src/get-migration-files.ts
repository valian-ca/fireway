import fs from 'node:fs'
import path from 'node:path'

import { coerce } from 'semver'

import { type IMigrationFileMeta } from './types.js'

const currentDir = (dir: string) => {
  if (!path.isAbsolute(dir)) {
    return path.join(process.cwd(), dir)
  }
  return dir
}

export const getMigrationFiles = (dir: string) => {
  const currentDirPath = currentDir(dir)
  if (!fs.existsSync(currentDirPath)) {
    throw new Error(`No directory at ${currentDirPath}`)
  }

  const filenames = fs.readdirSync(currentDirPath).filter((file) => {
    const stat = fs.statSync(path.join(currentDirPath, file))
    return !stat.isDirectory()
  })

  // Parse the version numbers from the script filenames
  const versionToFile = new Map<string, string>()

  return filenames.flatMap((filename) => {
    // Skip files that start with a dot
    if (filename.startsWith('.')) return []

    const [filenameVersion, description] = filename.split('__')
    const coerced = coerce(filenameVersion)

    if (!coerced) {
      if (description) {
        throw new Error(
          `This filename doesn't match the required format 'v0.0.0__description', please provide semver for: ${filename}`,
        )
      }
      return []
    }

    // If there's a version, but no description, we have an issue
    if (!description) {
      throw new Error(
        `This filename doesn't match the required format 'v0.0.0__description', please provide description for: ${filename}`,
      )
    }

    const { version } = coerced

    const existingFile = versionToFile.get(version)
    if (existingFile) {
      throw new Error(`Both ${filename} and ${existingFile} have the same version`)
    }

    versionToFile.set(version, filename)

    return [
      {
        filename,
        path: path.join(dir, filename),
        version,
        description: path.basename(description, path.extname(description)),
      } as const satisfies IMigrationFileMeta,
    ]
  })
}
