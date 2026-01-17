/**
 * @famgia/omnify-typescript - TypeScript Enum Generator
 *
 * Generates TypeScript enums with helper methods from schema enum definitions.
 */

import type { LoadedSchema, SchemaCollection, LocalizedString, PluginEnumDefinition } from '@famgia/omnify-types';
import { resolveLocalizedString } from '@famgia/omnify-types';
import type { TSEnum, TSEnumValue, TSTypeAlias, TypeScriptOptions } from './types.js';

/**
 * Resolves a localized string using the given options.
 */
function resolveDisplayName(
  value: LocalizedString | undefined,
  options: TypeScriptOptions = {}
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return resolveLocalizedString(value, {
    locale: options.locale,
    config: options.localeConfig,
  });
}

/**
 * Inline enum value from schema (can be string or object with value/label/extra).
 */
interface InlineEnumValue {
  readonly value: string;
  /** Display label - supports multi-language (string or locale map) */
  readonly label?: LocalizedString;
  readonly extra?: Readonly<Record<string, unknown>>;
}

/**
 * Converts a string to PascalCase (handles camelCase, snake_case, kebab-case).
 * Used for generating TypeScript type names from property names.
 * 
 * Examples:
 *   - "plan_type" → "PlanType"
 *   - "planType" → "PlanType"
 *   - "status" → "Status"
 */
export function toPascalCase(value: string): string {
  // Handle camelCase by inserting split points before uppercase letters
  const normalized = value.replace(/([a-z])([A-Z])/g, '$1_$2');

  return normalized
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts enum value to valid TypeScript enum member name.
 */
export function toEnumMemberName(value: string): string {
  // Convert to PascalCase and remove invalid characters
  let result = value
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '');

  // TypeScript enum member names cannot start with a number
  if (/^\d/.test(result)) {
    result = '_' + result;
  }

  return result;
}

/**
 * Converts schema name to TypeScript enum name.
 */
export function toEnumName(schemaName: string): string {
  return schemaName;
}

/**
 * Parses enum value from schema (can be string or object).
 * If multiLocale is true, keeps all locales. Otherwise resolves to single locale.
 */
function parseEnumValue(
  value: string | InlineEnumValue,
  options: TypeScriptOptions = {}
): TSEnumValue {
  if (typeof value === 'string') {
    return {
      name: toEnumMemberName(value),
      value,
      // No label or extra - will fallback to value
    };
  }

  // Handle label - either multi-locale or resolved single locale
  let label: string | Record<string, string> | undefined;
  if (value.label !== undefined) {
    if (options.multiLocale && typeof value.label === 'object') {
      // Keep all locales as object
      label = value.label as Record<string, string>;
    } else {
      // Resolve to single locale
      label = resolveDisplayName(value.label, options);
    }
  }

  return {
    name: toEnumMemberName(value.value),
    value: value.value,
    label,
    extra: value.extra,
  };
}

/**
 * Generates TypeScript enum from schema enum.
 */
export function schemaToEnum(schema: LoadedSchema, options: TypeScriptOptions = {}): TSEnum | null {
  if (schema.kind !== 'enum' || !schema.values) {
    return null;
  }

  const values: TSEnumValue[] = schema.values.map(value =>
    parseEnumValue(value as string | InlineEnumValue, options)
  );
  const displayName = resolveDisplayName(schema.displayName, options);

  return {
    name: toEnumName(schema.name),
    values,
    comment: displayName ?? schema.name,
  };
}

/**
 * Generates enums for all enum schemas.
 */
export function generateEnums(schemas: SchemaCollection, options: TypeScriptOptions = {}): TSEnum[] {
  const enums: TSEnum[] = [];

  for (const schema of Object.values(schemas)) {
    if (schema.kind === 'enum') {
      const enumDef = schemaToEnum(schema, options);
      if (enumDef) {
        enums.push(enumDef);
      }
    }
  }

  return enums;
}

