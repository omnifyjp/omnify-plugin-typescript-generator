/**
 * @famgia/omnify-typescript - Zod Schema Generator
 *
 * Generates Zod schemas alongside TypeScript interfaces.
 */

import type { LoadedSchema, PropertyDefinition, LocalizedString, CustomTypeDefinition } from '@famgia/omnify-types';
import type { TypeScriptOptions, LocaleMap } from './types.js';
import { toSnakeCase } from './interface-generator.js';

/**
 * Zod schema information for a property.
 */
export interface ZodPropertySchema {
  /** Field name in snake_case */
  readonly fieldName: string;
  /** Zod schema string (e.g., "z.string().min(1).max(255)") */
  readonly schema: string;
  /** Whether this field should be in create schema */
  readonly inCreate: boolean;
  /** Whether this field should be in update schema */
  readonly inUpdate: boolean;
  /** Comment for the schema */
  readonly comment?: string;
}

/**
 * Display names for a schema.
 */
export interface SchemaDisplayNames {
  /** Model display name per locale */
  readonly displayName: LocaleMap;
  /** Property display names per locale */
  readonly propertyDisplayNames: Record<string, LocaleMap>;
  /** Property placeholders per locale */
  readonly propertyPlaceholders: Record<string, LocaleMap>;
}

/**
 * Get localized display name as object with all locales.
 */
function getMultiLocaleDisplayName(
  value: LocalizedString | undefined,
  locales: readonly string[],
  fallbackLocale: string,
  defaultValue: string
): LocaleMap {
  if (!value) {
    const result: Record<string, string> = {};
    for (const locale of locales) {
      result[locale] = defaultValue;
    }
    return result;
  }

  if (typeof value === 'string') {
    const result: Record<string, string> = {};
    for (const locale of locales) {
      result[locale] = value;
    }
    return result;
  }

  const result: Record<string, string> = {};
  for (const locale of locales) {
    result[locale] = value[locale] ?? value[fallbackLocale] ?? value['en'] ?? defaultValue;
  }
  return result;
}

/**
 * Validation rules type for internal use.
 */
interface InternalValidationRules {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly url?: boolean;
  readonly uuid?: boolean;
  readonly ip?: boolean;
  readonly ipv4?: boolean;
  readonly ipv6?: boolean;
  readonly alpha?: boolean;
  readonly alphaNum?: boolean;
  readonly alphaDash?: boolean;
  readonly numeric?: boolean;
  readonly digits?: number;
  readonly digitsBetween?: readonly [number, number];
  readonly startsWith?: string | readonly string[];
  readonly endsWith?: string | readonly string[];
  readonly lowercase?: boolean;
  readonly uppercase?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly between?: readonly [number, number];
  readonly gt?: number;
  readonly lt?: number;
  readonly multipleOf?: number;
  readonly arrayMin?: number;
  readonly arrayMax?: number;
}

/**
 * Apply validation rules to a Zod schema string.
 */
