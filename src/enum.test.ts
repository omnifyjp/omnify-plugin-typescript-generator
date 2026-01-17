/**
 * @famgia/omnify-typescript - Comprehensive Enum Tests
 *
 * Tests for enum generation with helper methods.
 */

import { describe, it, expect } from 'vitest';
import {
  toPascalCase,
  toEnumMemberName,
  schemaToEnum,
  formatEnum,
  generateEnums,
  formatTypeAlias,
  extractInlineEnums,
} from './enum-generator.js';
import type { LoadedSchema, SchemaCollection } from '@famgia/omnify-types';

describe('toPascalCase - Property Name Conversion', () => {
  it('converts snake_case to PascalCase', () => {
    expect(toPascalCase('plan_type')).toBe('PlanType');
    expect(toPascalCase('user_status')).toBe('UserStatus');
    expect(toPascalCase('subscription_request_status')).toBe('SubscriptionRequestStatus');
  });

  it('converts camelCase to PascalCase', () => {
    expect(toPascalCase('planType')).toBe('PlanType');
    expect(toPascalCase('userStatus')).toBe('UserStatus');
    expect(toPascalCase('subscriptionRequestStatus')).toBe('SubscriptionRequestStatus');
  });

  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('plan-type')).toBe('PlanType');
    expect(toPascalCase('user-status')).toBe('UserStatus');
  });

  it('handles single words', () => {
    expect(toPascalCase('status')).toBe('Status');
    expect(toPascalCase('type')).toBe('Type');
  });

  it('handles already PascalCase', () => {
    expect(toPascalCase('Status')).toBe('Status');
    expect(toPascalCase('PlanType')).toBe('PlanType');
  });

  it('handles mixed cases', () => {
    expect(toPascalCase('PLAN_TYPE')).toBe('PlanType');
    expect(toPascalCase('plan_TYPE')).toBe('PlanType');
  });
});

describe('Enum Member Name Conversion', () => {
  it('converts simple lowercase to PascalCase', () => {
    expect(toEnumMemberName('active')).toBe('Active');
    expect(toEnumMemberName('pending')).toBe('Pending');
  });

  it('converts snake_case to PascalCase', () => {
    expect(toEnumMemberName('in_progress')).toBe('InProgress');
    expect(toEnumMemberName('not_started')).toBe('NotStarted');
    expect(toEnumMemberName('waiting_for_approval')).toBe('WaitingForApproval');
  });

  it('converts kebab-case to PascalCase', () => {
    expect(toEnumMemberName('on-hold')).toBe('OnHold');
    expect(toEnumMemberName('in-review')).toBe('InReview');
  });

  it('converts UPPERCASE to PascalCase', () => {
    expect(toEnumMemberName('ACTIVE')).toBe('Active');
    expect(toEnumMemberName('IN_PROGRESS')).toBe('InProgress');
  });

  it('handles camelCase (capitalizes first letter)', () => {
    expect(toEnumMemberName('inProgress')).toBe('Inprogress');
    expect(toEnumMemberName('waitingForApproval')).toBe('Waitingforapproval');
  });

  it('handles numbers in values', () => {
    expect(toEnumMemberName('level1')).toBe('Level1');
    expect(toEnumMemberName('tier_2')).toBe('Tier2');
  });

  it('handles single character values', () => {
    expect(toEnumMemberName('a')).toBe('A');
    expect(toEnumMemberName('x')).toBe('X');
  });
});

