/**
 * @famgia/omnify-typescript - TypeScript Types
 *
 * Types for TypeScript code generation.
 */

import type { LocaleConfig, CustomTypeDefinition, PluginEnumDefinition } from '@famgia/omnify-types';

/**
 * File category for organizing output.
 */
export type FileCategory = 'schema' | 'enum';

/**
 * Generated TypeScript file.
 */
export interface TypeScriptFile {
  /** File path relative to output directory */
  readonly filePath: string;
  /** Full file content */
  readonly content: string;
  /** Types defined in this file */
  readonly types: readonly string[];
  /** Whether this file can be overwritten (base files) or should be preserved (model files) */
  readonly overwrite: boolean;
  /** File category for organizing output (default: 'schema') */
  readonly category?: FileCategory;
}

/**
 * TypeScript generation options.
 */
export interface TypeScriptOptions {
  /** Whether to include readonly modifiers */
  readonly readonly?: boolean | undefined;
  /** Whether to use strict null checks compatible types */
  readonly strictNullChecks?: boolean | undefined;
  /**
   * Locale configuration for resolving localized strings.
   * If provided, displayName/description will be resolved to the specified locale.
   */
  readonly localeConfig?: LocaleConfig | undefined;
  /**
   * Target locale for generation.
   * If not provided, uses localeConfig.defaultLocale.
   */
  readonly locale?: string | undefined;
  /**
   * Custom type definitions from plugins.
   * Used to expand compound types like JapaneseName.
   */
  readonly customTypes?: ReadonlyMap<string, CustomTypeDefinition> | undefined;
  /**
   * Generate multi-locale labels instead of resolving to a single locale.
   * When true, labels will be objects like { ja: '...', en: '...' }
   */
  readonly multiLocale?: boolean | undefined;
  /**
   * Custom validation message templates to override defaults.
   * Templates use ${displayName}, ${min}, ${max} placeholders.
   */
  readonly validationTemplates?: Readonly<Record<string, Record<string, string>>> | undefined;
  /**
   * @deprecated Use generateZodSchemas instead. Legacy Ant Design rules generation.
   * When generateZodSchemas is true (default), this option is ignored.
   */
  readonly generateRules?: boolean | undefined;
  /**
   * Generate Zod schemas alongside TypeScript interfaces.
   * When true (default), generates Zod schemas in base files for form validation.
   * The legacy rules/ folder generation is skipped when this is enabled.
   * @default true
   */
  readonly generateZodSchemas?: boolean | undefined;
  /**
   * Import path prefix for enums when enumPath is separate from schemasPath.
   * Used when enums are placed outside the schemas folder.
   * @example '../enum' - for structure like omnify/schemas/ and omnify/enum/
   * @default './enum' - enums inside schemas folder (legacy)
   */
  readonly enumImportPrefix?: string | undefined;
  /**
   * Plugin-provided enums (e.g., Prefecture, BankAccountType from japan-types).
   * These are generated alongside schema enums in the enum/ folder.
   */
  readonly pluginEnums?: ReadonlyMap<string, PluginEnumDefinition> | undefined;
  /**
   * Whether to add .js extension to import paths.
   * Set to true for native ESM (moduleResolution: node16/nodenext).
   * Set to false when using bundlers (Vite, webpack, etc.) that handle module resolution.
   * @default false
   */
  readonly useJsExtension?: boolean | undefined;
}

/**
 * TypeScript property definition.
 */
export interface TSProperty {
  /** Property name */
  readonly name: string;
  /** TypeScript type */
  readonly type: string;
  /** Whether the property is optional */
  readonly optional: boolean;
  /** Whether the property is readonly */
  readonly readonly: boolean;
  /** JSDoc comment */
  readonly comment?: string | undefined;
}

/**
 * TypeScript interface definition.
 */
export interface TSInterface {
  /** Interface name */
  readonly name: string;
  /** Properties */
  readonly properties: readonly TSProperty[];
  /** Extended interfaces */
  readonly extends?: readonly string[] | undefined;
  /** JSDoc comment */
  readonly comment?: string | undefined;
  /** Dependencies - other interfaces that need to be imported */
  readonly dependencies?: readonly string[] | undefined;
  /** Enum dependencies - enums that need to be imported from enum/ folder */
  readonly enumDependencies?: readonly string[] | undefined;
}

/**
 * TypeScript enum definition.
 */
export interface TSEnum {
  /** Enum name */
  readonly name: string;
  /** Enum values */
  readonly values: readonly TSEnumValue[];
  /** JSDoc comment */
  readonly comment?: string | undefined;
}

/**
 * Multi-locale string map.
 */
export type LocaleMap = Readonly<Record<string, string>>;

/**
 * TypeScript enum value.
 */
export interface TSEnumValue {
  /** Value name (PascalCase) */
  readonly name: string;
  /** Value (string or number) */
  readonly value: string | number;
  /** Display label - single string or multi-locale map */
  readonly label?: string | LocaleMap | undefined;
  /** Extra metadata (optional) */
  readonly extra?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * TypeScript type alias definition.
 */
export interface TSTypeAlias {
  /** Type name */
  readonly name: string;
  /** Type definition */
  readonly type: string;
  /** JSDoc comment */
  readonly comment?: string | undefined;
}