function applyValidationRules(
  schema: string,
  rules: InternalValidationRules | undefined,
  propType: string
): string {
  if (!rules) return schema;

  let result = schema;

  // === Format Rules (override base type) ===
  if (rules.url) {
    result = 'z.string().url()';
  } else if (rules.uuid) {
    result = 'z.string().uuid()';
  } else if (rules.ip) {
    result = 'z.string().ip()';
  } else if (rules.ipv4) {
    result = 'z.string().ip({ version: "v4" })';
  } else if (rules.ipv6) {
    result = 'z.string().ip({ version: "v6" })';
  }

  // === Check if this is a string type ===
  const isStringType = ['String', 'Text', 'MediumText', 'LongText', 'Password', 'Email'].includes(propType);

  // === String Length Rules (only for string types) ===
  if (isStringType) {
    if (rules.minLength !== undefined) {
      result += `.min(${rules.minLength})`;
    }
    if (rules.maxLength !== undefined) {
      result += `.max(${rules.maxLength})`;
    }
  }

  // === Character Pattern Rules (only for string types) ===
  if (isStringType) {
    if (rules.alpha) {
      result += `.regex(/^[a-zA-Z]*$/, { message: 'Must contain only letters' })`;
    }
    if (rules.alphaNum) {
      result += `.regex(/^[a-zA-Z0-9]*$/, { message: 'Must contain only letters and numbers' })`;
    }
    if (rules.alphaDash) {
      result += `.regex(/^[a-zA-Z0-9_-]*$/, { message: 'Must contain only letters, numbers, dashes, and underscores' })`;
    }
    if (rules.numeric) {
      result += `.regex(/^\\d*$/, { message: 'Must contain only numbers' })`;
    }
    if (rules.digits !== undefined) {
      result += `.length(${rules.digits}).regex(/^\\d+$/, { message: 'Must be exactly ${rules.digits} digits' })`;
    }
    if (rules.digitsBetween) {
      const [min, max] = rules.digitsBetween;
      result += `.min(${min}).max(${max}).regex(/^\\d+$/, { message: 'Must be ${min}-${max} digits' })`;
    }

    // === String Matching Rules ===
    if (rules.startsWith) {
      const prefixes = Array.isArray(rules.startsWith) ? rules.startsWith : [rules.startsWith];
      // 空文字列は無視
      const validPrefixes = prefixes.filter(p => p.length > 0);
      if (validPrefixes.length === 1) {
        result += `.startsWith('${validPrefixes[0]}')`;
      } else if (validPrefixes.length > 1) {
        const regex = validPrefixes.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        result += `.regex(/^(${regex})/, { message: 'Must start with: ${validPrefixes.join(', ')}' })`;
      }
    }
    if (rules.endsWith) {
      const suffixes = Array.isArray(rules.endsWith) ? rules.endsWith : [rules.endsWith];
      // 空文字列は無視
      const validSuffixes = suffixes.filter(s => s.length > 0);
      if (validSuffixes.length === 1) {
        result += `.endsWith('${validSuffixes[0]}')`;
      } else if (validSuffixes.length > 1) {
        const regex = validSuffixes.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        result += `.regex(/(${regex})$/, { message: 'Must end with: ${validSuffixes.join(', ')}' })`;
      }
    }
    if (rules.lowercase) {
      result += `.refine(v => v === v.toLowerCase(), { message: 'Must be lowercase' })`;
    }
    if (rules.uppercase) {
      result += `.refine(v => v === v.toUpperCase(), { message: 'Must be uppercase' })`;
    }
  }

  // === Numeric Rules ===
  if (propType === 'Int' || propType === 'TinyInt' || propType === 'BigInt' || propType === 'Float') {
    if (rules.min !== undefined) {
      result += `.gte(${rules.min})`;
    }
    if (rules.max !== undefined) {
      result += `.lte(${rules.max})`;
    }
    if (rules.between) {
      const [min, max] = rules.between;
      result += `.gte(${min}).lte(${max})`;
    }
    if (rules.gt !== undefined) {
      result += `.gt(${rules.gt})`;
    }
    if (rules.lt !== undefined) {
      result += `.lt(${rules.lt})`;
    }
    if (rules.multipleOf !== undefined) {
      result += `.multipleOf(${rules.multipleOf})`;
    }
  }

  return result;
}

/**
 * Generate Zod schema string for a property type.
 */
