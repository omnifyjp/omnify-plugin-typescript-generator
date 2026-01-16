/**
 * Tests for stub file utilities
 * 
 * NOTE: Stub files are no longer generated. All React utilities
 * should be imported from @famgia/omnify-react package.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { copyStubs, getStubPaths, STUB_FILES } from './stubs';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('STUB_FILES', () => {
  it('should be empty (all utilities moved to @famgia/omnify-react)', () => {
    expect(STUB_FILES).toEqual([]);
    expect(STUB_FILES.length).toBe(0);
  });
});

describe('getStubPaths', () => {
  it('should return empty array', () => {
    expect(getStubPaths()).toEqual([]);
  });
});

describe('copyStubs', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omnify-stubs-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should not copy any files (STUB_FILES is empty)', () => {
    const result = copyStubs({
      targetDir: tempDir,
      skipIfExists: false,
    });

    expect(result.copied).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it('should not create any directories', () => {
    copyStubs({
      targetDir: tempDir,
      skipIfExists: false,
    });

    // Only the temp dir should exist, no subdirectories
    const contents = fs.readdirSync(tempDir);
    expect(contents).toEqual([]);
  });

  it('should work with skipIfExists option', () => {
    const result = copyStubs({
      targetDir: tempDir,
      skipIfExists: true,
    });

    expect(result.copied).toEqual([]);
    expect(result.skipped).toEqual([]);
  });
});
