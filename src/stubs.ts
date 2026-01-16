/**
 * Stub file utilities for React/Ant Design/TanStack Query utilities.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stub file definitions
 */
export const STUB_FILES = [
  // Components
  {
    stub: 'JapaneseNameField.tsx.stub',
    output: 'components/JapaneseNameField.tsx',
    indexExport: '', // Handled by components-index.ts.stub
  },
  {
    stub: 'JapaneseAddressField.tsx.stub',
    output: 'components/JapaneseAddressField.tsx',
    indexExport: '', // Handled by components-index.ts.stub
  },
  {
    stub: 'JapaneseBankField.tsx.stub',
    output: 'components/JapaneseBankField.tsx',
    indexExport: '', // Handled by components-index.ts.stub
  },
  {
    stub: 'components-index.ts.stub',
    output: 'components/index.ts',
    indexExport: '', // This IS the index
  },
  // Hooks
  {
    stub: 'use-form-mutation.ts.stub',
    output: 'hooks/use-form-mutation.ts',
    indexExport: `export { useFormMutation } from './use-form-mutation';\n`,
  },
  // Lib
  {
    stub: 'zod-i18n.ts.stub',
    output: 'lib/zod-i18n.ts',
    indexExport: `export { setZodLocale, getZodLocale, getZodMessage } from './zod-i18n';\n`,
  },
  {
    stub: 'form-validation.ts.stub',
    output: 'lib/form-validation.ts',
    indexExport: `export { zodRule, requiredRule } from './form-validation';\nexport * from './rules';\n`,
  },
  // Rules
  {
    stub: 'rules/kana.ts.stub',
    output: 'lib/rules/kana.ts',
    indexExport: '',  // Will be handled by rules/index.ts
  },
  {
    stub: 'rules/index.ts.stub',
    output: 'lib/rules/index.ts',
    indexExport: '',  // Already exported via form-validation
  },
] as const;

export interface CopyStubsOptions {
  /** Target directory (e.g., 'resources/ts/omnify') */
  targetDir: string;
  /** Skip if file exists (default: false - always overwrite library files) */
  skipIfExists?: boolean;
}

export interface CopyStubsResult {
  copied: string[];
  skipped: string[];
}

/**
 * Copy React utility stubs to the target directory.
 *
 * @example
 * copyStubs({
 *   targetDir: 'resources/ts/omnify',
 *   skipIfExists: true,
 * });
 */
export function copyStubs(options: CopyStubsOptions): CopyStubsResult {
  const { targetDir, skipIfExists = false } = options;
  const stubsDir = path.join(__dirname, '..', 'stubs');
  const result: CopyStubsResult = { copied: [], skipped: [] };

  // Group stubs by directory for index file generation
  const directories = new Map<string, string>();

  for (const { stub, output, indexExport } of STUB_FILES) {
    const stubPath = path.join(stubsDir, stub);
    const outputPath = path.join(targetDir, output);
    const outputDir = path.dirname(outputPath);
    const dirName = path.dirname(output).split('/')[0]; // e.g., 'components', 'hooks', 'lib'

    // Track index exports per directory
    if (!directories.has(dirName)) {
      directories.set(dirName, '');
    }
    directories.set(dirName, directories.get(dirName)! + indexExport);

    // Create directory if not exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Skip if file exists and skipIfExists is true
    if (skipIfExists && fs.existsSync(outputPath)) {
      result.skipped.push(output);
      continue;
    }

    // Copy stub file
    if (fs.existsSync(stubPath)) {
      const content = fs.readFileSync(stubPath, 'utf-8');
      fs.writeFileSync(outputPath, content);
      result.copied.push(output);
    }
  }

  // Generate index files for each directory
  for (const [dirName, exports] of directories) {
    const indexPath = path.join(targetDir, dirName, 'index.ts');
    if (skipIfExists && fs.existsSync(indexPath)) {
      continue;
    }
    fs.writeFileSync(indexPath, exports);
    result.copied.push(`${dirName}/index.ts`);
  }

  return result;
}

/**
 * Get list of stub files that would be generated.
 */
export function getStubPaths(): string[] {
  return STUB_FILES.map(s => s.output);
}