function getZodSchemaForType(
  propDef: PropertyDefinition,
  fieldName: string,
  customTypes?: ReadonlyMap<string, CustomTypeDefinition>
): string {
  const def = propDef as {
    nullable?: boolean;
    length?: number;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string | readonly string[];
    options?: readonly string[];
    rules?: InternalValidationRules;
  };

  const isNullable = def.nullable ?? false;
  let schema = '';

  // Check for custom simple types first
  if (customTypes) {
    const customType = customTypes.get(propDef.type);
    if (customType && !customType.compound) {
      // Simple custom type - use string based on SQL type
      const sqlType = customType.sql?.sqlType || 'VARCHAR';
      schema = 'z.string()';

      // Add length constraint if available
      if (customType.sql?.length) {
        schema += `.max(${customType.sql.length})`;
      }

      if (isNullable) {
        schema += '.optional().nullable()';
      }
      return schema;
    }
  }

  switch (propDef.type) {
    case 'String':
    case 'Text':
    case 'MediumText':
    case 'LongText':
    case 'Password':
      schema = 'z.string()';
      if (!isNullable) {
        schema += '.min(1)';
      }
      if (def.maxLength || def.length) {
        schema += `.max(${def.maxLength ?? def.length})`;
      }
      if (def.minLength && def.minLength > 1) {
        // Replace .min(1) with actual minLength
        schema = schema.replace('.min(1)', `.min(${def.minLength})`);
      }
      break;

    case 'Email':
      schema = 'z.string().email()';
      if (def.maxLength || def.length) {
        schema += `.max(${def.maxLength ?? def.length ?? 255})`;
      }
      break;

    case 'TinyInt':
    case 'Int':
    case 'BigInt':
      schema = 'z.number().int()';
      if (def.min !== undefined) {
        schema += `.gte(${def.min})`;
      }
      if (def.max !== undefined) {
        schema += `.lte(${def.max})`;
      }
      break;

    case 'Float':
      schema = 'z.number()';
      if (def.min !== undefined) {
        schema += `.gte(${def.min})`;
      }
      if (def.max !== undefined) {
        schema += `.lte(${def.max})`;
      }
      break;

    case 'Boolean':
      schema = 'z.boolean()';
      break;

    case 'Date':
      schema = 'z.string().date()';
      break;

    case 'DateTime':
    case 'Timestamp':
      schema = 'z.string().datetime({ offset: true })';
      break;

    case 'Time':
      schema = 'z.string().time()';
      break;

    case 'Json':
      schema = 'z.unknown()';
      break;

    case 'EnumRef':
      // Reference to shared enum schema
      if (typeof def.enum === 'string') {
        schema = `z.nativeEnum(${def.enum})`;
      } else {
        schema = 'z.string()';
      }
      break;

    case 'Enum':
      if (typeof def.enum === 'string') {
        // Reference to named enum - will need to be imported
        schema = `${def.enum}Schema`;
      } else if (Array.isArray(def.enum)) {
        // Inline enum values
        const values = def.enum.map(v => `'${v}'`).join(', ');
        schema = `z.enum([${values}])`;
      } else {
        schema = 'z.string()';
      }
      break;

    case 'Select':
      if (def.options && def.options.length > 0) {
        const values = def.options.map(v => `'${v}'`).join(', ');
        schema = `z.enum([${values}])`;
      } else {
        schema = 'z.string()';
      }
      break;

    case 'Lookup':
      schema = 'z.number().int().positive()';
      break;

    case 'Association':
      // Associations are not validated in forms, skip
      return '';

    case 'File':
      // File uploads handled separately
      return '';

    default:
      schema = 'z.string()';
  }

  // Apply validation rules from schema definition
  if (def.rules && schema) {
    schema = applyValidationRules(schema, def.rules, propDef.type);
  }

  // Apply nullable/optional
  if (isNullable && schema) {
    schema += '.optional().nullable()';
  }

  // Apply pattern (legacy support, prefer rules.pattern in future)
  if (def.pattern && schema) {
    schema += `.regex(/${def.pattern}/)`;
  }

  return schema;
}

/**
 * Generate Zod schemas for compound type fields.
 */
