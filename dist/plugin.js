import {
  generateTypeScript
} from "./chunk-XKUNDZDN.js";

// src/plugin.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var MODERN_DEFAULTS = {
  modelsPath: "node_modules/.omnify/schemas",
  stubsPath: false
};
var LEGACY_DEFAULTS = {
  modelsPath: "types/schemas",
  stubsPath: "omnify"
};
var TYPESCRIPT_CONFIG_SCHEMA = {
  fields: [
    {
      key: "modelsPath",
      type: "path",
      label: "Schemas Output Path",
      description: 'Directory for generated TypeScript types and Zod schemas. Use "node_modules/.omnify/schemas" for modern mode with @famgia/omnify-react.',
      default: LEGACY_DEFAULTS.modelsPath,
      group: "output"
    },
    {
      key: "generateZodSchemas",
      type: "boolean",
      label: "Generate Zod Schemas",
      description: "Generate Zod schemas alongside TypeScript types for form validation",
      default: true,
      group: "output"
    },
    {
      key: "stubsPath",
      type: "path",
      label: "React Stubs Path",
      description: "Directory for React utility stubs (hooks, components). Leave empty to disable. Recommended: use @famgia/omnify-react instead.",
      default: LEGACY_DEFAULTS.stubsPath,
      group: "output"
    }
  ]
};
function isNodeModulesPath(p) {
  return p.includes("node_modules");
}
function resolveOptions(options) {
  const modelsPath = options?.modelsPath ?? LEGACY_DEFAULTS.modelsPath;
  const isModernMode = isNodeModulesPath(modelsPath);
  const defaultStubsPath = isModernMode ? false : LEGACY_DEFAULTS.stubsPath;
  return {
    modelsPath,
    generateZodSchemas: options?.generateZodSchemas ?? true,
    stubsPath: options?.stubsPath ?? defaultStubsPath,
    isModernMode
  };
}
var STUB_FILES = [
  // Components
  {
    stub: "JapaneseNameField.tsx.stub",
    output: "components/JapaneseNameField.tsx"
  },
  {
    stub: "JapaneseAddressField.tsx.stub",
    output: "components/JapaneseAddressField.tsx"
  },
  {
    stub: "JapaneseBankField.tsx.stub",
    output: "components/JapaneseBankField.tsx"
  },
  // Hooks
  {
    stub: "use-form-mutation.ts.stub",
    output: "hooks/use-form-mutation.ts"
  },
  // Lib - validation utilities
  {
    stub: "zod-i18n.ts.stub",
    output: "lib/zod-i18n.ts"
  },
  {
    stub: "form-validation.ts.stub",
    output: "lib/form-validation.ts"
  },
  // Rules - Japanese validation rules
  {
    stub: "rules/kana.ts.stub",
    output: "lib/rules/kana.ts"
  },
  {
    stub: "rules/index.ts.stub",
    output: "lib/rules/index.ts"
  }
];
function typescriptPlugin(options) {
  const resolved = resolveOptions(options);
  return {
    name: "@famgia/omnify-typescript",
    version: "0.0.1",
    configSchema: TYPESCRIPT_CONFIG_SCHEMA,
    generators: [
      {
        name: "typescript-models",
        description: "Generate TypeScript model definitions",
        generate: async (ctx) => {
          const modelsDir = path.dirname(resolved.modelsPath);
          const frontendRoot = modelsDir.replace(/\/src\/.*$/, "");
          const pluginEnumBase = `${frontendRoot}/node_modules/@omnify-client`;
          const pluginEnumPath = `${pluginEnumBase}/enum`;
          const hasPluginEnums = ctx.pluginEnums && ctx.pluginEnums.size > 0;
          const files = generateTypeScript(ctx.schemas, {
            generateZodSchemas: resolved.generateZodSchemas,
            localeConfig: ctx.localeConfig,
            customTypes: ctx.customTypes,
            pluginEnums: ctx.pluginEnums,
            pluginEnumImportPrefix: "@omnify-client/enum"
          });
          const outputs = [];
          if (hasPluginEnums) {
            outputs.push({
              path: `${pluginEnumBase}/package.json`,
              content: JSON.stringify({
                name: "@omnify-client",
                version: "0.0.0",
                private: true,
                main: "./enum/index.js",
                exports: {
                  "./enum/*": "./enum/*.js"
                }
              }, null, 2),
              type: "other",
              skipIfExists: false
            });
          }
          for (const file of files) {
            let outputPath;
            if (file.category === "plugin-enum") {
              outputPath = `${pluginEnumPath}/${file.filePath}`;
            } else if (file.category === "enum") {
              const enumPath = resolved.modelsPath.replace(/\/schemas\/?$/, "/enum");
              outputPath = `${enumPath}/${file.filePath}`;
            } else {
              outputPath = `${resolved.modelsPath}/${file.filePath}`;
            }
            outputs.push({
              path: outputPath,
              content: file.content,
              type: "type",
              skipIfExists: !file.overwrite,
              // Invert: overwrite=true means skipIfExists=false
              metadata: {
                types: file.types
              }
            });
          }
          return outputs;
        }
      },
      {
        name: "typescript-stubs",
        description: "Generate React utility stubs (hooks, components) - DEPRECATED: use @famgia/omnify-react",
        generate: async (ctx) => {
          if (resolved.stubsPath === false) {
            return [];
          }
          if (ctx.logger) {
            ctx.logger.warn(
              "Stub generation is deprecated. Consider using @famgia/omnify-react package instead.\n  npm install @famgia/omnify-react\n  Then set stubsPath: false in your config."
            );
          }
          const outputs = [];
          const stubsDir = path.join(__dirname, "..", "stubs");
          for (const { stub, output } of STUB_FILES) {
            const stubPath = path.join(stubsDir, stub);
            if (fs.existsSync(stubPath)) {
              const content = fs.readFileSync(stubPath, "utf-8");
              outputs.push({
                path: `${resolved.stubsPath}/${output}`,
                content,
                type: "other",
                skipIfExists: false
                // Always overwrite - library files should stay in sync
              });
            }
          }
          outputs.push({
            path: `${resolved.stubsPath}/components/index.ts`,
            content: `export { JapaneseNameField, type JapaneseNameFieldProps } from './JapaneseNameField';
export { JapaneseAddressField, type JapaneseAddressFieldProps } from './JapaneseAddressField';
export { JapaneseBankField, type JapaneseBankFieldProps } from './JapaneseBankField';
`,
            type: "other",
            skipIfExists: false
          });
          outputs.push({
            path: `${resolved.stubsPath}/hooks/index.ts`,
            content: `export { useFormMutation } from './use-form-mutation';
`,
            type: "other",
            skipIfExists: false
          });
          outputs.push({
            path: `${resolved.stubsPath}/lib/index.ts`,
            content: `export { setZodLocale, getZodLocale, getZodMessage } from './zod-i18n';
export { zodRule, requiredRule } from './form-validation';
export * from './rules';
`,
            type: "other",
            skipIfExists: false
          });
          return outputs;
        }
      }
    ]
  };
}
function typescriptModern(options) {
  return typescriptPlugin({
    ...options,
    modelsPath: MODERN_DEFAULTS.modelsPath,
    stubsPath: MODERN_DEFAULTS.stubsPath
  });
}
export {
  LEGACY_DEFAULTS,
  MODERN_DEFAULTS,
  typescriptPlugin as default,
  typescriptModern,
  typescriptPlugin
};
//# sourceMappingURL=plugin.js.map