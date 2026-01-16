/**
 * @famgia/omnify-typescript - Plugin
 *
 * Plugin for generating TypeScript type definitions and Zod schemas from Omnify schemas.
 *
 * ## Modern Mode (Recommended)
 *
 * Use with `@famgia/omnify-react` runtime package:
 * - Output to `node_modules/.omnify/` (like Prisma's .prisma/)
 * - Schemas are re-exported from `@famgia/omnify-react`
 * - No stubs generated (use package's components/hooks)
 *
 * ```typescript
 * typescript({
 *   modelsPath: 'node_modules/.omnify/schemas',
 *   stubsPath: false, // Use @famgia/omnify-react instead
 * })
 * ```
 *
 * ## Legacy Mode
 *
 * For projects not using `@famgia/omnify-react`:
 * - Output to custom path (e.g., 'resources/ts/omnify/schemas')
 * - Stubs generated alongside schemas
 *
 * ```typescript
 * typescript({
 *   modelsPath: 'resources/ts/omnify/schemas',
 *   stubsPath: 'resources/ts/omnify', // Generate stubs
 * })
 * ```
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@famgia/omnify';
 * import typescript from '@famgia/omnify-typescript/plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     typescript({
 *       modelsPath: 'node_modules/.omnify/schemas', // Modern (Prisma-like)
 *       generateZodSchemas: true,
 *     }),
 *   ],
 * });
 * ```
 */

import type { OmnifyPlugin, GeneratorOutput, GeneratorContext, PluginConfigSchema } from '@famgia/omnify-types';
import { generateTypeScript } from './generator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Default paths for modern mode (node_modules/.omnify/)
 */
const MODERN_DEFAULTS = {
  modelsPath: 'node_modules/.omnify/schemas',
  stubsPath: false as const,
};

/**
 * Default paths for legacy mode (types/schemas)
 */
const LEGACY_DEFAULTS = {
  modelsPath: 'types/schemas',
  stubsPath: 'omnify',
};

/**
 * Configuration schema for TypeScript plugin UI settings
 */
const TYPESCRIPT_CONFIG_SCHEMA: PluginConfigSchema = {
  fields: [
    {
      key: 'modelsPath',
      type: 'path',
      label: 'Schemas Output Path',
      description: 'Directory for generated TypeScript types and Zod schemas. Use "node_modules/.omnify/schemas" for modern mode with @famgia/omnify-react.',
      default: LEGACY_DEFAULTS.modelsPath,
      group: 'output',
    },
    {
      key: 'generateZodSchemas',
      type: 'boolean',
      label: 'Generate Zod Schemas',
      description: 'Generate Zod schemas alongside TypeScript types for form validation',
      default: true,
      group: 'output',
    },
    {
      key: 'stubsPath',
      type: 'path',
      label: 'React Stubs Path',
      description: 'Directory for React utility stubs (hooks, components). Leave empty to disable. Recommended: use @famgia/omnify-react instead.',
      default: LEGACY_DEFAULTS.stubsPath,
      group: 'output',
    },
  ],
};

/**
 * Options for the TypeScript plugin.
 */
export interface TypeScriptPluginOptions {
  /**
   * Path for TypeScript model files.
   *
   * Modern mode: 'node_modules/.omnify/schemas' (use with @famgia/omnify-react)
   * Legacy mode: 'types/schemas' or custom path
   *
   * @default 'types/schemas'
   */
  modelsPath?: string;
  /**
   * Generate Zod schemas alongside TypeScript types.
   * @default true
   */
  generateZodSchemas?: boolean;
  /**
   * Path for React utility stubs (hooks, components, lib).
   * Set to false to disable stub generation.
   *
   * When using @famgia/omnify-react, set to false.
   *
   * @default 'omnify'
   */
  stubsPath?: string | false;
}

/**
 * Resolved options with defaults applied.
 */
interface ResolvedOptions {
  modelsPath: string;
  generateZodSchemas: boolean;
  stubsPath: string | false;
  isModernMode: boolean;
}