function generateCompoundTypeSchemas(
  propName: string,
  propDef: PropertyDefinition,
  customType: CustomTypeDefinition,
  options: TypeScriptOptions
): ZodPropertySchema[] {
  const schemas: ZodPropertySchema[] = [];
  const propFields = (propDef as { fields?: Record<string, { nullable?: boolean; length?: number; hidden?: boolean }> }).fields;
  const locales = options.localeConfig?.locales ?? ['en'];
  const fallbackLocale = options.localeConfig?.fallbackLocale ?? 'en';

  if (!customType.expand) return schemas;

  for (const field of customType.expand) {
    const fieldName = `${toSnakeCase(propName)}_${toSnakeCase(field.suffix)}`;
    const fieldOverride = propFields?.[field.suffix] as {
      nullable?: boolean;
      length?: number;
      rules?: {
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        pattern?: string;
        format?: string;
      };
    } | undefined;

    // Nullable priority: schema field override > plugin field default > parent property > false
    const isNullable = fieldOverride?.nullable ?? field.sql?.nullable ?? (propDef as { nullable?: boolean }).nullable ?? false;

    // Rules priority: schema field override > plugin field rules > defaults from sql
    const pluginRules = field.rules;
    const overrideRules = fieldOverride?.rules;
    const length = fieldOverride?.length ?? overrideRules?.maxLength ?? pluginRules?.maxLength ?? field.sql?.length;
    const minLength = overrideRules?.minLength ?? pluginRules?.minLength;
    const pattern = overrideRules?.pattern ?? pluginRules?.pattern;
    const format = overrideRules?.format ?? pluginRules?.format;

    // Build Zod schema based on format or type
    let schema = 'z.string()';

    // Apply format-specific validation
    if (format === 'email') {
      schema = 'z.string().email()';
    } else if (format === 'url') {
      schema = 'z.string().url()';
    } else if (format === 'phone') {
      // Japanese phone pattern: 0X0-XXXX-XXXX or 0X-XXXX-XXXX
      schema = 'z.string()';
    } else if (format === 'postal_code') {
      // Japanese postal code: XXX-XXXX
      schema = `z.string().regex(/^\\d{3}-?\\d{4}$/)`;
    }

    // Apply length constraints
    if (!isNullable) {
      const min = minLength ?? 1;
      schema += `.min(${min})`;
    } else if (minLength) {
      schema += `.min(${minLength})`;
    }

    if (length) {
      schema += `.max(${length})`;
    }

    // Apply pattern (if not already applied via format)
    if (pattern && !format) {
      schema += `.regex(/${pattern}/)`;
    }

    // Apply nullable
    if (isNullable) {
      schema += '.optional().nullable()';
    }

    // Get display name
    const propDisplayName = getMultiLocaleDisplayName(
      (propDef as { displayName?: LocalizedString }).displayName,
      locales,
      fallbackLocale,
      propName
    );

    schemas.push({
      fieldName,
      schema,
      inCreate: true,
      inUpdate: true,
      comment: `${propDisplayName['en'] ?? propName} (${field.suffix})`,
    });
  }

  return schemas;
}

/**
 * Generate Zod schemas for all properties in a schema.
 */
export function generateZodSchemas(
  schema: LoadedSchema,
  options: TypeScriptOptions
): ZodPropertySchema[] {
  const schemas: ZodPropertySchema[] = [];
  const customTypes = options.customTypes;

  if (!schema.properties) return schemas;

  for (const [propName, propDef] of Object.entries(schema.properties)) {
    // Check for compound custom types
    if (customTypes) {
      const customType = customTypes.get(propDef.type);
      if (customType?.compound) {
        schemas.push(...generateCompoundTypeSchemas(propName, propDef, customType, options));
        continue;
      }
    }

    const zodSchema = getZodSchemaForType(propDef, propName, customTypes);
    if (!zodSchema) continue;

    const fieldName = toSnakeCase(propName);

    schemas.push({
      fieldName,
      schema: zodSchema,
      inCreate: true,
      inUpdate: true,
      comment: undefined,
    });
  }

  return schemas;
}

/**
 * Generate display names and placeholders for a schema.
 */
