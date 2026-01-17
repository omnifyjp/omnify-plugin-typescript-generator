/**
 * @famgia/omnify-typescript - Plugin
 *
 * Plugin for generating TypeScript type definitions and Zod schemas from Omnify schemas.
 *
 * ## Usage
 *
 * ```typescript
 * import { defineConfig } from '@famgia/omnify';
 * import typescript from '@famgia/omnify-typescript/plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     typescript({
 *       modelsPath: 'resources/ts/omnify',
 *       generateZodSchemas: true,
 *     }),
 *   ],
 * });
 * ```
 *
 * ## With @famgia/omnify-react
 *
 * Use with `@famgia/omnify-react` runtime package for React utilities:
 *
 * ```typescript
 * import {
 *   JapaneseNameField,
 *   JapaneseAddressField,
 *   useFormMutation,
 *   zodRule,
 * } from '@famgia/omnify-react';
 * ```
 */

import type { OmnifyPlugin, GeneratorOutput, GeneratorContext, PluginConfigSchema } from '@famgia/omnify-types';
import { generateTypeScript } from './generator.js';
import path from 'path';

/**
 * Default paths
 */
const DEFAULTS = {
  modelsPath: 'resources/ts/omnify',
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
      description: 'Directory for generated TypeScript types and Zod schemas.',
      default: DEFAULTS.modelsPath,
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
  ],
};

/**
 * Options for the TypeScript plugin.
 */
export interface TypeScriptPluginOptions {
  /**
   * Path for TypeScript model files.
   *
   * @default 'resources/ts/omnify'
   */
  modelsPath?: string;
  /**
   * Generate Zod schemas alongside TypeScript types.
   * @default true
   */
  generateZodSchemas?: boolean;
}

/**
 * Resolved options with defaults applied.
 */
interface ResolvedOptions {
  modelsPath: string;
  generateZodSchemas: boolean;
}

/**
 * Resolves options with defaults.
 */
function resolveOptions(options?: TypeScriptPluginOptions): ResolvedOptions {
  return {
    modelsPath: options?.modelsPath ?? DEFAULTS.modelsPath,
    generateZodSchemas: options?.generateZodSchemas ?? true,
  };
}

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
          // @omnify-base goes to node_modules/@omnify-base in the project root
          // (where omnify.config.ts is located, same level as package.json)
          const omnifyBaseDir = 'node_modules/@omnify-base';

          const files = generateTypeScript(ctx.schemas, {
            generateZodSchemas: resolved.generateZodSchemas,
            localeConfig: ctx.localeConfig,
            customTypes: ctx.customTypes,
            pluginEnums: ctx.pluginEnums,
            // All generated files (enums, base) go to @omnify-base - they shouldn't be edited
            enumImportPrefix: '@omnify-base/enum',
            pluginEnumImportPrefix: '@omnify-base/enum',
            baseImportPrefix: '@omnify-base/schemas',
          });

          const outputs: GeneratorOutput[] = [];

          // Check if we have any files that need @omnify-base package
          const hasOmnifyClientFiles = files.some(f =>
            f.category === 'enum' || f.category === 'plugin-enum' || f.category === 'base'
          );

          // Add package.json for @omnify-base
          if (hasOmnifyClientFiles) {
            outputs.push({
              path: `${omnifyBaseDir}/package.json`,
              content: JSON.stringify({
                name: '@omnify-base',
                version: '0.0.0',
                private: true,
                type: 'module',
                exports: {
                  // Wildcard exports for TypeScript bundlers (Vite, esbuild, etc.)
                  './enum/*': {
                    types: './enum/*.ts',
                    default: './enum/*.ts',
                  },
                  './schemas/*': {
                    types: './schemas/*.ts',
                    default: './schemas/*.ts',
                  },
                },
              }, null, 2),
              type: 'other' as const,
              skipIfExists: false,
            });
          }

          for (const file of files) {
            // Route files based on category:
            // - overwrite: true files go to @omnify-base (shouldn't be edited)
            // - overwrite: false files stay in modelsPath (user can edit)
            let outputPath: string;

            if (file.category === 'plugin-enum' || file.category === 'enum') {
              // Enums → @omnify-base/enum/
              outputPath = `${omnifyBaseDir}/enum/${file.filePath}`;
            } else if (file.category === 'base') {
              // Base files → @omnify-base/schemas/
              // Remove 'base/' prefix from filePath (e.g., 'base/User.ts' → 'User.ts')
              const fileName = file.filePath.replace(/^base\//, '');
              outputPath = `${omnifyBaseDir}/schemas/${fileName}`;
            } else if (file.overwrite && (file.filePath === 'common.ts' || file.filePath === 'i18n.ts')) {
              // Shared types and i18n → @omnify-base/schemas/
              // These are imported via @omnify-base/schemas/common and @omnify-base/schemas/i18n
              outputPath = `${omnifyBaseDir}/schemas/${file.filePath}`;
            } else {
              // User-editable files (models, index) → modelsPath
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
    ],
  };
}

// Named export for flexibility
export { typescriptPlugin };

// Export defaults for user convenience
export { DEFAULTS };

// Legacy exports for backwards compatibility
export const MODERN_DEFAULTS = DEFAULTS;
export const LEGACY_DEFAULTS = DEFAULTS;

/**
 * Create TypeScript plugin with default settings.
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
export function typescriptModern(options?: TypeScriptPluginOptions): OmnifyPlugin {
  return typescriptPlugin({
    ...options,
    modelsPath: options?.modelsPath ?? DEFAULTS.modelsPath,
  });
}