/**
 * Check if the path targets node_modules (modern mode)
 */
function isNodeModulesPath(p: string): boolean {
  return p.includes('node_modules');
}

/**
 * Resolves options with defaults.
 */
function resolveOptions(options?: TypeScriptPluginOptions): ResolvedOptions {
  const modelsPath = options?.modelsPath ?? LEGACY_DEFAULTS.modelsPath;
  const isModernMode = isNodeModulesPath(modelsPath);

  // In modern mode, disable stubs by default (use @famgia/omnify-react)
  const defaultStubsPath = isModernMode ? false : LEGACY_DEFAULTS.stubsPath;

  return {
    modelsPath,
    generateZodSchemas: options?.generateZodSchemas ?? true,
    stubsPath: options?.stubsPath ?? defaultStubsPath,
    isModernMode,
  };
}

/**
 * Stub file definitions for React utilities.
 */
const STUB_FILES = [
  // Components
  {
    stub: 'JapaneseNameField.tsx.stub',
    output: 'components/JapaneseNameField.tsx',
  },
  {
    stub: 'JapaneseAddressField.tsx.stub',
    output: 'components/JapaneseAddressField.tsx',
  },
  {
    stub: 'JapaneseBankField.tsx.stub',
    output: 'components/JapaneseBankField.tsx',
  },
  // Hooks
  {
    stub: 'use-form-mutation.ts.stub',
    output: 'hooks/use-form-mutation.ts',
  },
  // Lib - validation utilities
  {
    stub: 'zod-i18n.ts.stub',
    output: 'lib/zod-i18n.ts',
  },
  {
    stub: 'form-validation.ts.stub',
    output: 'lib/form-validation.ts',
  },
  // Rules - Japanese validation rules
  {
    stub: 'rules/kana.ts.stub',
    output: 'lib/rules/kana.ts',
  },
  {
    stub: 'rules/index.ts.stub',
    output: 'lib/rules/index.ts',
  },
];

/**
 * Creates the TypeScript plugin with the specified options.
 *
 * @param options - Plugin configuration options
 * @returns OmnifyPlugin configured for TypeScript generation
 */