/**
 * Converts a plugin enum definition to TSEnum.
 * Plugin enums come from plugins like @famgia/omnify-japan (e.g., Prefecture, BankAccountType).
 */
export function pluginEnumToTSEnum(enumDef: PluginEnumDefinition, options: TypeScriptOptions = {}): TSEnum {
  const values: TSEnumValue[] = enumDef.values.map(v => {
    // Handle label - can be string or locale map
    let label: string | Record<string, string> | undefined;
    if (v.label !== undefined) {
      if (typeof v.label === 'string') {
        label = v.label;
      } else if (options.multiLocale) {
        // Keep all locales
        label = v.label as Record<string, string>;
      } else {
        // Resolve to single locale
        label = resolveDisplayName(v.label, options);
      }
    }

    return {
      name: toEnumMemberName(v.value),
      value: v.value,
      label,
      extra: v.extra,
    };
  });

  // Resolve displayName
  let comment: string | undefined;
  if (enumDef.displayName !== undefined) {
    if (typeof enumDef.displayName === 'string') {
      comment = enumDef.displayName;
    } else {
      comment = resolveDisplayName(enumDef.displayName, options);
    }
  }

  return {
    name: enumDef.name,
    values,
    comment: comment ?? enumDef.name,
  };
}

/**
 * Generates enums from plugin enum definitions.
 */
export function generatePluginEnums(
  pluginEnums: ReadonlyMap<string, PluginEnumDefinition>,
  options: TypeScriptOptions = {}
): TSEnum[] {
  const enums: TSEnum[] = [];

  for (const enumDef of pluginEnums.values()) {
    enums.push(pluginEnumToTSEnum(enumDef, options));
  }

  return enums;
}

/**
 * Check if label is multi-locale (object) or single string.
 */
function isMultiLocaleLabel(label: string | Record<string, string> | undefined): label is Record<string, string> {
  return label !== undefined && typeof label === 'object';
}

/**
 * Formats a TypeScript enum with helper methods.
 */
