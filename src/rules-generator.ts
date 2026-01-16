/**
 * Generates Ant Design compatible validation rules from schemas.
 */

import type { LoadedSchema, SchemaCollection, PropertyDefinition, LocalizedString, LocaleConfig } from '@famgia/omnify-types';
import type { TypeScriptFile, TypeScriptOptions, LocaleMap } from './types.js';
import {
  DEFAULT_VALIDATION_TEMPLATES,
  mergeValidationTemplates,
  getValidationMessages,
  type ValidationTemplates,
} from './validation-templates.js';

/**
 * Ant Design rule structure with multi-locale message.
 */
interface AntdRule {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'url' | 'integer';
  min?: number;
  max?: number;
  len?: number;
  pattern?: string;
  message: LocaleMap;
}

/**
 * Property rules for a model.
 */
interface PropertyRules {
  displayName: LocaleMap;
  rules: AntdRule[];
}

/**
 * Model rules structure.
 */
interface ModelRules {
  displayName: LocaleMap;
  properties: Record<string, PropertyRules>;
}

/**
 * Get localized display name as object with all locales.
 */
function getMultiLocaleDisplayName(
  value: LocalizedString | undefined,
  locales: string[],
  fallbackLocale: string,
  defaultValue: string
): LocaleMap {
  if (!value) {
    // Return default value for all locales
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

  // It's a locale map
  const result: Record<string, string> = {};
  for (const locale of locales) {
    result[locale] = value[locale] ?? value[fallbackLocale] ?? value['en'] ?? defaultValue;
  }
  return result;
}

/**
 * Generate validation rules for a property.
 */
function generatePropertyRules(
  propName: string,
  property: PropertyDefinition,
  displayName: LocaleMap,
  locales: string[],
  fallbackLocale: string,
  templates: ValidationTemplates
): AntdRule[] {
  const rules: AntdRule[] = [];
  const propDef = property as {
    nullable?: boolean;
    length?: number;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };

  // Required rule (if not nullable)
  if (!propDef.nullable) {
    rules.push({
      required: true,
      message: getValidationMessages(templates, 'required', locales, { displayName: '${displayName}' }, fallbackLocale),
    });
  }

  // Type-specific rules
  if (property.type === 'Email') {
    rules.push({
      type: 'email',
      message: getValidationMessages(templates, 'email', locales, { displayName: '${displayName}' }, fallbackLocale),
    });
  }

  // Length rules for strings
  if (property.type === 'String' || property.type === 'Text' || property.type === 'LongText') {
    if (propDef.minLength) {
      rules.push({
        min: propDef.minLength,
        message: getValidationMessages(templates, 'minLength', locales, { displayName: '${displayName}', min: propDef.minLength }, fallbackLocale),
      });
    }
    if (propDef.maxLength || propDef.length) {
      const max = propDef.maxLength ?? propDef.length!;
      rules.push({
        max,
        message: getValidationMessages(templates, 'maxLength', locales, { displayName: '${displayName}', max }, fallbackLocale),
      });
    }
  }

  // Numeric range rules
  if (property.type === 'Int' || property.type === 'BigInt' || property.type === 'Float') {
    if (propDef.min !== undefined) {
      rules.push({
        type: property.type === 'Float' ? 'number' : 'integer',
        min: propDef.min,
        message: getValidationMessages(templates, 'min', locales, { displayName: '${displayName}', min: propDef.min }, fallbackLocale),
      });
    }
    if (propDef.max !== undefined) {
      rules.push({
        type: property.type === 'Float' ? 'number' : 'integer',
        max: propDef.max,
        message: getValidationMessages(templates, 'max', locales, { displayName: '${displayName}', max: propDef.max }, fallbackLocale),
      });
    }
  }

  // Pattern rule
  if (propDef.pattern) {
    rules.push({
      pattern: propDef.pattern,
      message: getValidationMessages(templates, 'pattern', locales, { displayName: '${displayName}' }, fallbackLocale),
    });
  }

  // Replace ${displayName} placeholder with actual display name per locale
  for (const rule of rules) {
    const newMessage: Record<string, string> = {};
    for (const locale of locales) {
      const msg = rule.message[locale];
      if (msg) {
        newMessage[locale] = msg.replace(/\$\{displayName\}/g, displayName[locale] ?? propName);
      }
    }
    (rule as { message: Record<string, string> }).message = newMessage;
  }

  return rules;
}

/**
 * Generate rules for a schema.
 */
export function generateModelRules(
  schema: LoadedSchema,
  locales: string[],
  fallbackLocale: string,
  templates: ValidationTemplates
): ModelRules {
  const modelDisplayName = getMultiLocaleDisplayName(
    schema.displayName,
    locales,
    fallbackLocale,
    schema.name
  );

  const properties: Record<string, PropertyRules> = {};

  if (schema.properties) {
    for (const [propName, property] of Object.entries(schema.properties)) {
      const propDef = property as { displayName?: LocalizedString };
      const displayName = getMultiLocaleDisplayName(
        propDef.displayName,
        locales,
        fallbackLocale,
        propName
      );

      properties[propName] = {
        displayName,
        rules: generatePropertyRules(propName, property, displayName, locales, fallbackLocale, templates),
      };
    }
  }

  return {
    displayName: modelDisplayName,
    properties,
  };
}

/**
 * Gets file extension for imports based on options.
 */
function getImportExt(options: TypeScriptOptions): string {
  return options.useJsExtension ? '.js' : '';
}

/**
 * Format rules as TypeScript code.
 */
function formatRulesFile(
  schemaName: string,
  rules: ModelRules,
  options: TypeScriptOptions
): string {
  const parts: string[] = [];
  const ext = getImportExt(options);

  parts.push(`/**
 * ⚠️ DO NOT EDIT THIS FILE! ⚠️
 * このファイルを編集しないでください！
 * KHÔNG ĐƯỢC SỬA FILE NÀY!
 *
 * Auto-generated validation rules and metadata for ${schemaName}.
 * Any manual changes will be OVERWRITTEN on next generation.
 *
 * To modify: Edit the schema YAML file and run: npx omnify generate
 */

import type { LocaleMap, ValidationRule } from '../common${ext}';

`);

  // Model display name
  parts.push(`/** Display name for ${schemaName} */\n`);
  parts.push(`export const ${schemaName}DisplayName: LocaleMap = ${JSON.stringify(rules.displayName, null, 2)};\n\n`);

  // Property metadata and rules
  parts.push(`/** Property display names for ${schemaName} */\n`);
  parts.push(`export const ${schemaName}PropertyDisplayNames: Record<string, LocaleMap> = {\n`);
  for (const [propName, propRules] of Object.entries(rules.properties)) {
    parts.push(`  ${propName}: ${JSON.stringify(propRules.displayName)},\n`);
  }
  parts.push(`};\n\n`);

  // Validation rules
  parts.push(`/** Validation rules for ${schemaName} (Ant Design compatible) */\n`);
  parts.push(`export const ${schemaName}Rules: Record<string, ValidationRule[]> = {\n`);
  for (const [propName, propRules] of Object.entries(rules.properties)) {
    if (propRules.rules.length > 0) {
      parts.push(`  ${propName}: [\n`);
      for (const rule of propRules.rules) {
        const ruleObj: Record<string, unknown> = {};
        if (rule.required) ruleObj.required = true;
        if (rule.type) ruleObj.type = `'${rule.type}'`;
        if (rule.min !== undefined) ruleObj.min = rule.min;
        if (rule.max !== undefined) ruleObj.max = rule.max;
        if (rule.pattern) ruleObj.pattern = `/${rule.pattern}/`;
        ruleObj.message = rule.message;

        // Format as JS object
        const ruleStr = Object.entries(ruleObj)
          .map(([k, v]) => {
            if (k === 'type') return `${k}: ${v}`;
            if (k === 'pattern') return `${k}: ${v}`;
            return `${k}: ${JSON.stringify(v)}`;
          })
          .join(', ');
        parts.push(`    { ${ruleStr} },\n`);
      }
      parts.push(`  ],\n`);
    }
  }
  parts.push(`};\n\n`);

  // Helper function to get rules with locale-specific messages
  parts.push(`/** Get validation rules with messages for a specific locale */\n`);
  parts.push(`export function get${schemaName}Rules(locale: string): Record<string, Array<{ required?: boolean; type?: string; min?: number; max?: number; pattern?: RegExp; message: string }>> {
  const result: Record<string, Array<{ required?: boolean; type?: string; min?: number; max?: number; pattern?: RegExp; message: string }>> = {};
  for (const [prop, rules] of Object.entries(${schemaName}Rules)) {
    result[prop] = rules.map(rule => ({
      ...rule,
      message: rule.message[locale] ?? rule.message['en'] ?? '',
    }));
  }
  return result;
}\n\n`);

  // Helper function to get display name
  parts.push(`/** Get display name for a specific locale */\n`);
  parts.push(`export function get${schemaName}DisplayName(locale: string): string {
  return ${schemaName}DisplayName[locale] ?? ${schemaName}DisplayName['en'] ?? '${schemaName}';
}\n\n`);

  parts.push(`/** Get property display name for a specific locale */\n`);
  parts.push(`export function get${schemaName}PropertyDisplayName(property: string, locale: string): string {
  const names = ${schemaName}PropertyDisplayNames[property];
  return names?.[locale] ?? names?.['en'] ?? property;
}\n`);

  return parts.join('');
}

/**
 * Generate rules files for all schemas.
 */
export function generateRulesFiles(
  schemas: SchemaCollection,
  options: TypeScriptOptions = {}
): TypeScriptFile[] {
  const files: TypeScriptFile[] = [];
  const localeConfig = options.localeConfig;
  const locales = [...(localeConfig?.locales ?? ['en'])]; // Convert readonly to mutable
  const fallbackLocale = localeConfig?.fallbackLocale ?? 'en';

  // Merge user templates with defaults
  const templates = mergeValidationTemplates(options.validationTemplates as Partial<ValidationTemplates> | undefined);

  for (const schema of Object.values(schemas)) {
    if (schema.kind === 'enum') continue;
    if (schema.options?.hidden === true) continue;

    const rules = generateModelRules(schema, locales, fallbackLocale, templates);
    const content = formatRulesFile(schema.name, rules, options);

    files.push({
      filePath: `rules/${schema.name}.rules.ts`,
      content,
      types: [`${schema.name}Rules`, `${schema.name}DisplayName`],
      overwrite: true,
    });
  }

  return files;
}