export default function typescriptPlugin(options?: TypeScriptPluginOptions): OmnifyPlugin {
  const resolved = resolveOptions(options);

  return {
    name: '@famgia/omnify-typescript',
    version: '0.0.1',
    configSchema: TYPESCRIPT_CONFIG_SCHEMA,

    generators: [
      {
        name: 'typescript-models',
        description: 'Generate TypeScript model definitions',

        generate: async (ctx: GeneratorContext): Promise<GeneratorOutput[]> => {
          // Determine plugin enum path - relative to the schemas folder's node_modules
          // e.g., if modelsPath is "./frontend/src/omnify/schemas", 
          // plugin enums go to "./frontend/node_modules/@omnify-client/enum"
          const modelsDir = path.dirname(resolved.modelsPath);
          const frontendRoot = modelsDir.replace(/\/src\/.*$/, '');
          const pluginEnumBase = `${frontendRoot}/node_modules/@omnify-client`;
          const pluginEnumPath = `${pluginEnumBase}/enum`;
          const hasPluginEnums = ctx.pluginEnums && ctx.pluginEnums.size > 0;

          const files = generateTypeScript(ctx.schemas, {
            generateZodSchemas: resolved.generateZodSchemas,
            localeConfig: ctx.localeConfig,
            customTypes: ctx.customTypes,
            pluginEnums: ctx.pluginEnums,
            pluginEnumImportPrefix: '@omnify-client/enum',
          });

          const outputs: GeneratorOutput[] = [];

          // Add package.json for @omnify-client if plugin enums exist
          if (hasPluginEnums) {
            outputs.push({
              path: `${pluginEnumBase}/package.json`,
              content: JSON.stringify({
                name: '@omnify-client',
                version: '0.0.0',
                private: true,
                main: './enum/index.js',
                exports: {
                  './enum/*': './enum/*.js',
                },
              }, null, 2),
              type: 'other' as const,
              skipIfExists: false,
            });
          }

          for (const file of files) {
            // Determine output path based on category
            let outputPath: string;
            if (file.category === 'plugin-enum') {
              // Plugin enums go to frontend/node_modules/@omnify-client/enum/
              outputPath = `${pluginEnumPath}/${file.filePath}`;
            } else if (file.category === 'enum') {
              // Schema enums go to ../enum/ folder (sibling to schemas)
              const enumPath = resolved.modelsPath.replace(/\/schemas\/?$/, '/enum');
              outputPath = `${enumPath}/${file.filePath}`;
            } else {
              outputPath = `${resolved.modelsPath}/${file.filePath}`;
            }

            outputs.push({
              path: outputPath,
              content: file.content,
              type: 'type' as const,
              skipIfExists: !file.overwrite, // Invert: overwrite=true means skipIfExists=false
              metadata: {
                types: file.types,
              },
            });
          }

          return outputs;
        },
      },
      {
        name: 'typescript-stubs',
        description: 'Generate React utility stubs (hooks, components) - DEPRECATED: use @famgia/omnify-react',

        generate: async (ctx: GeneratorContext): Promise<GeneratorOutput[]> => {
          // Skip if stubs disabled
          if (resolved.stubsPath === false) {
            return [];
          }

          // Show deprecation warning when generating stubs
          if (ctx.logger) {
            ctx.logger.warn(
              'Stub generation is deprecated. Consider using @famgia/omnify-react package instead.\n' +
              '  npm install @famgia/omnify-react\n' +
              '  Then set stubsPath: false in your config.'
            );
          }

          const outputs: GeneratorOutput[] = [];
          const stubsDir = path.join(__dirname, '..', 'stubs');

          for (const { stub, output } of STUB_FILES) {
            const stubPath = path.join(stubsDir, stub);
            if (fs.existsSync(stubPath)) {
              const content = fs.readFileSync(stubPath, 'utf-8');
              outputs.push({
                path: `${resolved.stubsPath}/${output}`,
                content,
                type: 'other' as const,
                skipIfExists: false, // Always overwrite - library files should stay in sync
              });
            }
          }

          // Generate index files
          outputs.push({
            path: `${resolved.stubsPath}/components/index.ts`,
            content: `export { JapaneseNameField, type JapaneseNameFieldProps } from './JapaneseNameField';
export { JapaneseAddressField, type JapaneseAddressFieldProps } from './JapaneseAddressField';
export { JapaneseBankField, type JapaneseBankFieldProps } from './JapaneseBankField';
`,
            type: 'other' as const,
            skipIfExists: false,
          });

          outputs.push({
            path: `${resolved.stubsPath}/hooks/index.ts`,
            content: `export { useFormMutation } from './use-form-mutation';
`,
            type: 'other' as const,
            skipIfExists: false,
          });

          outputs.push({
            path: `${resolved.stubsPath}/lib/index.ts`,
            content: `export { setZodLocale, getZodLocale, getZodMessage } from './zod-i18n';
export { zodRule, requiredRule } from './form-validation';
export * from './rules';
`,
            type: 'other' as const,
            skipIfExists: false,
          });

          return outputs;
        },
      },
    ],
  };
}

// Named export for flexibility
export { typescriptPlugin };

// Export defaults for user convenience
export { MODERN_DEFAULTS, LEGACY_DEFAULTS };

/**
 * Create TypeScript plugin with modern mode defaults.
 * Use this when using @famgia/omnify-react package.
 *
 * @example
 * ```typescript
 * import { typescriptModern } from '@famgia/omnify-typescript/plugin';
 *
 * export default defineConfig({
 *   plugins: [typescriptModern()],
 * });
 * ```
 */
export function typescriptModern(options?: Omit<TypeScriptPluginOptions, 'modelsPath' | 'stubsPath'>): OmnifyPlugin {
  return typescriptPlugin({
    ...options,
    modelsPath: MODERN_DEFAULTS.modelsPath,
    stubsPath: MODERN_DEFAULTS.stubsPath,
  });
}
