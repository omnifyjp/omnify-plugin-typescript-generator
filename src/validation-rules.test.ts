/**
 * @famgia/omnify-typescript - Validation Rules Tests
 *
 * Tests for extended validation rules mapping to Zod schemas.
 */

import { describe, it, expect } from 'vitest';
import { generateZodSchemas } from './zod-generator.js';
import type { LoadedSchema } from '@famgia/omnify-types';

// Helper to create a test schema with a single property
function createTestSchema(
    propName: string,
    propDef: Record<string, unknown>
): LoadedSchema {
    return {
        name: 'Test',
        kind: 'object',
        filePath: '/test.yaml',
        relativePath: '/test.yaml',
        properties: {
            [propName]: propDef as any,
        },
    };
}

// Helper to get generated schema string for a property
function getGeneratedSchema(
    propName: string,
    propDef: Record<string, unknown>
): string {
    const schema = createTestSchema(propName, propDef);
    const zodSchemas = generateZodSchemas(schema, {});
    const result = zodSchemas.find(s => s.fieldName === propName);
    return result?.schema ?? '';
}

describe('Validation Rules', () => {
    // ===========================================================================
    // Format Rules
    // ===========================================================================

    describe('Format Rules', () => {
        it('generates z.url() for url rule', () => {
            const schema = getGeneratedSchema('website', {
                type: 'String',
                rules: { url: true },
            });
            expect(schema).toBe('z.url()');
        });

        it('generates z.uuid() for uuid rule', () => {
            const schema = getGeneratedSchema('token', {
                type: 'String',
                rules: { uuid: true },
            });
            expect(schema).toBe('z.uuid()');
        });

        it('generates z.ip() for ip rule', () => {
            const schema = getGeneratedSchema('ip_address', {
                type: 'String',
                rules: { ip: true },
            });
            expect(schema).toBe('z.ip()');
        });

        it('generates z.ipv4() for ipv4 rule', () => {
            const schema = getGeneratedSchema('ipv4_address', {
                type: 'String',
                rules: { ipv4: true },
            });
            expect(schema).toBe('z.ipv4()');
        });

        it('generates z.ipv6() for ipv6 rule', () => {
            const schema = getGeneratedSchema('ipv6_address', {
                type: 'String',
                rules: { ipv6: true },
            });
            expect(schema).toBe('z.ipv6()');
        });
    });

    // ===========================================================================
    // Character Pattern Rules
    // ===========================================================================

    describe('Character Pattern Rules', () => {
        it('generates alpha regex for alpha rule', () => {
            const schema = getGeneratedSchema('name', {
                type: 'String',
                rules: { alpha: true },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.regex(/^[a-zA-Z]*$/');
            expect(schema).toContain("message: 'Must contain only letters'");
        });

        it('generates alphaNum regex for alphaNum rule', () => {
            const schema = getGeneratedSchema('code', {
                type: 'String',
                rules: { alphaNum: true },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.regex(/^[a-zA-Z0-9]*$/');
            expect(schema).toContain("message: 'Must contain only letters and numbers'");
        });

        it('generates alphaDash regex for alphaDash rule', () => {
            const schema = getGeneratedSchema('slug', {
                type: 'String',
                rules: { alphaDash: true },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.regex(/^[a-zA-Z0-9_-]*$/');
        });

        it('generates numeric regex for numeric rule', () => {
            const schema = getGeneratedSchema('phone', {
                type: 'String',
                rules: { numeric: true },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.regex(/^\\d*$/');
            expect(schema).toContain("message: 'Must contain only numbers'");
        });

        it('generates digits validation for digits rule', () => {
            const schema = getGeneratedSchema('postal_code', {
                type: 'String',
                rules: { digits: 5 },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.length(5)');
            expect(schema).toContain('.regex(/^\\d+$/');
        });

        it('generates digitsBetween validation', () => {
            const schema = getGeneratedSchema('code', {
                type: 'String',
                rules: { digitsBetween: [4, 6] },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(4)');
            expect(schema).toContain('.max(6)');
            expect(schema).toContain('.regex(/^\\d+$/');
        });
    });

    // ===========================================================================
    // String Matching Rules
    // ===========================================================================

    describe('String Matching Rules', () => {
        it('generates startsWith for single prefix', () => {
            const schema = getGeneratedSchema('reference', {
                type: 'String',
                rules: { startsWith: 'REF-' },
            });
            expect(schema).toContain(".startsWith('REF-')");
        });

        it('generates regex for multiple prefixes', () => {
            const schema = getGeneratedSchema('code', {
                type: 'String',
                rules: { startsWith: ['A-', 'B-', 'C-'] },
            });
            expect(schema).toContain('.regex(/^(A-|B-|C-)/');
            expect(schema).toContain("message: 'Must start with:");
        });

        it('generates endsWith for single suffix', () => {
            const schema = getGeneratedSchema('filename', {
                type: 'String',
                rules: { endsWith: '.pdf' },
            });
            expect(schema).toContain(".endsWith('.pdf')");
        });

        it('generates regex for multiple suffixes', () => {
            const schema = getGeneratedSchema('filename', {
                type: 'String',
                rules: { endsWith: ['.jpg', '.png', '.gif'] },
            });
            expect(schema).toContain('.regex(/(\\.jpg|\\.png|\\.gif)$/');
            expect(schema).toContain("message: 'Must end with:");
        });

        it('generates lowercase refine', () => {
            const schema = getGeneratedSchema('username', {
                type: 'String',
                rules: { lowercase: true },
            });
            expect(schema).toContain('.refine(v => v === v.toLowerCase()');
        });

        it('generates uppercase refine', () => {
            const schema = getGeneratedSchema('country_code', {
                type: 'String',
                rules: { uppercase: true },
            });
            expect(schema).toContain('.refine(v => v === v.toUpperCase()');
        });
    });

    // ===========================================================================
    // Numeric Rules
    // ===========================================================================

    describe('Numeric Rules', () => {
        it('generates gte for min rule on Int', () => {
            const schema = getGeneratedSchema('age', {
                type: 'Int',
                rules: { min: 18 },
            });
            expect(schema).toContain('z.number().int()');
            expect(schema).toContain('.gte(18)');
        });

        it('generates lte for max rule on Int', () => {
            const schema = getGeneratedSchema('quantity', {
                type: 'Int',
                rules: { max: 100 },
            });
            expect(schema).toContain('z.number().int()');
            expect(schema).toContain('.lte(100)');
        });

        it('generates between range for Int', () => {
            const schema = getGeneratedSchema('score', {
                type: 'Int',
                rules: { between: [0, 100] },
            });
            expect(schema).toContain('z.number().int()');
            expect(schema).toContain('.gte(0)');
            expect(schema).toContain('.lte(100)');
        });

        it('generates gt for greater than', () => {
            const schema = getGeneratedSchema('price', {
                type: 'Float',
                rules: { gt: 0 },
            });
            expect(schema).toContain('z.number()');
            expect(schema).toContain('.gt(0)');
        });

        it('generates lt for less than', () => {
            const schema = getGeneratedSchema('discount', {
                type: 'Float',
                rules: { lt: 1 },
            });
            expect(schema).toContain('z.number()');
            expect(schema).toContain('.lt(1)');
        });

        it('generates multipleOf for step validation', () => {
            const schema = getGeneratedSchema('quantity', {
                type: 'Int',
                rules: { multipleOf: 5 },
            });
            expect(schema).toContain('z.number().int()');
            expect(schema).toContain('.multipleOf(5)');
        });
    });

    // ===========================================================================
    // String Length Rules
    // ===========================================================================

    describe('String Length Rules', () => {
        it('generates minLength from rules', () => {
            const schema = getGeneratedSchema('password', {
                type: 'Password',
                rules: { minLength: 8 },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(8)');
        });

        it('generates maxLength from rules', () => {
            const schema = getGeneratedSchema('bio', {
                type: 'Text',
                rules: { maxLength: 500 },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.max(500)');
        });

        it('generates both min and max length', () => {
            const schema = getGeneratedSchema('username', {
                type: 'String',
                rules: { minLength: 3, maxLength: 20 },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(3)');
            expect(schema).toContain('.max(20)');
        });
    });

    // ===========================================================================
    // Combined Rules
    // ===========================================================================

    describe('Combined Rules', () => {
        it('combines multiple rules correctly', () => {
            const schema = getGeneratedSchema('username', {
                type: 'String',
                rules: {
                    minLength: 3,
                    maxLength: 20,
                    alphaDash: true,
                    lowercase: true,
                },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(3)');
            expect(schema).toContain('.max(20)');
            expect(schema).toContain('.regex(/^[a-zA-Z0-9_-]*$/');
            expect(schema).toContain('.refine(v => v === v.toLowerCase()');
        });

        it('url rule with nullable', () => {
            const schema = getGeneratedSchema('website', {
                type: 'String',
                nullable: true,
                rules: { url: true },
            });
            expect(schema).toBe('z.url().optional().nullable()');
        });

        it('uuid rule with nullable', () => {
            const schema = getGeneratedSchema('external_id', {
                type: 'String',
                nullable: true,
                rules: { uuid: true },
            });
            expect(schema).toBe('z.uuid().optional().nullable()');
        });
    });

    // ===========================================================================
    // Edge Cases
    // ===========================================================================

    describe('Edge Cases', () => {
        it('handles empty rules object', () => {
            const schema = getGeneratedSchema('name', {
                type: 'String',
                rules: {},
            });
            expect(schema).toBe('z.string().min(1)');
        });

        it('handles undefined rules', () => {
            const schema = getGeneratedSchema('name', {
                type: 'String',
            });
            expect(schema).toBe('z.string().min(1)');
        });

        it('format rules override base type', () => {
            // url rule should produce z.url(), not z.string()
            const schema = getGeneratedSchema('link', {
                type: 'String',
                rules: { url: true },
            });
            expect(schema).toBe('z.url()');
            expect(schema).not.toContain('z.string()');
        });

        it('escapes special characters in startsWith regex', () => {
            const schema = getGeneratedSchema('code', {
                type: 'String',
                rules: { startsWith: ['$USD', '€EUR'] },
            });
            expect(schema).toContain('\\$USD');
            expect(schema).toContain('€EUR');
        });

        it('escapes special characters in endsWith regex', () => {
            const schema = getGeneratedSchema('path', {
                type: 'String',
                rules: { endsWith: ['.ts', '.tsx'] },
            });
            expect(schema).toContain('\\.ts');
            expect(schema).toContain('\\.tsx');
        });
    });

    // ===========================================================================
    // Integer Type Variants
    // ===========================================================================

    describe('Integer Type Variants', () => {
        it('applies min/max to TinyInt', () => {
            const schema = getGeneratedSchema('rating', {
                type: 'TinyInt',
                rules: { min: 1, max: 5 },
            });
            expect(schema).toContain('z.number().int()');
            expect(schema).toContain('.gte(1)');
            expect(schema).toContain('.lte(5)');
        });

        it('applies min/max to BigInt', () => {
            const schema = getGeneratedSchema('large_count', {
                type: 'BigInt',
                rules: { min: 0, max: 9999999999 },
            });
            expect(schema).toContain('z.number().int()');
            expect(schema).toContain('.gte(0)');
            expect(schema).toContain('.lte(9999999999)');
        });

        it('applies between to TinyInt', () => {
            const schema = getGeneratedSchema('level', {
                type: 'TinyInt',
                rules: { between: [1, 10] },
            });
            expect(schema).toContain('z.number().int()');
            expect(schema).toContain('.gte(1)');
            expect(schema).toContain('.lte(10)');
        });

        it('applies multipleOf to BigInt', () => {
            const schema = getGeneratedSchema('chunks', {
                type: 'BigInt',
                rules: { multipleOf: 1024 },
            });
            expect(schema).toContain('z.number().int()');
            expect(schema).toContain('.multipleOf(1024)');
        });
    });

    // ===========================================================================
    // Negative & Zero Values
    // ===========================================================================

    describe('Negative & Zero Values', () => {
        it('handles negative min value', () => {
            const schema = getGeneratedSchema('temperature', {
                type: 'Int',
                rules: { min: -273 },
            });
            expect(schema).toContain('.gte(-273)');
        });

        it('handles negative max value', () => {
            const schema = getGeneratedSchema('debt', {
                type: 'Int',
                rules: { max: -1 },
            });
            expect(schema).toContain('.lte(-1)');
        });

        it('handles negative between range', () => {
            const schema = getGeneratedSchema('offset', {
                type: 'Int',
                rules: { between: [-100, 100] },
            });
            expect(schema).toContain('.gte(-100)');
            expect(schema).toContain('.lte(100)');
        });

        it('handles min = 0 correctly', () => {
            const schema = getGeneratedSchema('count', {
                type: 'Int',
                rules: { min: 0 },
            });
            expect(schema).toContain('.gte(0)');
        });

        it('handles gt = 0 correctly', () => {
            const schema = getGeneratedSchema('positive', {
                type: 'Int',
                rules: { gt: 0 },
            });
            expect(schema).toContain('.gt(0)');
        });

        it('handles lt = 0 correctly', () => {
            const schema = getGeneratedSchema('negative', {
                type: 'Int',
                rules: { lt: 0 },
            });
            expect(schema).toContain('.lt(0)');
        });

        it('handles negative float values', () => {
            const schema = getGeneratedSchema('balance', {
                type: 'Float',
                rules: { min: -999999.99, max: 999999.99 },
            });
            expect(schema).toContain('.gte(-999999.99)');
            expect(schema).toContain('.lte(999999.99)');
        });
    });

    // ===========================================================================
    // Text Type Variants
    // ===========================================================================

    describe('Text Type Variants', () => {
        it('applies rules to Text type', () => {
            const schema = getGeneratedSchema('content', {
                type: 'Text',
                rules: { minLength: 10, maxLength: 1000 },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(10)');
            expect(schema).toContain('.max(1000)');
        });

        it('applies rules to MediumText type', () => {
            const schema = getGeneratedSchema('article', {
                type: 'MediumText',
                rules: { minLength: 100 },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(100)');
        });

        it('applies rules to LongText type', () => {
            const schema = getGeneratedSchema('book', {
                type: 'LongText',
                rules: { maxLength: 100000 },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.max(100000)');
        });

        it('applies alpha rule to Password type', () => {
            const schema = getGeneratedSchema('secret', {
                type: 'Password',
                rules: { minLength: 8, alphaNum: true },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(8)');
            expect(schema).toContain('.regex(/^[a-zA-Z0-9]*$/');
        });
    });

    // ===========================================================================
    // Format Rules Priority
    // ===========================================================================

    describe('Format Rules Priority', () => {
        it('url takes priority over uuid', () => {
            // 最初にマッチしたフォーマットルールが優先される
            const schema = getGeneratedSchema('link', {
                type: 'String',
                rules: { url: true, uuid: true },
            });
            expect(schema).toBe('z.url()');
        });

        it('uuid applies when url is false', () => {
            const schema = getGeneratedSchema('token', {
                type: 'String',
                rules: { url: false, uuid: true },
            });
            expect(schema).toBe('z.uuid()');
        });

        it('ip takes priority when set', () => {
            const schema = getGeneratedSchema('address', {
                type: 'String',
                rules: { ip: true },
            });
            expect(schema).toBe('z.ip()');
        });

        it('ipv4 applies correctly', () => {
            const schema = getGeneratedSchema('v4', {
                type: 'String',
                rules: { ipv4: true },
            });
            expect(schema).toBe('z.ipv4()');
        });

        it('ipv6 applies correctly', () => {
            const schema = getGeneratedSchema('v6', {
                type: 'String',
                rules: { ipv6: true },
            });
            expect(schema).toBe('z.ipv6()');
        });
    });

    // ===========================================================================
    // Complex Combined Rules
    // ===========================================================================

    describe('Complex Combined Rules', () => {
        it('combines url with nullable and maxLength', () => {
            const schema = getGeneratedSchema('website', {
                type: 'String',
                nullable: true,
                rules: { url: true, maxLength: 2000 },
            });
            expect(schema).toContain('z.url()');
            expect(schema).toContain('.max(2000)');
            expect(schema).toContain('.optional().nullable()');
        });

        it('combines multiple numeric rules', () => {
            const schema = getGeneratedSchema('percentage', {
                type: 'Float',
                rules: { min: 0, max: 100, multipleOf: 0.01 },
            });
            expect(schema).toContain('z.number()');
            expect(schema).toContain('.gte(0)');
            expect(schema).toContain('.lte(100)');
            expect(schema).toContain('.multipleOf(0.01)');
        });

        it('combines string pattern rules', () => {
            const schema = getGeneratedSchema('slug', {
                type: 'String',
                rules: {
                    minLength: 3,
                    maxLength: 50,
                    alphaDash: true,
                    lowercase: true,
                    startsWith: 'post-',
                },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(3)');
            expect(schema).toContain('.max(50)');
            expect(schema).toContain('.regex(/^[a-zA-Z0-9_-]*$/');
            expect(schema).toContain('.refine(v => v === v.toLowerCase()');
            expect(schema).toContain(".startsWith('post-')");
        });

        it('combines digits with length constraints', () => {
            const schema = getGeneratedSchema('phone', {
                type: 'String',
                rules: {
                    numeric: true,
                    minLength: 10,
                    maxLength: 11,
                },
            });
            expect(schema).toContain('z.string()');
            expect(schema).toContain('.min(10)');
            expect(schema).toContain('.max(11)');
            expect(schema).toContain('.regex(/^\\d*$/');
        });

        it('ip with nullable works correctly', () => {
            const schema = getGeneratedSchema('server_ip', {
                type: 'String',
                nullable: true,
                rules: { ip: true },
            });
            expect(schema).toBe('z.ip().optional().nullable()');
        });
    });

    // ===========================================================================
    // Boundary Values
    // ===========================================================================

    describe('Boundary Values', () => {
        it('handles zero minLength', () => {
            const schema = getGeneratedSchema('optional_text', {
                type: 'String',
                rules: { minLength: 0 },
            });
            // minLength: 0 は .min(0) を追加（空文字許可）
            expect(schema).toContain('z.string()');
        });

        it('handles very large maxLength', () => {
            const schema = getGeneratedSchema('huge', {
                type: 'String',
                rules: { maxLength: 16777215 }, // MEDIUMTEXT limit
            });
            expect(schema).toContain('.max(16777215)');
        });

        it('handles very small float', () => {
            const schema = getGeneratedSchema('precision', {
                type: 'Float',
                rules: { min: 0.0001 },
            });
            expect(schema).toContain('.gte(0.0001)');
        });

        it('handles digits = 1', () => {
            const schema = getGeneratedSchema('single', {
                type: 'String',
                rules: { digits: 1 },
            });
            expect(schema).toContain('.length(1)');
            expect(schema).toContain('.regex(/^\\d+$/');
        });

        it('ignores empty string prefix', () => {
            // 空文字列は無視される（セキュリティ上の理由）
            const schema = getGeneratedSchema('any', {
                type: 'String',
                rules: { startsWith: '' },
            });
            expect(schema).not.toContain('startsWith');
            expect(schema).toBe('z.string().min(1)');
        });
    });

    // ===========================================================================
    // Error Prevention
    // ===========================================================================

    describe('Error Prevention', () => {
        it('does not apply numeric rules to string types', () => {
            const schema = getGeneratedSchema('name', {
                type: 'String',
                rules: { min: 5, max: 100 }, // これはNumeric用、Stringには無効
            });
            expect(schema).not.toContain('.gte(');
            expect(schema).not.toContain('.lte(');
            expect(schema).toContain('z.string()');
        });

        it('does not apply string rules to numeric types', () => {
            const schema = getGeneratedSchema('count', {
                type: 'Int',
                rules: { minLength: 5, alpha: true }, // これはString用、Intには無視される
            });
            expect(schema).not.toContain('.regex(');
            expect(schema).not.toContain('.min(5)'); // minLengthはIntには無効
            expect(schema).toContain('z.number().int()');
        });

        it('handles conflicting rules gracefully', () => {
            // min > max は論理的に矛盾だが、そのまま出力する
            const schema = getGeneratedSchema('broken', {
                type: 'Int',
                rules: { min: 100, max: 10 },
            });
            expect(schema).toContain('.gte(100)');
            expect(schema).toContain('.lte(10)');
        });
    });
});
