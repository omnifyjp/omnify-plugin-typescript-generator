/**
 * @famgia/omnify-typescript - TypeScript Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  toPropertyName,
  toInterfaceName,
  getPropertyType,
  propertyToTSProperties,
  schemaToInterface,
  formatProperty,
  formatInterface,
  generateInterfaces,
} from './interface-generator.js';
import {
  toEnumMemberName,
  schemaToEnum,
  formatEnum,
  generateEnums,
} from './enum-generator.js';
import { generateTypeScript } from './generator.js';
import type { LoadedSchema, SchemaCollection } from '@famgia/omnify-types';

describe('TypeScript Interface Generator', () => {
  describe('toPropertyName', () => {
    it('preserves camelCase', () => {
      expect(toPropertyName('firstName')).toBe('firstName');
      expect(toPropertyName('lastName')).toBe('lastName');
    });
  });

  describe('toInterfaceName', () => {
    it('preserves PascalCase', () => {
      expect(toInterfaceName('User')).toBe('User');
      expect(toInterfaceName('BlogPost')).toBe('BlogPost');
    });
  });

  describe('getPropertyType', () => {
    const schemas: SchemaCollection = {};

    it('maps String to string', () => {
      expect(getPropertyType({ type: 'String' }, schemas)).toBe('string');
    });

    it('maps Int to number', () => {
      expect(getPropertyType({ type: 'Int' }, schemas)).toBe('number');
    });

    it('maps BigInt to number', () => {
      expect(getPropertyType({ type: 'BigInt' }, schemas)).toBe('number');
    });

    it('maps Boolean to boolean', () => {
      expect(getPropertyType({ type: 'Boolean' }, schemas)).toBe('boolean');
    });

    it('maps Json to unknown', () => {
      expect(getPropertyType({ type: 'Json' }, schemas)).toBe('unknown');
    });

    it('maps OneToOne association', () => {
      const result = getPropertyType(
        { type: 'Association', relation: 'OneToOne', target: 'Profile' },
        schemas
      );
      expect(result).toBe('Profile');
    });

    it('maps OneToMany association to array', () => {
      const result = getPropertyType(
        { type: 'Association', relation: 'OneToMany', target: 'Post' },
        schemas
      );
      expect(result).toBe('Post[]');
    });

    it('maps ManyToMany association to array', () => {
      const result = getPropertyType(
        { type: 'Association', relation: 'ManyToMany', target: 'Tag' },
        schemas
      );
      expect(result).toBe('Tag[]');
    });

    it('maps inline enum to union type', () => {
      const result = getPropertyType(
        { type: 'Enum', enum: ['active', 'inactive', 'pending'] },
        schemas
      );
      expect(result).toBe("'active' | 'inactive' | 'pending'");
    });
  });

  describe('schemaToInterface', () => {
    it('generates interface from schema', () => {
      const schema: LoadedSchema = {
        name: 'User',
        kind: 'object',
        filePath: '/test/user.yaml',
        relativePath: '/test/user.yaml',
        displayName: 'User Entity',
        properties: {
          email: { type: 'Email', unique: true },
          name: { type: 'String' },
          age: { type: 'Int', nullable: true },
        },
        options: {
          timestamps: true,
        },
      };

      const result = schemaToInterface(schema, {});

      expect(result.name).toBe('User');
      expect(result.comment).toBe('User Entity');
      expect(result.properties.find(p => p.name === 'id')).toBeDefined();
      expect(result.properties.find(p => p.name === 'email')).toBeDefined();
      expect(result.properties.find(p => p.name === 'name')).toBeDefined();
      expect(result.properties.find(p => p.name === 'age')?.optional).toBe(true);
      expect(result.properties.find(p => p.name === 'created_at')).toBeDefined();
      expect(result.properties.find(p => p.name === 'updated_at')).toBeDefined();
    });
  });

  describe('formatProperty', () => {
    it('formats required property', () => {
      const result = formatProperty({
        name: 'email',
        type: 'string',
        optional: false,
        readonly: true,
      });
      expect(result).toBe('  readonly email: string;');
    });

    it('formats optional property', () => {
      const result = formatProperty({
        name: 'bio',
        type: 'string',
        optional: true,
        readonly: true,
      });
      expect(result).toBe('  readonly bio?: string;');
    });

    it('formats property with comment', () => {
      const result = formatProperty({
        name: 'email',
        type: 'string',
        optional: false,
        readonly: true,
        comment: 'User email address',
      });
      expect(result).toContain('/** User email address */');
    });
  });

  describe('formatInterface', () => {
    it('formats complete interface', () => {
      const result = formatInterface({
        name: 'User',
        properties: [
          { name: 'id', type: 'number', optional: false, readonly: true },
          { name: 'email', type: 'string', optional: false, readonly: true },
        ],
        comment: 'User entity',
      });

      expect(result).toContain('export interface User {');
      expect(result).toContain('readonly id: number;');
      expect(result).toContain('readonly email: string;');
    });
  });
});

