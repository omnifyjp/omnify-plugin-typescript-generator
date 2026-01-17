/**
 * @famgia/omnify-typescript
 *
 * TypeScript type definitions generator for Omnify schemas.
 */

export type {
  TypeScriptFile,
  TypeScriptOptions,
  TSProperty,
  TSInterface,
  TSEnum,
  TSEnumValue,
  TSTypeAlias,
} from './types.js';

export {
  toPropertyName,
  toInterfaceName,
  getPropertyType,
  propertyToTSProperty,
  schemaToInterface,
  formatProperty,
  formatInterface,
  generateInterfaces,
} from './interface-generator.js';

export {
  toEnumMemberName,
  toEnumName,
  schemaToEnum,
  generateEnums,
  generatePluginEnums,
  pluginEnumToTSEnum,
  formatEnum,
  enumToUnionType,
  formatTypeAlias,
  extractInlineEnums,
  type ExtractedInlineEnum,
} from './enum-generator.js';

export {
  generateTypeScript,
  generateTypeScriptFiles,
} from './generator.js';

export {
  DEFAULT_VALIDATION_TEMPLATES,
  mergeValidationTemplates,
  formatValidationMessage,
  getValidationMessages,
  type ValidationTemplates,
} from './validation-templates.js';

export {
  generateModelRules,
  generateRulesFiles,
} from './rules-generator.js';

export type { LocaleMap } from './types.js';

// AI Guides generation
export {
  generateAIGuides,
  shouldGenerateAIGuides,
  type AIGuidesOptions,
  type AIGuidesResult,
} from './ai-guides/index.js';

// Stubs management
export {
  copyStubs,
  type CopyStubsOptions,
  type CopyStubsResult,
} from './stubs.js';