export function generateDisplayNames(
  schema: LoadedSchema,
  options: TypeScriptOptions
): SchemaDisplayNames {
  const locales = options.localeConfig?.locales ?? ['en'];
  const fallbackLocale = options.localeConfig?.fallbackLocale ?? 'en';
  const customTypes = options.customTypes;

  const displayName = getMultiLocaleDisplayName(
    schema.displayName,
    locales,
    fallbackLocale,
    schema.name
  );

  const propertyDisplayNames: Record<string, LocaleMap> = {};
  const propertyPlaceholders: Record<string, LocaleMap> = {};

  if (schema.properties) {
    for (const [propName, propDef] of Object.entries(schema.properties)) {
      const prop = propDef as {
        displayName?: LocalizedString;
        placeholder?: LocalizedString;
        fields?: Record<string, { displayName?: LocalizedString; placeholder?: LocalizedString }>;
      };
      const fieldName = toSnakeCase(propName);

      // Check for compound types - expand to individual fields
      if (customTypes) {
        const customType = customTypes.get(propDef.type);
        if (customType?.compound && customType.expand) {
          // Add compound-level displayName (e.g., `name` -> `氏名`)
          // This is used by components that need the combined field's label
          if (prop.displayName) {
            propertyDisplayNames[fieldName] = getMultiLocaleDisplayName(
              prop.displayName,
              locales,
              fallbackLocale,
              propName
            );
          }

          for (const field of customType.expand) {
            const expandedFieldName = `${fieldName}_${toSnakeCase(field.suffix)}`;
            const fieldOverride = prop.fields?.[field.suffix];

            // Display name for compound field (priority: schema override > plugin label > fallback)
            const labelSource = fieldOverride?.displayName ?? field.label;
            if (labelSource) {
              // Use explicit label from schema override or plugin
              propertyDisplayNames[expandedFieldName] = getMultiLocaleDisplayName(
                labelSource,
                locales,
                fallbackLocale,
                field.suffix
              );
            } else {
              // Fallback: parent displayName + field suffix
              propertyDisplayNames[expandedFieldName] = getMultiLocaleDisplayName(
                prop.displayName,
                locales,
                fallbackLocale,
                propName
              );
              // Append field suffix to display name
              for (const locale of locales) {
                propertyDisplayNames[expandedFieldName] = {
                  ...propertyDisplayNames[expandedFieldName],
                  [locale]: `${propertyDisplayNames[expandedFieldName][locale]} (${field.suffix})`,
                };
              }
            }

            // Placeholder for compound field (priority: schema override > plugin default > empty)
            const placeholderSource = fieldOverride?.placeholder ?? field.placeholder;
            if (placeholderSource) {
              propertyPlaceholders[expandedFieldName] = getMultiLocaleDisplayName(
                placeholderSource,
                locales,
                fallbackLocale,
                ''
              );
            }
          }
          continue;
        }
      }

      // Display name for regular field
      propertyDisplayNames[fieldName] = getMultiLocaleDisplayName(
        prop.displayName,
        locales,
        fallbackLocale,
        propName
      );

      // Placeholder for regular field
      if (prop.placeholder) {
        propertyPlaceholders[fieldName] = getMultiLocaleDisplayName(
          prop.placeholder,
          locales,
          fallbackLocale,
          ''
        );
      }
    }
  }

  return { displayName, propertyDisplayNames, propertyPlaceholders };
}

/**
 * Get fields to exclude from create/update schemas.
 */
export function getExcludedFields(
  schema: LoadedSchema,
  customTypes?: ReadonlyMap<string, CustomTypeDefinition>
): { create: Set<string>; update: Set<string> } {
  const createExclude = new Set<string>();
  const updateExclude = new Set<string>();

  // Always exclude id
  if (schema.options?.id !== false) {
    createExclude.add('id');
    updateExclude.add('id');
  }

  // Exclude timestamps
  if (schema.options?.timestamps !== false) {
    createExclude.add('created_at');
    createExclude.add('updated_at');
    updateExclude.add('created_at');
    updateExclude.add('updated_at');
  }

  // Exclude soft delete
  if (schema.options?.softDelete) {
    createExclude.add('deleted_at');
    updateExclude.add('deleted_at');
  }

  // Exclude email_verified_at
  if (schema.properties) {
    if (schema.properties['emailVerifiedAt'] || schema.properties['email_verified_at']) {
      createExclude.add('email_verified_at');
      updateExclude.add('email_verified_at');
    }
  }

  // Exclude computed fields from compound types
  if (schema.properties && customTypes) {
    for (const [propName, propDef] of Object.entries(schema.properties)) {
      const customType = customTypes.get(propDef.type);
      if (customType?.accessors) {
        for (const accessor of customType.accessors) {
          const fieldName = `${toSnakeCase(propName)}_${toSnakeCase(accessor.name)}`;
          createExclude.add(fieldName);
          updateExclude.add(fieldName);
        }
      }
    }
  }

  return { create: createExclude, update: updateExclude };
}

