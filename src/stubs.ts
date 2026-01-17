/**
 * Stubs management for TypeScript generator
 *
 * Currently a placeholder - React utility stubs feature is not yet implemented.
 */

export interface CopyStubsOptions {
    targetDir: string;
    skipIfExists?: boolean;
}

export interface CopyStubsResult {
    copied: string[];
    skipped: string[];
}

/**
 * Copy React utility stubs to target directory.
 *
 * Currently returns empty result as React utility stubs feature
 * is not yet implemented. The AI guides are handled separately
 * via generateAIGuides().
 */
export function copyStubs(_options: CopyStubsOptions): CopyStubsResult {
    // React utility stubs feature not yet implemented
    // AI guides are handled via generateAIGuides()
    return {
        copied: [],
        skipped: [],
    };
}
