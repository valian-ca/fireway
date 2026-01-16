import { base } from '@valian/eslint-config/base'
import { importSort } from '@valian/eslint-config/import-sort'
import { json } from '@valian/eslint-config/json'
import { typescript } from '@valian/eslint-config/typescript'
import { vitest } from '@valian/eslint-config/vitest'
import { zod } from '@valian/eslint-config/zod'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  ...base,
  ...typescript,
  ...importSort,
  ...json,
  ...vitest,
  ...zod,
  globalIgnores(['**/lib', '**/coverage/']),
  {
    files: ['**/__tests__/**'],
    rules: {
      'unicorn/filename-case': 'off',
      'unicorn/no-empty-file': 'off',

      'vitest/no-conditional-expect': 'off',
    },
  },
])
