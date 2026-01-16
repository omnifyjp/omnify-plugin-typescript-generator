/**
 * AI Guides Generator for TypeScript/Frontend
 *
 * TypeScript/Reactプロジェクト用のAIガイド生成
 * @famgia/omnify-coreの統一ジェネレーターを使用
 */

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    generateAIGuides as coreGenerateAIGuides,
} from '@famgia/omnify-core';

/**
 * Options for AI guides generation
 */
export interface AIGuidesOptions {
    /**
     * TypeScript output path from config (e.g., 'resources/ts/omnify')
     * Used to extract the base path for glob replacement
     */
    typescriptPath?: string;

    /**
     * Base path for TypeScript files (default: extracted from typescriptPath or 'src')
     * Used for placeholder replacement in Cursor rules
     */
    typescriptBasePath?: string;
}

/**
 * Result of AI guides generation
 */
export interface AIGuidesResult {
    claudeGuides: number;
    claudeChecklists: number;
    cursorRules: number;
    files: string[];
}

/**
 * Extract TypeScript base path from typescriptPath
 * e.g., 'resources/ts/omnify' -> 'resources/ts'
 * e.g., 'src/generated' -> 'src'
 */
function extractTypescriptBasePath(typescriptPath?: string): string {
    if (!typescriptPath) return 'src';

    const normalized = typescriptPath.replace(/\\/g, '/');

    // Remove last segment (omnify, generated, etc.)
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length > 1) {
        return parts.slice(0, -1).join('/');
    }

    return 'src';
}

/**
 * Generate AI guides for Claude and Cursor
 */
export function generateAIGuides(
    rootDir: string,
    options: AIGuidesOptions = {}
): AIGuidesResult {
    const basePath = options.typescriptBasePath || extractTypescriptBasePath(options.typescriptPath);

    // Coreジェネレーターを呼び出し
    const coreResult = coreGenerateAIGuides(rootDir, {
        placeholders: {
            TYPESCRIPT_BASE: basePath,
            LARAVEL_BASE: 'app',
            LARAVEL_ROOT: '',
        },
        // TypeScriptプロジェクトではReact関連のみ
        adapters: ['cursor', 'claude'],
    });

    // 結果を変換 (後方互換性のため)
    const result: AIGuidesResult = {
        claudeGuides: 0,
        claudeChecklists: 0,
        cursorRules: 0,
        files: coreResult.files,
    };

    // ファイル数をカウント
    const claudeCount = coreResult.counts['claude'] || 0;
    const cursorCount = coreResult.counts['cursor'] || 0;

    result.claudeGuides = Math.floor(claudeCount * 0.8);
    result.claudeChecklists = claudeCount - result.claudeGuides;
    result.cursorRules = cursorCount;

    return result;
}

/**
 * Check if AI guides need to be generated
 */
export function shouldGenerateAIGuides(rootDir: string): boolean {
    const claudeDir = resolve(rootDir, '.claude/omnify/guides/react');
    const cursorDir = resolve(rootDir, '.cursor/rules/omnify');

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
