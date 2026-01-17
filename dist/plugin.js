import {
  generateTypeScript
} from "./chunk-UD6Y6KHP.js";

// src/plugin.ts
import path from "path";
var DEFAULTS = {
  modelsPath: "resources/ts/omnify"
};
var TYPESCRIPT_CONFIG_SCHEMA = {
  fields: [
    {
      key: "modelsPath",
      type: "path",
      label: "Schemas Output Path",
      description: "Directory for generated TypeScript types and Zod schemas.",
      default: DEFAULTS.modelsPath,
      group: "output"
    },
    {
      key: "generateZodSchemas",
      type: "boolean",
      label: "Generate Zod Schemas",
      description: "Generate Zod schemas alongside TypeScript types for form validation",
      default: true,
      group: "output"
    }
  ]
};
function resolveOptions(options) {
  return {
    modelsPath: options?.modelsPath ?? DEFAULTS.modelsPath,
    generateZodSchemas: options?.generateZodSchemas ?? true
  };
}
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
      }
    ]
  };
}
var MODERN_DEFAULTS = DEFAULTS;
var LEGACY_DEFAULTS = DEFAULTS;
function typescriptModern(options) {
  return typescriptPlugin({
    ...options,
    modelsPath: options?.modelsPath ?? DEFAULTS.modelsPath
  });
}
export {
  DEFAULTS,
  LEGACY_DEFAULTS,
  MODERN_DEFAULTS,
  typescriptPlugin as default,
  typescriptModern,
  typescriptPlugin
};
//# sourceMappingURL=plugin.js.map