describe('Schema to Enum Conversion', () => {
  it('converts basic enum schema with string values', () => {
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
    // String values should not have label or extra
    expect(result?.values[0].label).toBeUndefined();
    expect(result?.values[0].extra).toBeUndefined();
  });

  it('converts enum schema with object values (label + extra)', () => {
    const schema: LoadedSchema = {
      name: 'Status',
      kind: 'enum',
      filePath: '/test/status.yaml',
      relativePath: '/test/status.yaml',
      values: [
        'draft',
        { value: 'pending', label: 'Chờ duyệt', extra: { color: 'yellow' } },
        { value: 'published', label: 'Đã xuất bản', extra: { color: 'green' } },
      ] as any,
    };

    const result = schemaToEnum(schema);

    expect(result?.values[0]).toEqual({ name: 'Draft', value: 'draft' });
    expect(result?.values[1]).toEqual({
      name: 'Pending',
      value: 'pending',
      label: 'Chờ duyệt',
      extra: { color: 'yellow' },
    });
    expect(result?.values[2]).toEqual({
      name: 'Published',
      value: 'published',
      label: 'Đã xuất bản',
      extra: { color: 'green' },
    });
  });

  it('preserves original values', () => {
    const schema: LoadedSchema = {
      name: 'Priority',
      kind: 'enum',
      filePath: '/test/priority.yaml',
      relativePath: '/test/priority.yaml',
      values: ['low', 'medium', 'high'],
    };

    const result = schemaToEnum(schema);

    expect(result?.values[0].name).toBe('Low');
    expect(result?.values[0].value).toBe('low');
  });

  it('returns null for non-enum schema', () => {
    const schema: LoadedSchema = {
      name: 'User',
      kind: 'object',
      filePath: '/test/user.yaml',
      relativePath: '/test/user.yaml',
      properties: { name: { type: 'String' } },
    };

    const result = schemaToEnum(schema);
    expect(result).toBeNull();
  });

  it('includes displayName as comment', () => {
    const schema: LoadedSchema = {
      name: 'Status',
      kind: 'enum',
      filePath: '/test/status.yaml',
      relativePath: '/test/status.yaml',
      displayName: 'Order Status',
      values: ['active', 'inactive'],
    };

    const result = schemaToEnum(schema);
    expect(result?.comment).toBe('Order Status');
  });
});

describe('Enum Formatting with Helpers', () => {
  it('formats enum with Values array and type guard', () => {
    const result = formatEnum({
      name: 'Status',
      values: [
        { name: 'Active', value: 'active' },
        { name: 'Inactive', value: 'inactive' },
      ],
    });

    expect(result).toContain('export enum Status {');
    expect(result).toContain("Active = 'active',");
    expect(result).toContain("Inactive = 'inactive',");
    expect(result).toContain('export const StatusValues = Object.values(Status) as Status[];');
    expect(result).toContain('export function isStatus(value: unknown): value is Status {');
    expect(result).toContain('return StatusValues.includes(value as Status);');
  });

  it('generates getLabel that returns value when no labels defined', () => {
    const result = formatEnum({
      name: 'Status',
      values: [
        { name: 'Active', value: 'active' },
        { name: 'Inactive', value: 'inactive' },
      ],
    });

    expect(result).toContain('export function getStatusLabel(value: Status): string {');
    expect(result).toContain('return value;'); // fallback to value
  });

  it('generates getLabel with labels when defined', () => {
    const result = formatEnum({
      name: 'Status',
      values: [
        { name: 'Active', value: 'active', label: 'Đang hoạt động' },
        { name: 'Inactive', value: 'inactive' }, // no label
      ],
    });

    expect(result).toContain('const statusLabels: Partial<Record<Status, string>>');
    expect(result).toContain("[Status.Active]: 'Đang hoạt động',");
    expect(result).toContain('return statusLabels[value] ?? value;');
  });

  it('generates getExtra that returns undefined when no extra defined', () => {
    const result = formatEnum({
      name: 'Status',
      values: [
        { name: 'Active', value: 'active' },
        { name: 'Inactive', value: 'inactive' },
      ],
    });

    expect(result).toContain('export function getStatusExtra(_value: Status): Record<string, unknown> | undefined {');
    expect(result).toContain('return undefined;');
  });

  it('generates getExtra with extra when defined', () => {
    const result = formatEnum({
      name: 'Status',
      values: [
        { name: 'Active', value: 'active', extra: { color: 'green' } },
        { name: 'Inactive', value: 'inactive' }, // no extra
      ],
    });

    expect(result).toContain('const statusExtra: Partial<Record<Status, Record<string, unknown>>>');
    expect(result).toContain('[Status.Active]: {"color":"green"},');
    expect(result).toContain('return statusExtra[value];');
  });

  it('includes JSDoc comment when provided', () => {
    const result = formatEnum({
      name: 'Priority',
      values: [{ name: 'High', value: 'high' }],
      comment: 'Task priority levels',
    });

    expect(result).toContain('* Task priority levels');
  });
});