describe('TypeScript Enum Generator', () => {
  describe('toEnumMemberName', () => {
    it('converts to PascalCase', () => {
      expect(toEnumMemberName('active')).toBe('Active');
      expect(toEnumMemberName('in_progress')).toBe('InProgress');
      expect(toEnumMemberName('ON-HOLD')).toBe('OnHold');
    });
  });

  describe('schemaToEnum', () => {
    it('generates enum from schema', () => {
      const schema: LoadedSchema = {
        name: 'Status',
        kind: 'enum',
        filePath: '/test/status.yaml',
        relativePath: '/test/status.yaml',
        values: ['active', 'inactive', 'pending'],
      };

      const result = schemaToEnum(schema);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Status');
      expect(result?.values).toHaveLength(3);
      expect(result?.values[0]).toEqual({ name: 'Active', value: 'active' });
    });

    it('returns null for non-enum schema', () => {
      const schema: LoadedSchema = {
        name: 'User',
        kind: 'object',
        filePath: '/test/user.yaml',
        relativePath: '/test/user.yaml',
        properties: {},
      };

      const result = schemaToEnum(schema);
      expect(result).toBeNull();
    });
  });

  describe('formatEnum', () => {
    it('formats TypeScript enum', () => {
      const result = formatEnum({
        name: 'Status',
        values: [
          { name: 'Active', value: 'active' },
          { name: 'Inactive', value: 'inactive' },
        ],
        comment: 'Status enum',
      });

      expect(result).toContain('export enum Status {');
      expect(result).toContain("Active = 'active',");
      expect(result).toContain("Inactive = 'inactive',");
    });
  });
});

