import { OmnifyPlugin } from '@famgia/omnify-types';

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

/**
 * Default paths for modern mode (node_modules/.omnify/)
 */
declare const MODERN_DEFAULTS: {
    modelsPath: string;
    stubsPath: false;
};
/**
 * Default paths for legacy mode (types/schemas)
 */
declare const LEGACY_DEFAULTS: {
    modelsPath: string;
    stubsPath: string;
};
/**
 * Options for the TypeScript plugin.
 */
interface TypeScriptPluginOptions {
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
 * Creates the TypeScript plugin with the specified options.
 *
 * @param options - Plugin configuration options
 * @returns OmnifyPlugin configured for TypeScript generation
 */
declare function typescriptPlugin(options?: TypeScriptPluginOptions): OmnifyPlugin;

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
declare function typescriptModern(options?: Omit<TypeScriptPluginOptions, 'modelsPath' | 'stubsPath'>): OmnifyPlugin;

export { LEGACY_DEFAULTS, MODERN_DEFAULTS, type TypeScriptPluginOptions, typescriptPlugin as default, typescriptModern, typescriptPlugin };