describe('Type Alias Formatting with Helpers', () => {
  it('formats type alias with Values array and helpers', () => {
    const result = formatTypeAlias({
      name: 'UserRole',
      type: "'admin' | 'user' | 'guest'",
      comment: 'User role options',
    });

    expect(result).toContain("export type UserRole = 'admin' | 'user' | 'guest';");
    expect(result).toContain("export const UserRoleValues: UserRole[] = ['admin', 'user', 'guest'];");
    expect(result).toContain('export function isUserRole(value: unknown): value is UserRole {');
    expect(result).toContain('export function getUserRoleLabel(value: UserRole): string {');
    expect(result).toContain('return value;'); // always fallback for type aliases
    expect(result).toContain('export function getUserRoleExtra(_value: UserRole): Record<string, unknown> | undefined {');
    expect(result).toContain('return undefined;'); // always undefined for type aliases
  });
});

describe('Enum Generation', () => {
  it('generates enums from schema collection', () => {
    const schemas: SchemaCollection = {
      Status: {
        name: 'Status',
        kind: 'enum',
        filePath: '/test/status.yaml',
        relativePath: '/test/status.yaml',
        values: ['active', 'inactive'],
      },
      Priority: {
        name: 'Priority',
        kind: 'enum',
        filePath: '/test/priority.yaml',
        relativePath: '/test/priority.yaml',
        values: ['low', 'medium', 'high'],
      },
      User: {
        name: 'User',
        kind: 'object',
        filePath: '/test/user.yaml',
        relativePath: '/test/user.yaml',
        properties: { name: { type: 'String' } },
      },
    };

    const result = generateEnums(schemas);

    // Should only include enum schemas
    expect(result).toHaveLength(2);
    expect(result.find(e => e.name === 'Status')).toBeDefined();
    expect(result.find(e => e.name === 'Priority')).toBeDefined();
  });

  it('skips object schemas', () => {
    const schemas: SchemaCollection = {
      User: {
        name: 'User',
        kind: 'object',
        filePath: '/test/user.yaml',
        relativePath: '/test/user.yaml',
        properties: { name: { type: 'String' } },
      },
    };

    const result = generateEnums(schemas);
    expect(result).toHaveLength(0);
  });

  it('handles empty schema collection', () => {
    const result = generateEnums({});
    expect(result).toHaveLength(0);
  });
});

