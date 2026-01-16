import {
  DEFAULT_VALIDATION_TEMPLATES,
  enumToUnionType,
  extractInlineEnums,
  formatEnum,
  formatInterface,
  formatProperty,
  formatTypeAlias,
  formatValidationMessage,
  generateEnums,
  generateInterfaces,
  generateModelRules,
  generatePluginEnums,
  generateRulesFiles,
  generateTypeScript,
  getPropertyType,
  getValidationMessages,
  mergeValidationTemplates,
  pluginEnumToTSEnum,
  propertyToTSProperty,
  schemaToEnum,
  schemaToInterface,
  toEnumMemberName,
  toEnumName,
  toInterfaceName,
  toPropertyName
} from "./chunk-XKUNDZDN.js";

// src/stubs.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var STUB_FILES = [
  // Components
  {
    stub: "JapaneseNameField.tsx.stub",
    output: "components/JapaneseNameField.tsx",
    indexExport: ""
    // Handled by components-index.ts.stub
  },
  {
    stub: "JapaneseAddressField.tsx.stub",
    output: "components/JapaneseAddressField.tsx",
    indexExport: ""
    // Handled by components-index.ts.stub
  },
  {
    stub: "JapaneseBankField.tsx.stub",
    output: "components/JapaneseBankField.tsx",
    indexExport: ""
    // Handled by components-index.ts.stub
  },
  {
    stub: "components-index.ts.stub",
    output: "components/index.ts",
    indexExport: ""
    // This IS the index
  },
  // Hooks
  {
    stub: "use-form-mutation.ts.stub",
    output: "hooks/use-form-mutation.ts",
    indexExport: `export { useFormMutation } from './use-form-mutation';
`
  },
  // Lib
  {
    stub: "zod-i18n.ts.stub",
    output: "lib/zod-i18n.ts",
    indexExport: `export { setZodLocale, getZodLocale, getZodMessage } from './zod-i18n';
`
  },
  {
    stub: "form-validation.ts.stub",
    output: "lib/form-validation.ts",
    indexExport: `export { zodRule, requiredRule } from './form-validation';
export * from './rules';
`
  },
  // Rules
  {
    stub: "rules/kana.ts.stub",
    output: "lib/rules/kana.ts",
    indexExport: ""
    // Will be handled by rules/index.ts
  },
  {
    stub: "rules/index.ts.stub",
    output: "lib/rules/index.ts",
    indexExport: ""
    // Already exported via form-validation
  }
];
function copyStubs(options) {
  const { targetDir, skipIfExists = false } = options;
  const stubsDir = path.join(__dirname, "..", "stubs");
  const result = { copied: [], skipped: [] };
  const directories = /* @__PURE__ */ new Map();
  for (const { stub, output, indexExport } of STUB_FILES) {
    const stubPath = path.join(stubsDir, stub);
    const outputPath = path.join(targetDir, output);
    const outputDir = path.dirname(outputPath);
    const dirName = path.dirname(output).split("/")[0];
    if (!directories.has(dirName)) {
      directories.set(dirName, "");
    }
    directories.set(dirName, directories.get(dirName) + indexExport);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (skipIfExists && fs.existsSync(outputPath)) {
      result.skipped.push(output);
      continue;
    }
    if (fs.existsSync(stubPath)) {
      const content = fs.readFileSync(stubPath, "utf-8");
      fs.writeFileSync(outputPath, content);
      result.copied.push(output);
    }
  }
  for (const [dirName, exports] of directories) {
    const indexPath = path.join(targetDir, dirName, "index.ts");
    if (skipIfExists && fs.existsSync(indexPath)) {
      continue;
    }
    fs.writeFileSync(indexPath, exports);
    result.copied.push(`${dirName}/index.ts`);
  }
  return result;
}
function getStubPaths() {
  return STUB_FILES.map((s) => s.output);
}

// src/ai-guides/generator.ts
import { existsSync, readdirSync } from "fs";
import { resolve } from "path";
import {
  generateAIGuides as coreGenerateAIGuides
} from "@famgia/omnify-core";
function extractTypescriptBasePath(typescriptPath) {
  if (!typescriptPath) return "src";
  const normalized = typescriptPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length > 1) {
    return parts.slice(0, -1).join("/");
  }
  return "src";
}
function generateAIGuides(rootDir, options = {}) {
  const basePath = options.typescriptBasePath || extractTypescriptBasePath(options.typescriptPath);
  const coreResult = coreGenerateAIGuides(rootDir, {
    placeholders: {
      TYPESCRIPT_BASE: basePath,
      LARAVEL_BASE: "app",
      LARAVEL_ROOT: ""
    },
    // TypeScriptプロジェクトではReact関連のみ
    adapters: ["cursor", "claude"]
  });
  const result = {
    claudeGuides: 0,
    claudeChecklists: 0,
    cursorRules: 0,
    files: coreResult.files
  };
  const claudeCount = coreResult.counts["claude"] || 0;
  const cursorCount = coreResult.counts["cursor"] || 0;
  result.claudeGuides = Math.floor(claudeCount * 0.8);
  result.claudeChecklists = claudeCount - result.claudeGuides;
  result.cursorRules = cursorCount;
  return result;
}
function shouldGenerateAIGuides(rootDir) {
  const claudeDir = resolve(rootDir, ".claude/omnify/guides/react");
  const cursorDir = resolve(rootDir, ".cursor/rules/omnify");
  if (!existsSync(claudeDir) || !existsSync(cursorDir)) {
    return true;
  }
  try {
    const claudeFiles = readdirSync(claudeDir);
    const cursorFiles = readdirSync(cursorDir);
    return claudeFiles.length === 0 || cursorFiles.length === 0;
  } catch {
    return true;
  }
}
export {
  DEFAULT_VALIDATION_TEMPLATES,
  STUB_FILES,
  copyStubs,
  enumToUnionType,
  extractInlineEnums,
  formatEnum,
  formatInterface,
  formatProperty,
  formatTypeAlias,
  formatValidationMessage,
  generateAIGuides,
  generateEnums,
  generateInterfaces,
  generateModelRules,
  generatePluginEnums,
  generateRulesFiles,
  generateTypeScript,
  generateTypeScript as generateTypeScriptFiles,
  getPropertyType,
  getStubPaths,
  getValidationMessages,
  mergeValidationTemplates,
  pluginEnumToTSEnum,
  propertyToTSProperty,
  schemaToEnum,
  schemaToInterface,
  shouldGenerateAIGuides,
  toEnumMemberName,
  toEnumName,
  toInterfaceName,
  toPropertyName
};
//# sourceMappingURL=index.js.map