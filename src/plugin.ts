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