describe('TypeScript File Generator', () => {
  const schemas: SchemaCollection = {
    User: {
      name: 'User',
      kind: 'object',
      filePath: '/test/user.yaml',
      relativePath: '/test/user.yaml',
      properties: {
        email: { type: 'Email' },
        name: { type: 'String' },
      },
      options: { timestamps: true },
    },
    Status: {
      name: 'Status',
      kind: 'enum',
      filePath: '/test/status.yaml',
      relativePath: '/test/status.yaml',
      values: ['active', 'inactive'],
    },
  };

  describe('generateTypeScript', () => {
    it('generates base, model, enum and index files', () => {
      const result = generateTypeScript(schemas);

      // Should have: base/User.ts, User.ts, Status.ts (category: enum), index.ts
      expect(result.find(f => f.filePath === 'base/User.ts')).toBeDefined();
      expect(result.find(f => f.filePath === 'User.ts')).toBeDefined();
      expect(result.find(f => f.filePath === 'Status.ts' && f.category === 'enum')).toBeDefined();
      expect(result.find(f => f.filePath === 'index.ts')).toBeDefined();
    });

    it('base files have overwrite: true', () => {
      const result = generateTypeScript(schemas);

      const baseFile = result.find(f => f.filePath === 'base/User.ts');
      expect(baseFile?.overwrite).toBe(true);

      const enumFile = result.find(f => f.filePath === 'Status.ts' && f.category === 'enum');
      expect(enumFile?.overwrite).toBe(true);
    });

    it('model files have overwrite: false', () => {
      const result = generateTypeScript(schemas);

      const modelFile = result.find(f => f.filePath === 'User.ts');
      expect(modelFile?.overwrite).toBe(false);
    });

    it('base files contain interface definition', () => {
      const result = generateTypeScript(schemas);

      const baseFile = result.find(f => f.filePath === 'base/User.ts');
      expect(baseFile?.content).toContain('export interface User');
      expect(baseFile?.content).toContain('DO NOT EDIT');
    });

    it('model files extend base', () => {
      const result = generateTypeScript(schemas);

      const modelFile = result.find(f => f.filePath === 'User.ts');
      expect(modelFile?.content).toContain('extends UserBase');
      expect(modelFile?.content).toContain("import type { User as UserBase } from './base/User'");
    });

    it('enum files contain enum definition and helpers', () => {
      const result = generateTypeScript(schemas);

      const enumFile = result.find(f => f.filePath === 'Status.ts' && f.category === 'enum');
      expect(enumFile?.content).toContain('export enum Status');
      expect(enumFile?.content).toContain("Active = 'active'");
      expect(enumFile?.content).toContain('export const StatusValues');
      expect(enumFile?.content).toContain('export function isStatus');
      expect(enumFile?.content).toContain('export function getStatusLabel');
      expect(enumFile?.content).toContain('export function getStatusExtra');
    });

    it('index file re-exports all enum helpers', () => {
      const result = generateTypeScript(schemas);

      const indexFile = result.find(f => f.filePath === 'index.ts');
      expect(indexFile?.content).toContain('Status,');
      expect(indexFile?.content).toContain('StatusValues,');
      expect(indexFile?.content).toContain('isStatus,');
      expect(indexFile?.content).toContain('getStatusLabel,');
      expect(indexFile?.content).toContain('getStatusExtra,');
      expect(indexFile?.content).toContain("export type { User, UserCreate, UserUpdate } from './User'");
    });
  });
});

// ===========================================================================
// Polymorphic TypeScript Tests
// ===========================================================================