/**
 * Format Zod schemas section for base file.
 */
export function formatZodSchemasSection(
  schemaName: string,
  zodSchemas: ZodPropertySchema[],
  displayNames: SchemaDisplayNames,
  excludedFields: { create: Set<string>; update: Set<string> }
): string {
  const parts: string[] = [];
  const lowerName = schemaName.charAt(0).toLowerCase() + schemaName.slice(1);

  // I18n - Unified locale object
  parts.push(`// ============================================================================\n`);
  parts.push(`// I18n (Internationalization)\n`);
  parts.push(`// ============================================================================\n\n`);

  parts.push(`/**\n`);
  parts.push(` * Unified i18n object for ${schemaName}\n`);
  parts.push(` * Contains model label and all field labels/placeholders\n`);
  parts.push(` */\n`);
  parts.push(`export const ${lowerName}I18n = {\n`);
  parts.push(`  /** Model display name */\n`);
  parts.push(`  label: ${JSON.stringify(displayNames.displayName)},\n`);
  parts.push(`  /** Field labels and placeholders */\n`);
  parts.push(`  fields: {\n`);
  for (const [propName, labelMap] of Object.entries(displayNames.propertyDisplayNames)) {
    const placeholderMap = displayNames.propertyPlaceholders[propName];
    parts.push(`    ${propName}: {\n`);
    parts.push(`      label: ${JSON.stringify(labelMap)},\n`);
    if (placeholderMap) {
      parts.push(`      placeholder: ${JSON.stringify(placeholderMap)},\n`);
    }
    parts.push(`    },\n`);
  }
  parts.push(`  },\n`);
  parts.push(`} as const;\n\n`);

  // Field Schemas
  parts.push(`// ============================================================================\n`);
  parts.push(`// Zod Schemas\n`);
  parts.push(`// ============================================================================\n\n`);

  parts.push(`/** Field schemas for ${schemaName} */\n`);
  parts.push(`export const base${schemaName}Schemas = {\n`);
  for (const prop of zodSchemas) {
    if (prop.comment) {
      parts.push(`  /** ${prop.comment} */\n`);
    }
    parts.push(`  ${prop.fieldName}: ${prop.schema},\n`);
  }
  parts.push(`} as const;\n\n`);

  // Create Schema
  const createFields = zodSchemas.filter(p => p.inCreate && !excludedFields.create.has(p.fieldName));
  parts.push(`/** Create schema for ${schemaName} (POST requests) */\n`);
  parts.push(`export const base${schemaName}CreateSchema = z.object({\n`);
  for (const prop of createFields) {
    parts.push(`  ${prop.fieldName}: base${schemaName}Schemas.${prop.fieldName},\n`);
  }
  parts.push(`});\n\n`);

  // Update Schema
  parts.push(`/** Update schema for ${schemaName} (PUT/PATCH requests) */\n`);
  parts.push(`export const base${schemaName}UpdateSchema = base${schemaName}CreateSchema.partial();\n\n`);

  // Inferred Types
  parts.push(`// ============================================================================\n`);
  parts.push(`// Inferred Types\n`);
  parts.push(`// ============================================================================\n\n`);

  parts.push(`export type Base${schemaName}Create = z.infer<typeof base${schemaName}CreateSchema>;\n`);
  parts.push(`export type Base${schemaName}Update = z.infer<typeof base${schemaName}UpdateSchema>;\n\n`);

  // Helper Functions
  parts.push(`// ============================================================================\n`);
  parts.push(`// I18n Helper Functions\n`);
  parts.push(`// ============================================================================\n\n`);

  parts.push(`/** Get model label for a specific locale */\n`);
  parts.push(`export function get${schemaName}Label(locale: string): string {\n`);
  parts.push(`  return ${lowerName}I18n.label[locale as keyof typeof ${lowerName}I18n.label] ?? ${lowerName}I18n.label['en'] ?? '${schemaName}';\n`);
  parts.push(`}\n\n`);

  parts.push(`/** Get field label for a specific locale */\n`);
  parts.push(`export function get${schemaName}FieldLabel(field: string, locale: string): string {\n`);
  parts.push(`  const fieldI18n = ${lowerName}I18n.fields[field as keyof typeof ${lowerName}I18n.fields];\n`);
  parts.push(`  if (!fieldI18n) return field;\n`);
  parts.push(`  return fieldI18n.label[locale as keyof typeof fieldI18n.label] ?? fieldI18n.label['en'] ?? field;\n`);
  parts.push(`}\n\n`);

  parts.push(`/** Get field placeholder for a specific locale */\n`);
  parts.push(`export function get${schemaName}FieldPlaceholder(field: string, locale: string): string {\n`);
  parts.push(`  const fieldI18n = ${lowerName}I18n.fields[field as keyof typeof ${lowerName}I18n.fields];\n`);
  parts.push(`  if (!fieldI18n || !('placeholder' in fieldI18n)) return '';\n`);
  parts.push(`  const placeholder = fieldI18n.placeholder as Record<string, string>;\n`);
  parts.push(`  return placeholder[locale] ?? placeholder['en'] ?? '';\n`);
  parts.push(`}\n`);

  return parts.join('');
}