describe('extractInlineEnums - Inline Enum Extraction', () => {
  it('extracts inline enum from property with snake_case name', () => {
    const schemas: SchemaCollection = {
      Plan: {
        name: 'Plan',
        kind: 'object',
        filePath: '/test/plan.yaml',
        relativePath: '/test/plan.yaml',
        properties: {
          plan_type: {
            type: 'Enum',
            enum: ['service', 'bundle'],
          },
        },
      },
    };

    const result = extractInlineEnums(schemas);
    expect(result).toHaveLength(1);
    expect(result[0].typeAlias?.name).toBe('PlanPlanType'); // Schema name + PascalCase prop
  });

  it('extracts multiple inline enums with correct naming', () => {
    const schemas: SchemaCollection = {
      Subscription: {
        name: 'Subscription',
        kind: 'object',
        filePath: '/test/subscription.yaml',
        relativePath: '/test/subscription.yaml',
        properties: {
          status: {
            type: 'Enum',
            enum: ['active', 'suspended', 'cancelled', 'expired'],
          },
          billing_cycle: {
            type: 'Enum',
            enum: ['monthly', 'yearly'],
          },
        },
      },
    };

    const result = extractInlineEnums(schemas);
    expect(result).toHaveLength(2);
    
    const statusEnum = result.find(e => e.typeAlias?.name === 'SubscriptionStatus');
    const billingEnum = result.find(e => e.typeAlias?.name === 'SubscriptionBillingCycle');
    
    expect(statusEnum).toBeDefined();
    expect(billingEnum).toBeDefined();
  });

  it('generates full enum with i18n labels when labels are provided', () => {
    const schemas: SchemaCollection = {
      Task: {
        name: 'Task',
        kind: 'object',
        filePath: '/test/task.yaml',
        relativePath: '/test/task.yaml',
        properties: {
          task_status: {
            type: 'Enum',
            enum: [
              { value: 'pending', label: { ja: '保留', en: 'Pending' } },
              { value: 'done', label: { ja: '完了', en: 'Done' } },
            ],
          },
        },
      },
    };

    const result = extractInlineEnums(schemas);
    expect(result).toHaveLength(1);
    expect(result[0].enum?.name).toBe('TaskTaskStatus');
    expect(result[0].typeAlias).toBeUndefined();
  });

  it('extracts Select options as inline enums', () => {
    const schemas: SchemaCollection = {
      Product: {
        name: 'Product',
        kind: 'object',
        filePath: '/test/product.yaml',
        relativePath: '/test/product.yaml',
        properties: {
          size_option: {
            type: 'Select',
            options: ['small', 'medium', 'large'],
          } as any,
        },
      },
    };

    const result = extractInlineEnums(schemas);
    expect(result).toHaveLength(1);
    expect(result[0].typeAlias?.name).toBe('ProductSizeOption');
  });

  it('skips enum schemas (only extracts from object properties)', () => {
    const schemas: SchemaCollection = {
      Status: {
        name: 'Status',
        kind: 'enum',
        filePath: '/test/status.yaml',
        relativePath: '/test/status.yaml',
        values: ['active', 'inactive'],
      },
    };

    const result = extractInlineEnums(schemas);
    expect(result).toHaveLength(0);
  });

  it('skips properties referencing named enums', () => {
    const schemas: SchemaCollection = {
      User: {
        name: 'User',
        kind: 'object',
        filePath: '/test/user.yaml',
        relativePath: '/test/user.yaml',
        properties: {
          status: {
            type: 'Enum',
            enum: 'UserStatus', // Reference to named enum, not inline array
          } as any,
        },
      },
    };

    const result = extractInlineEnums(schemas);
    expect(result).toHaveLength(0);
  });
});

describe('Edge Cases', () => {
  it('handles enum with single value', () => {
    const schema: LoadedSchema = {
      name: 'SingleValue',
      kind: 'enum',
      filePath: '/test/single.yaml',
      relativePath: '/test/single.yaml',
      values: ['only'],
    };

    const result = schemaToEnum(schema);
    expect(result?.values).toHaveLength(1);
  });

  it('handles enum with numeric-like values', () => {
    const result = formatEnum({
      name: 'Level',
      values: [
        { name: 'Level1', value: 'level1' },
        { name: 'Level2', value: 'level2' },
        { name: 'Level10', value: 'level10' },
      ],
    });

    expect(result).toContain("Level1 = 'level1',");
    expect(result).toContain("Level10 = 'level10',");
  });

  it('handles enum with uppercase values', () => {
    const schema: LoadedSchema = {
      name: 'HttpMethod',
      kind: 'enum',
      filePath: '/test/http.yaml',
      relativePath: '/test/http.yaml',
      values: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    };

    const result = schemaToEnum(schema);

    expect(result?.values[0].name).toBe('Get');
    expect(result?.values[0].value).toBe('GET');
  });

  it('handles mixed label and extra - some values have, some dont', () => {
    const result = formatEnum({
      name: 'Status',
      values: [
        { name: 'Draft', value: 'draft' }, // no label, no extra
        { name: 'Pending', value: 'pending', label: 'Chờ duyệt' }, // label only
        { name: 'Published', value: 'published', label: 'Đã xuất bản', extra: { color: 'green' } }, // both
      ],
    });

    // Labels should be generated (has at least one)
    expect(result).toContain('statusLabels');
    expect(result).toContain("[Status.Pending]: 'Chờ duyệt',");
    expect(result).toContain("[Status.Published]: 'Đã xuất bản',");
    // Draft not in labels -> fallback to value

    // Extra should be generated (has at least one)
    expect(result).toContain('statusExtra');
    expect(result).toContain('[Status.Published]: {"color":"green"},');
    // Only Published has extra
  });
});