describe('TypeScript Polymorphic Generator', () => {
  const schemas: SchemaCollection = {
    Post: {
      name: 'Post',
      filePath: '/test/post.yaml',
      relativePath: 'post.yaml',
    },
    Video: {
      name: 'Video',
      filePath: '/test/video.yaml',
      relativePath: 'video.yaml',
    },
    Comment: {
      name: 'Comment',
      filePath: '/test/comment.yaml',
      relativePath: 'comment.yaml',
    },
  };

  describe('getPropertyType - Polymorphic', () => {
    it('maps MorphTo to union type', () => {
      const result = getPropertyType(
        {
          type: 'Association',
          relation: 'MorphTo',
          targets: ['Post', 'Video'],
        } as any,
        schemas
      );
      expect(result).toBe('Post | Video');
    });

    it('maps MorphOne to single type', () => {
      const result = getPropertyType(
        {
          type: 'Association',
          relation: 'MorphOne',
          target: 'Image',
          morphName: 'imageable',
        } as any,
        schemas
      );
      expect(result).toBe('Image');
    });

    it('maps MorphMany to array type', () => {
      const result = getPropertyType(
        {
          type: 'Association',
          relation: 'MorphMany',
          target: 'Comment',
          morphName: 'commentable',
        } as any,
        schemas
      );
      expect(result).toBe('Comment[]');
    });

    it('maps MorphToMany to array type', () => {
      const result = getPropertyType(
        {
          type: 'Association',
          relation: 'MorphToMany',
          target: 'Tag',
        } as any,
        schemas
      );
      expect(result).toBe('Tag[]');
    });

    it('maps MorphedByMany to array type', () => {
      const result = getPropertyType(
        {
          type: 'Association',
          relation: 'MorphedByMany',
          target: 'Post',
          morphName: 'taggable',
        } as any,
        schemas
      );
      expect(result).toBe('Post[]');
    });
  });

  describe('propertyToTSProperties - Polymorphic', () => {
    it('returns multiple properties for MorphTo', () => {
      const result = propertyToTSProperties(
        'commentable',
        {
          type: 'Association',
          relation: 'MorphTo',
          targets: ['Post', 'Video'],
        } as any,
        schemas
      );

      expect(result).toHaveLength(3);

      // Type column
      const typeProp = result.find(p => p.name === 'commentableType');
      expect(typeProp).toBeDefined();
      expect(typeProp?.type).toBe("'Post' | 'Video'");
      expect(typeProp?.optional).toBe(true);

      // ID column
      const idProp = result.find(p => p.name === 'commentableId');
      expect(idProp).toBeDefined();
      expect(idProp?.type).toBe('number');
      expect(idProp?.optional).toBe(true);

      // Relation property
      const relationProp = result.find(p => p.name === 'commentable');
      expect(relationProp).toBeDefined();
      expect(relationProp?.type).toBe('Post | Video | null');
      expect(relationProp?.optional).toBe(true);
    });

    it('returns single property for non-MorphTo associations', () => {
      const result = propertyToTSProperties(
        'comments',
        {
          type: 'Association',
          relation: 'MorphMany',
          target: 'Comment',
          morphName: 'commentable',
        } as any,
        schemas
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('comments');
      expect(result[0].type).toBe('Comment[]');
    });
  });

  describe('schemaToInterface - Polymorphic', () => {
    it('includes polymorphic properties for MorphTo', () => {
      const schema: LoadedSchema = {
        name: 'Comment',
        kind: 'object',
        filePath: '/test/comment.yaml',
        relativePath: 'comment.yaml',
        properties: {
          content: { type: 'Text' },
          commentable: {
            type: 'Association',
            relation: 'MorphTo',
            targets: ['Post', 'Video'],
          } as any,
        },
        options: { timestamps: false },
      };

      const result = schemaToInterface(schema, schemas);

      // Should have: id, content, commentableType, commentableId, commentable
      expect(result.properties.find(p => p.name === 'commentableType')).toBeDefined();
      expect(result.properties.find(p => p.name === 'commentableId')).toBeDefined();
      expect(result.properties.find(p => p.name === 'commentable')).toBeDefined();
    });
  });

  describe('generateTypeScript - Polymorphic', () => {
    it('generates correct types for polymorphic schema', () => {
      const schemasWithPolymorphic: SchemaCollection = {
        Comment: {
          name: 'Comment',
          kind: 'object',
          filePath: '/test/comment.yaml',
          relativePath: 'comment.yaml',
          properties: {
            content: { type: 'Text' },
            commentable: {
              type: 'Association',
              relation: 'MorphTo',
              targets: ['Post', 'Video'],
            } as any,
          },
          options: { timestamps: false },
        },
        Post: {
          name: 'Post',
          kind: 'object',
          filePath: '/test/post.yaml',
          relativePath: 'post.yaml',
          properties: {
            title: { type: 'String' },
            comments: {
              type: 'Association',
              relation: 'MorphMany',
              target: 'Comment',
              morphName: 'commentable',
            } as any,
          },
          options: { timestamps: false },
        },
        Video: {
          name: 'Video',
          kind: 'object',
          filePath: '/test/video.yaml',
          relativePath: 'video.yaml',
          properties: {
            url: { type: 'String' },
          },
          options: { timestamps: false },
        },
      };

      const result = generateTypeScript(schemasWithPolymorphic);

      // Find base/Comment.ts and check content
      const commentBase = result.find(f => f.filePath === 'base/Comment.ts');
      expect(commentBase?.content).toContain('commentableType');
      expect(commentBase?.content).toContain('commentableId');
      expect(commentBase?.content).toContain("'Post' | 'Video'");

      // Find base/Post.ts and check content
      const postBase = result.find(f => f.filePath === 'base/Post.ts');
      expect(postBase?.content).toContain('Comment[]');
    });
  });
});

// ============================================================================
// LocalizedString サポートテスト (i18n)
// ============================================================================

describe('TypeScript Generator - LocalizedString対応', () => {
  describe('schemaToInterface - displayName解決', () => {
    const schemas: SchemaCollection = {};

    it('文字列形式のdisplayNameをそのまま使用する', () => {
      const schema: LoadedSchema = {
        name: 'User',
        displayName: 'ユーザー',
        filePath: '/test.yaml',
        relativePath: 'test.yaml',
        properties: {
          name: { type: 'String', displayName: '名前' },
        },
      };

      const iface = schemaToInterface(schema, schemas);

      expect(iface.comment).toBe('ユーザー');
      expect(iface.properties.find(p => p.name === 'name')?.comment).toBe('名前');
    });

    it('LocaleMap形式のdisplayNameをデフォルトロケールで解決する', () => {
      const schema: LoadedSchema = {
        name: 'Product',
        displayName: { ja: '商品', en: 'Product' },
        filePath: '/test.yaml',
        relativePath: 'test.yaml',
        properties: {
          name: {
            type: 'String',
            displayName: { ja: '商品名', en: 'Product Name' },
          },
        },
      };

      // No locale config - should use default behavior (first key or 'en')
      const iface = schemaToInterface(schema, schemas);

      // Should resolve to something (implementation uses first available)
      expect(iface.comment).toBeDefined();
      expect(typeof iface.comment).toBe('string');
    });

    it('localeオプションで指定したロケールを使用する', () => {
      const schema: LoadedSchema = {
        name: 'Product',
        displayName: { ja: '商品', en: 'Product', vi: 'Sản phẩm' },
        filePath: '/test.yaml',
        relativePath: 'test.yaml',
        properties: {
          name: {
            type: 'String',
            displayName: { ja: '商品名', en: 'Product Name', vi: 'Tên sản phẩm' },
          },
        },
      };

      // Japanese locale
      const ifaceJa = schemaToInterface(schema, schemas, {
        localeConfig: { locales: ['ja', 'en', 'vi'], defaultLocale: 'ja' },
        locale: 'ja',
      });
      expect(ifaceJa.comment).toBe('商品');
      expect(ifaceJa.properties.find(p => p.name === 'name')?.comment).toBe('商品名');

      // English locale
      const ifaceEn = schemaToInterface(schema, schemas, {
        localeConfig: { locales: ['ja', 'en', 'vi'], defaultLocale: 'en' },
        locale: 'en',
      });
      expect(ifaceEn.comment).toBe('Product');
      expect(ifaceEn.properties.find(p => p.name === 'name')?.comment).toBe('Product Name');

      // Vietnamese locale
      const ifaceVi = schemaToInterface(schema, schemas, {
        localeConfig: { locales: ['ja', 'en', 'vi'], defaultLocale: 'en' },
        locale: 'vi',
      });
      expect(ifaceVi.comment).toBe('Sản phẩm');
      expect(ifaceVi.properties.find(p => p.name === 'name')?.comment).toBe('Tên sản phẩm');
    });

    it('存在しないロケールはdefaultLocaleにフォールバックする', () => {
      const schema: LoadedSchema = {
        name: 'Category',
        displayName: { ja: 'カテゴリ', en: 'Category' },
        filePath: '/test.yaml',
        relativePath: 'test.yaml',
        properties: {
          name: { type: 'String' },
        },
      };

      const iface = schemaToInterface(schema, schemas, {
        localeConfig: { locales: ['ja', 'en', 'ko'], defaultLocale: 'en' },
        locale: 'ko', // Korean not in displayName
      });

      // Should fallback to defaultLocale (en)
      expect(iface.comment).toBe('Category');
    });

    it('displayNameがundefinedの場合はschema.nameを使用する', () => {
      const schema: LoadedSchema = {
        name: 'Order',
        filePath: '/test.yaml',
        relativePath: 'test.yaml',
        properties: {
          total: { type: 'Decimal' },
        },
      };

      const iface = schemaToInterface(schema, schemas);

      expect(iface.comment).toBe('Order');
    });
  });

  describe('schemaToEnum - displayName解決', () => {
    it('LocaleMap形式のdisplayNameを解決する', () => {
      const schema: LoadedSchema = {
        name: 'Status',
        kind: 'enum',
        displayName: { ja: 'ステータス', en: 'Status' },
        filePath: '/test.yaml',
        relativePath: 'test.yaml',
        values: ['active', 'inactive'],
      };

      const enumJa = schemaToEnum(schema, {
        localeConfig: { locales: ['ja', 'en'], defaultLocale: 'ja' },
        locale: 'ja',
      });
      expect(enumJa?.comment).toBe('ステータス');

      const enumEn = schemaToEnum(schema, {
        localeConfig: { locales: ['ja', 'en'], defaultLocale: 'en' },
        locale: 'en',
      });
      expect(enumEn?.comment).toBe('Status');
    });
  });

  describe('formatInterface - JSDocコメント', () => {
    it('解決されたdisplayNameがJSDocコメントとして出力される', () => {
      const schema: LoadedSchema = {
        name: 'User',
        displayName: { ja: 'ユーザー', en: 'User' },
        filePath: '/test.yaml',
        relativePath: 'test.yaml',
        properties: {
          email: {
            type: 'Email',
            displayName: { ja: 'メールアドレス', en: 'Email Address' },
          },
        },
      };

      const iface = schemaToInterface(schema, {}, {
        localeConfig: { locales: ['ja', 'en'], defaultLocale: 'ja' },
        locale: 'ja',
      });
      const output = formatInterface(iface);

      expect(output).toContain('* ユーザー');
      expect(output).toContain('/** メールアドレス */');
    });
  });
});

// ============================================================================
// Plugin Enum Tests (@omnify-client/enum)
// ============================================================================

describe('TypeScript Generator - Plugin Enums', () => {
  const schemas: SchemaCollection = {
    User: {
      name: 'User',
      kind: 'object',
      filePath: '/test/user.yaml',
      relativePath: '/test/user.yaml',
      properties: {
        email: { type: 'Email' },
        prefecture: { type: 'EnumRef', enum: 'Prefecture' } as any,
      },
      options: { timestamps: true },
    },
  };

  // Mock plugin enums (like Prefecture from @famgia/omnify-japan)
  const pluginEnums = new Map([
    ['Prefecture', {
      name: 'Prefecture',
      values: [
        { value: 'hokkaido', label: { ja: '北海道', en: 'Hokkaido' } },
        { value: 'aomori', label: { ja: '青森県', en: 'Aomori' } },
      ],
    }],
    ['BankAccountType', {
      name: 'BankAccountType',
      values: [
        { value: 'ordinary', label: { ja: '普通', en: 'Ordinary' } },
        { value: 'current', label: { ja: '当座', en: 'Current' } },
      ],
    }],
  ]);

  describe('generateTypeScript with pluginEnums', () => {
    it('generates plugin enum files with category "plugin-enum"', () => {
      const result = generateTypeScript(schemas, {
        pluginEnums,
        pluginEnumImportPrefix: '@omnify-client/enum',
      });

      // Find plugin enum files
      const prefectureFile = result.find(f => f.filePath === 'Prefecture.ts' && f.category === 'plugin-enum');
      const bankFile = result.find(f => f.filePath === 'BankAccountType.ts' && f.category === 'plugin-enum');

      expect(prefectureFile).toBeDefined();
      expect(prefectureFile?.category).toBe('plugin-enum');
      expect(prefectureFile?.overwrite).toBe(true);

      expect(bankFile).toBeDefined();
      expect(bankFile?.category).toBe('plugin-enum');
    });

    it('plugin enum files contain enum definition and helpers', () => {
      const result = generateTypeScript(schemas, {
        pluginEnums,
        pluginEnumImportPrefix: '@omnify-client/enum',
      });

      const prefectureFile = result.find(f => f.filePath === 'Prefecture.ts' && f.category === 'plugin-enum');

      expect(prefectureFile?.content).toContain('export enum Prefecture');
      expect(prefectureFile?.content).toContain('export const PrefectureValues');
      expect(prefectureFile?.content).toContain('export function isPrefecture');
      expect(prefectureFile?.content).toContain('export function getPrefectureLabel');
      expect(prefectureFile?.content).toContain('export function getPrefectureExtra');
    });

    it('index file imports plugin enums from @omnify-client/enum', () => {
      const result = generateTypeScript(schemas, {
        pluginEnums,
        pluginEnumImportPrefix: '@omnify-client/enum',
      });

      const indexFile = result.find(f => f.filePath === 'index.ts');

      expect(indexFile?.content).toContain("from '@omnify-client/enum/Prefecture'");
      expect(indexFile?.content).toContain("from '@omnify-client/enum/BankAccountType'");
      expect(indexFile?.content).toContain('Prefecture,');
      expect(indexFile?.content).toContain('PrefectureValues,');
      expect(indexFile?.content).toContain('isPrefecture,');
      expect(indexFile?.content).toContain('getPrefectureLabel,');
    });

    it('base files import plugin enums from @omnify-client/enum', () => {
      const result = generateTypeScript(schemas, {
        pluginEnums,
        pluginEnumImportPrefix: '@omnify-client/enum',
        enumImportPrefix: '../enum',
      });

      const userBaseFile = result.find(f => f.filePath === 'base/User.ts');

      // Should import Prefecture from plugin enum path, not regular enum path
      expect(userBaseFile?.content).toContain("from '@omnify-client/enum/Prefecture'");
      expect(userBaseFile?.content).not.toContain("from '../enum/plugin/Prefecture'");
    });

    it('uses legacy plugin/ path when pluginEnumImportPrefix is not set', () => {
      const result = generateTypeScript(schemas, {
        pluginEnums,
        enumImportPrefix: '../enum',
        // pluginEnumImportPrefix NOT set - should use legacy path
      });

      const indexFile = result.find(f => f.filePath === 'index.ts');

      // Should use legacy plugin/ subfolder path
      expect(indexFile?.content).toContain("from '../enum/plugin/Prefecture'");
      expect(indexFile?.content).toContain("from '../enum/plugin/BankAccountType'");
    });

    it('distinguishes schema enums from plugin enums', () => {
      const schemasWithEnum: SchemaCollection = {
        ...schemas,
        Status: {
          name: 'Status',
          kind: 'enum',
          filePath: '/test/status.yaml',
          relativePath: '/test/status.yaml',
          values: ['active', 'inactive'],
        },
      };

      const result = generateTypeScript(schemasWithEnum, {
        pluginEnums,
        pluginEnumImportPrefix: '@omnify-client/enum',
        enumImportPrefix: '../enum',
      });

      // Schema enum should have category 'enum'
      const statusFile = result.find(f => f.filePath === 'Status.ts' && f.category === 'enum');
      expect(statusFile).toBeDefined();
      expect(statusFile?.category).toBe('enum');

      // Plugin enums should have category 'plugin-enum'
      const prefectureFile = result.find(f => f.filePath === 'Prefecture.ts' && f.category === 'plugin-enum');
      expect(prefectureFile).toBeDefined();
      expect(prefectureFile?.category).toBe('plugin-enum');

      // Index should import them from different paths
      const indexFile = result.find(f => f.filePath === 'index.ts');
      expect(indexFile?.content).toContain("from '../enum/Status'"); // Schema enum
      expect(indexFile?.content).toContain("from '@omnify-client/enum/Prefecture'"); // Plugin enum
    });
  });
});