/**
 * Format user model file with Zod re-exports.
 * @param schemaName - The schema name
 * @param ext - Import extension ('.js' for ESM, '' for bundlers)
 * @param basePrefix - Import prefix for base files ('./base' or '@omnify-client/schemas')
 */
export function formatZodModelFile(schemaName: string, ext: string = '', basePrefix: string = './base'): string {
  const lowerName = schemaName.charAt(0).toLowerCase() + schemaName.slice(1);

  return `/**
 * ${schemaName} Model
 *
 * This file extends the auto-generated base interface.
 * You can add custom methods, computed properties, or override types/schemas here.
 * This file will NOT be overwritten by the generator.
 */

import { z } from 'zod';
import type { ${schemaName} as ${schemaName}Base } from '${basePrefix}/${schemaName}${ext}';
import {
  base${schemaName}Schemas,
  base${schemaName}CreateSchema,
  base${schemaName}UpdateSchema,
  ${lowerName}I18n,
  get${schemaName}Label,
  get${schemaName}FieldLabel,
  get${schemaName}FieldPlaceholder,
} from '${basePrefix}/${schemaName}${ext}';

// ============================================================================
// Types (extend or re-export)
// ============================================================================

export interface ${schemaName} extends ${schemaName}Base {
  // Add custom properties here
}

// ============================================================================
// Schemas (extend or re-export)
// ============================================================================

export const ${lowerName}Schemas = { ...base${schemaName}Schemas };
export const ${lowerName}CreateSchema = base${schemaName}CreateSchema;
export const ${lowerName}UpdateSchema = base${schemaName}UpdateSchema;

// ============================================================================
// Types
// ============================================================================

export type ${schemaName}Create = z.infer<typeof ${lowerName}CreateSchema>;
export type ${schemaName}Update = z.infer<typeof ${lowerName}UpdateSchema>;

// Re-export i18n and helpers
export {
  ${lowerName}I18n,
  get${schemaName}Label,
  get${schemaName}FieldLabel,
  get${schemaName}FieldPlaceholder,
};

// Re-export base type for internal use
export type { ${schemaName}Base };
`;
}
