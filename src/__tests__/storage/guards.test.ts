/**
 * Guard Tests
 * Tests the import guard scanner functionality
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Storage Import Guards', () => {
  describe('Scanner Script Exists', () => {
    it('should have check-storage-imports.ts script', () => {
      const scannerPath = join(process.cwd(), 'scripts', 'check-storage-imports.ts');
      expect(existsSync(scannerPath)).toBe(true);
    });

    it('should have correct vendor packages list', () => {
      const scannerPath = join(process.cwd(), 'scripts', 'check-storage-imports.ts');
      const content = readFileSync(scannerPath, 'utf-8');
      
      // Check for vendor packages
      expect(content).toContain('@supabase');
      expect(content).toContain('@aws-sdk');
      expect(content).toContain('@google-cloud');
      expect(content).toContain('@azure');
      expect(content).toContain('firebase');
    });

    it('should have correct allowed directories', () => {
      const scannerPath = join(process.cwd(), 'scripts', 'check-storage-imports.ts');
      const content = readFileSync(scannerPath, 'utf-8');
      
      expect(content).toContain('src/lib/storage/providers');
      expect(content).toContain('node_modules');
      expect(content).toContain('.next');
    });
  });

  describe('Guard Rules Documentation', () => {
    it('should have storage guard rules', () => {
      const rulesPath = join(process.cwd(), '.cursor', 'rules', '30-storage-interface-guard.md');
      expect(existsSync(rulesPath)).toBe(true);
    });

    it('should include vendor isolation rules', () => {
      const rulesPath = join(process.cwd(), '.cursor', 'rules', '30-storage-interface-guard.md');
      const content = readFileSync(rulesPath, 'utf-8');
      
      expect(content).toContain('NEVER import');
      expect(content).toContain('@supabase');
      expect(content).toContain('src/lib/storage/providers');
      expect(content).toContain('getStorageProvider()');
    });

    it('should include security rules', () => {
      const rulesPath = join(process.cwd(), '.cursor', 'rules', '30-storage-interface-guard.md');
      const content = readFileSync(rulesPath, 'utf-8');
      
      expect(content).toContain('Credential Protection');
      expect(content).toContain('NEVER log storage URLs');
      expect(content).toContain('NEVER log bucket names');
      expect(content).toContain('Problem+JSON');
    });

    it('should include correct examples', () => {
      const rulesPath = join(process.cwd(), '.cursor', 'rules', '30-storage-interface-guard.md');
      const content = readFileSync(rulesPath, 'utf-8');
      
      expect(content).toContain('CORRECT - Using the Abstraction');
      expect(content).toContain('WRONG - Direct Vendor Import');
      expect(content).toContain('createSignedUploadUrl');
      expect(content).toContain('getSignedReadUrl');
    });
  });

  describe('Package.json Scripts', () => {
    it('should have ci:storage-imports script', () => {
      const packagePath = join(process.cwd(), 'package.json');
      const content = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      expect(content.scripts).toHaveProperty('ci:storage-imports');
      expect(content.scripts['ci:storage-imports']).toContain('check-storage-imports.ts');
    });

    it('should include storage imports in ci:all script', () => {
      const packagePath = join(process.cwd(), 'package.json');
      const content = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      expect(content.scripts['ci:all']).toContain('ci:storage-imports');
    });
  });

  describe('Storage Provider Implementation', () => {
    it('should have storage abstraction files', () => {
      const typesPath = join(process.cwd(), 'src', 'lib', 'storage', 'types.ts');
      const indexPath = join(process.cwd(), 'src', 'lib', 'storage', 'index.ts');
      
      expect(existsSync(typesPath)).toBe(true);
      expect(existsSync(indexPath)).toBe(true);
    });

    it('should have Supabase provider in correct directory', () => {
      const providerPath = join(process.cwd(), 'src', 'lib', 'storage', 'providers', 'supabase.ts');
      expect(existsSync(providerPath)).toBe(true);
    });

    it('should export StorageProvider interface', () => {
      const typesPath = join(process.cwd(), 'src', 'lib', 'storage', 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      
      expect(content).toContain('export interface StorageProvider');
      expect(content).toContain('createSignedUploadUrl');
      expect(content).toContain('getSignedReadUrl');
      expect(content).toContain('headObject');
    });

    it('should export getStorageProvider factory', () => {
      const indexPath = join(process.cwd(), 'src', 'lib', 'storage', 'index.ts');
      const content = readFileSync(indexPath, 'utf-8');
      
      expect(content).toContain('export function getStorageProvider');
    });
  });

  describe('Pattern Validation', () => {
    it('should not have vendor imports outside providers directory', () => {
      // Check main storage files don't import vendors directly
      const indexPath = join(process.cwd(), 'src', 'lib', 'storage', 'index.ts');
      const typesPath = join(process.cwd(), 'src', 'lib', 'storage', 'types.ts');
      
      const indexContent = readFileSync(indexPath, 'utf-8');
      const typesContent = readFileSync(typesPath, 'utf-8');
      
      // These files should not import vendor SDKs
      expect(indexContent).not.toMatch(/@supabase|@aws-sdk|@google-cloud|@azure/);
      expect(typesContent).not.toMatch(/@supabase|@aws-sdk|@google-cloud|@azure/);
    });

    it('should have vendor imports only in providers', () => {
      const providerPath = join(process.cwd(), 'src', 'lib', 'storage', 'providers', 'supabase.ts');
      const content = readFileSync(providerPath, 'utf-8');
      
      // Provider should import from Supabase
      expect(content).toContain('@supabase');
    });

    it('should implement required interfaces', () => {
      const providerPath = join(process.cwd(), 'src', 'lib', 'storage', 'providers', 'supabase.ts');
      const content = readFileSync(providerPath, 'utf-8');
      
      expect(content).toContain('implements');
      expect(content).toContain('StorageProvider');
      expect(content).toContain('createSignedUploadUrl');
      expect(content).toContain('getSignedReadUrl');
      expect(content).toContain('headObject');
    });

    it('should use AppError for error handling', () => {
      const providerPath = join(process.cwd(), 'src', 'lib', 'storage', 'providers', 'supabase.ts');
      const content = readFileSync(providerPath, 'utf-8');
      
      expect(content).toContain('AppError');
      expect(content).toContain('ErrorCode');
    });
  });

  describe('Test Coverage', () => {
    it('should have provider tests', () => {
      const providerTestPath = join(process.cwd(), 'src', '__tests__', 'storage', 'provider.test.ts');
      expect(existsSync(providerTestPath)).toBe(true);
    });

    it('should have signed read tests', () => {
      const signedReadTestPath = join(process.cwd(), 'src', '__tests__', 'storage', 'signed-read.test.ts');
      expect(existsSync(signedReadTestPath)).toBe(true);
    });

    it('should have resumable upload tests', () => {
      const resumableTestPath = join(process.cwd(), 'src', '__tests__', 'storage', 'resumable-upload.test.ts');
      expect(existsSync(resumableTestPath)).toBe(true);
    });

    it('should use fake providers for testing', () => {
      const providerTestPath = join(process.cwd(), 'src', '__tests__', 'storage', 'provider.test.ts');
      const content = readFileSync(providerTestPath, 'utf-8');
      
      expect(content).toContain('FakeStorageProvider');
      expect(content).not.toContain('@supabase/supabase-js');
    });
  });
});