export function formatEnum(enumDef: TSEnum): string {
  const { name, values, comment } = enumDef;
  const parts: string[] = [];

  // JSDoc comment
  if (comment) {
    parts.push(`/**\n * ${comment}\n */\n`);
  }

  // Enum definition
  const enumValues = values
    .map(v => `  ${v.name} = '${v.value}',`)
    .join('\n');
  parts.push(`export enum ${name} {\n${enumValues}\n}\n\n`);

  // Values array
  parts.push(`/** All ${name} values */\n`);
  parts.push(`export const ${name}Values = Object.values(${name}) as ${name}[];\n\n`);

  // Type guard
  parts.push(`/** Type guard for ${name} */\n`);
  parts.push(`export function is${name}(value: unknown): value is ${name} {\n`);
  parts.push(`  return ${name}Values.includes(value as ${name});\n`);
  parts.push(`}\n\n`);

  // Check if we have multi-locale labels or single-locale labels
  const hasLabels = values.some(v => v.label !== undefined);
  const hasMultiLocale = values.some(v => isMultiLocaleLabel(v.label));

  if (hasLabels) {
    if (hasMultiLocale) {
      // Multi-locale labels: Record<Enum, Record<string, string>>
      const labelEntries = values
        .filter(v => v.label !== undefined)
        .map(v => {
          if (isMultiLocaleLabel(v.label)) {
            const locales = Object.entries(v.label)
              .map(([locale, text]) => `'${locale}': '${escapeString(text)}'`)
              .join(', ');
            return `  [${name}.${v.name}]: { ${locales} },`;
          }
          return `  [${name}.${v.name}]: { default: '${escapeString(String(v.label))}' },`;
        })
        .join('\n');
      parts.push(`const ${lowerFirst(name)}Labels: Partial<Record<${name}, Record<string, string>>> = {\n${labelEntries}\n};\n\n`);

      parts.push(`/** Get label for ${name} value with locale support */\n`);
      parts.push(`export function get${name}Label(value: ${name}, locale?: string): string {\n`);
      parts.push(`  const labels = ${lowerFirst(name)}Labels[value];\n`);
      parts.push(`  if (!labels) return value;\n`);
      parts.push(`  if (locale && labels[locale]) return labels[locale];\n`);
      parts.push(`  // Fallback: ja → en → first available\n`);
      parts.push(`  return labels['ja'] ?? labels['en'] ?? Object.values(labels)[0] ?? value;\n`);
      parts.push(`}\n\n`);
    } else {
      // Single-locale labels: Record<Enum, string>
      const labelEntries = values
        .filter(v => v.label !== undefined)
        .map(v => `  [${name}.${v.name}]: '${escapeString(String(v.label))}',`)
        .join('\n');
      parts.push(`const ${lowerFirst(name)}Labels: Partial<Record<${name}, string>> = {\n${labelEntries}\n};\n\n`);

      parts.push(`/** Get label for ${name} value (fallback to value if no label) */\n`);
      parts.push(`export function get${name}Label(value: ${name}): string {\n`);
      parts.push(`  return ${lowerFirst(name)}Labels[value] ?? value;\n`);
      parts.push(`}\n\n`);
    }
  } else {
    parts.push(`/** Get label for ${name} value (returns value as-is) */\n`);
    parts.push(`export function get${name}Label(value: ${name}): string {\n`);
    parts.push(`  return value;\n`);
    parts.push(`}\n\n`);
  }

  // Extra - only generate if at least one value has extra
  const hasExtra = values.some(v => v.extra !== undefined);
  if (hasExtra) {
    const extraEntries = values
      .filter(v => v.extra !== undefined)
      .map(v => `  [${name}.${v.name}]: ${JSON.stringify(v.extra)},`)
      .join('\n');
    parts.push(`const ${lowerFirst(name)}Extra: Partial<Record<${name}, Record<string, unknown>>> = {\n${extraEntries}\n};\n\n`);

    parts.push(`/** Get extra metadata for ${name} value (undefined if not defined) */\n`);
    parts.push(`export function get${name}Extra(value: ${name}): Record<string, unknown> | undefined {\n`);
    parts.push(`  return ${lowerFirst(name)}Extra[value];\n`);
    parts.push(`}`);
  } else {
    parts.push(`/** Get extra metadata for ${name} value (undefined if not defined) */\n`);
    parts.push(`export function get${name}Extra(_value: ${name}): Record<string, unknown> | undefined {\n`);
    parts.push(`  return undefined;\n`);
    parts.push(`}`);
  }

  return parts.join('');
}

/**
 * Convert first character to lowercase.
 */
function lowerFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Escape special characters in strings for JavaScript output.
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Generates a union type alias as an alternative to enum.
 */
export function enumToUnionType(enumDef: TSEnum): TSTypeAlias {
  const type = enumDef.values
    .map(v => `'${v.value}'`)
    .join(' | ');

  return {
    name: enumDef.name,
    type,
    comment: enumDef.comment,
  };
}

/**
 * Formats a TypeScript type alias with helper methods.
 */
export function formatTypeAlias(alias: TSTypeAlias): string {
  const { name, type, comment } = alias;
  const parts: string[] = [];

  // JSDoc comment
  if (comment) {
    parts.push(`/**\n * ${comment}\n */\n`);
  }

  // Type alias
  parts.push(`export type ${name} = ${type};\n\n`);

  // Values array
  const values = type.split(' | ').map(v => v.trim());
  parts.push(`/** All ${name} values */\n`);
  parts.push(`export const ${name}Values: ${name}[] = [${values.join(', ')}];\n\n`);

  // Type guard
  parts.push(`/** Type guard for ${name} */\n`);
  parts.push(`export function is${name}(value: unknown): value is ${name} {\n`);
  parts.push(`  return ${name}Values.includes(value as ${name});\n`);
  parts.push(`}\n\n`);

  // Label getter (fallback to value for type aliases - no labels)
  parts.push(`/** Get label for ${name} value (returns value as-is) */\n`);
  parts.push(`export function get${name}Label(value: ${name}): string {\n`);
  parts.push(`  return value;\n`);
  parts.push(`}\n\n`);

  // Extra getter (always undefined for type aliases)
  parts.push(`/** Get extra metadata for ${name} value (always undefined for type aliases) */\n`);
  parts.push(`export function get${name}Extra(_value: ${name}): Record<string, unknown> | undefined {\n`);
  parts.push(`  return undefined;\n`);
  parts.push(`}`);

  return parts.join('');
}

/**
 * Result of extracting inline enums - can be type alias or full enum with labels.
 */
export interface ExtractedInlineEnum {
  /** Type alias for simple enums */
  typeAlias?: TSTypeAlias;
  /** Full enum with i18n labels */
  enum?: TSEnum;
}

/**
 * Extracts inline enums from properties for type generation.
 * Returns both type aliases (simple enums) and full enums (with i18n labels).
 */
export function extractInlineEnums(schemas: SchemaCollection, options: TypeScriptOptions = {}): ExtractedInlineEnum[] {
  const results: ExtractedInlineEnum[] = [];

  for (const schema of Object.values(schemas)) {
    if (schema.kind === 'enum' || !schema.properties) {
      continue;
    }

    for (const [propName, property] of Object.entries(schema.properties)) {
      if (property.type === 'Enum') {
        const enumProp = property as { enum?: readonly (string | InlineEnumValue)[]; displayName?: LocalizedString };

        // Only handle inline array enums (not references to named enums)
        if (Array.isArray(enumProp.enum) && enumProp.enum.length > 0) {
          // Convert property name to PascalCase for type name (handles snake_case like "plan_type" → "PlanType")
          const typeName = `${schema.name}${toPascalCase(propName)}`;
          const displayName = resolveDisplayName(enumProp.displayName, options);

          // Check if any value has labels (i18n support needed)
          const hasLabels = enumProp.enum.some(v => typeof v !== 'string' && v.label !== undefined);

          if (hasLabels) {
            // Generate full enum with i18n labels
            const values: TSEnumValue[] = enumProp.enum.map(v => parseEnumValue(v, options));
            results.push({
              enum: {
                name: typeName,
                values,
                comment: displayName ?? `${schema.name} ${propName} enum`,
              },
            });
          } else {
            // Generate simple type alias (no labels)
            const values = enumProp.enum.map(v =>
              typeof v === 'string' ? v : v.value
            );
            results.push({
              typeAlias: {
                name: typeName,
                type: values.map(v => `'${v}'`).join(' | '),
                comment: displayName ?? `${schema.name} ${propName} enum`,
              },
            });
          }
        }
      }

      if (property.type === 'Select') {
        const selectProp = property as { options?: readonly (string | InlineEnumValue)[]; displayName?: LocalizedString };

        if (selectProp.options && selectProp.options.length > 0) {
          // Convert property name to PascalCase for type name (handles snake_case)
          const typeName = `${schema.name}${toPascalCase(propName)}`;
          const displayName = resolveDisplayName(selectProp.displayName, options);

          // Check if any option has labels
          const hasLabels = selectProp.options.some(v => typeof v !== 'string' && (v as InlineEnumValue).label !== undefined);

          if (hasLabels) {
            // Generate full enum with i18n labels
            const values: TSEnumValue[] = selectProp.options.map(v => parseEnumValue(v as string | InlineEnumValue, options));
            results.push({
              enum: {
                name: typeName,
                values,
                comment: displayName ?? `${schema.name} ${propName} options`,
              },
            });
          } else {
            // Generate simple type alias
            const values = selectProp.options.map(v =>
              typeof v === 'string' ? v : (v as InlineEnumValue).value
            );
            results.push({
              typeAlias: {
                name: typeName,
                type: values.map(v => `'${v}'`).join(' | '),
                comment: displayName ?? `${schema.name} ${propName} options`,
              },
            });
          }
        }
      }
    }
  }

  return results;
}
