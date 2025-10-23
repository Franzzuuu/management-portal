// src/tests/file-integrity.test.js
import { describe, it, expect } from '@jest/globals';
import { FileIntegrityValidator } from '../lib/file-integrity.js';

describe('File Integrity Validator', () => {
    describe('CSV Validation', () => {
        it('should validate correct CSV format', () => {
            const csvContent = `# RFID Vehicle Management System Export
# Report: users
# Generated: 2024-01-01T00:00:00.000Z
#
id,name,email
1,"John Doe",john@example.com
2,"Jane Smith",jane@example.com`;

            const buffer = Buffer.from(csvContent, 'utf-8');
            const result = FileIntegrityValidator.validateCSV(buffer);

            expect(result.valid).toBe(true);
            expect(result.metadata.rows).toBe(2);
            expect(result.metadata.columns).toBe(3);
            expect(result.metadata.hasMetadata).toBe(true);
        });

        it('should detect missing metadata', () => {
            const csvContent = `id,name,email
1,"John Doe",john@example.com`;

            const buffer = Buffer.from(csvContent, 'utf-8');
            const result = FileIntegrityValidator.validateCSV(buffer);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Missing CSV metadata header');
        });

        it('should detect inconsistent column count', () => {
            const csvContent = `# Test CSV
#
id,name,email
1,"John Doe",john@example.com
2,"Jane Smith"`;

            const buffer = Buffer.from(csvContent, 'utf-8');
            const result = FileIntegrityValidator.validateCSV(buffer);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Inconsistent column count');
        });

        it('should handle empty CSV', () => {
            const buffer = Buffer.from('', 'utf-8');
            const result = FileIntegrityValidator.validateCSV(buffer);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Empty CSV file');
        });
    });

    describe('XLSX Validation', () => {
        it('should detect invalid XLSX signature', async () => {
            const buffer = Buffer.from('This is not an XLSX file', 'utf-8');
            const result = await FileIntegrityValidator.validateXLSX(buffer);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid XLSX file signature');
        });

        it('should detect file too small', async () => {
            const buffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // Valid signature but too small
            const result = await FileIntegrityValidator.validateXLSX(buffer);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('too small to be valid');
        });

        it('should detect file too large', async () => {
            const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
            largeBuffer[0] = 0x50;
            largeBuffer[1] = 0x4B;
            largeBuffer[2] = 0x03;
            largeBuffer[3] = 0x04;

            const result = await FileIntegrityValidator.validateXLSX(largeBuffer);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('too large');
        });
    });

    describe('PDF Validation', () => {
        it('should validate correct PDF signature', () => {
            const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF';
            const buffer = Buffer.from(pdfContent, 'utf-8');
            const result = FileIntegrityValidator.validatePDF(buffer);

            expect(result.valid).toBe(true);
            expect(result.metadata.version).toBe('1.4');
        });

        it('should detect invalid PDF signature', () => {
            const buffer = Buffer.from('This is not a PDF', 'utf-8');
            const result = FileIntegrityValidator.validatePDF(buffer);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid PDF file signature');
        });

        it('should detect missing EOF marker', () => {
            const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj';
            const buffer = Buffer.from(pdfContent, 'utf-8');
            const result = FileIntegrityValidator.validatePDF(buffer);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Missing PDF EOF marker');
        });
    });

    describe('Hash Calculation', () => {
        it('should calculate consistent hash', () => {
            const buffer = Buffer.from('test content', 'utf-8');
            const hash1 = FileIntegrityValidator.calculateHash(buffer);
            const hash2 = FileIntegrityValidator.calculateHash(buffer);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA-256 hex length
        });

        it('should produce different hashes for different content', () => {
            const buffer1 = Buffer.from('content 1', 'utf-8');
            const buffer2 = Buffer.from('content 2', 'utf-8');

            const hash1 = FileIntegrityValidator.calculateHash(buffer1);
            const hash2 = FileIntegrityValidator.calculateHash(buffer2);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('Comprehensive Validation', () => {
        it('should validate CSV file completely', async () => {
            const csvContent = `# Test Export
#
id,name
1,"Test User"`;
            const buffer = Buffer.from(csvContent, 'utf-8');

            const result = await FileIntegrityValidator.validateExportFile(
                buffer,
                'csv',
                { expectedRows: 1 }
            );

            expect(result.valid).toBe(true);
            expect(result.hash).toBeTruthy();
            expect(result.fileSize).toBe(buffer.length);
            expect(result.format).toBe('csv');
        });

        it('should detect row count mismatch', async () => {
            const csvContent = `# Test Export
#
id,name
1,"Test User"
2,"Another User"`;
            const buffer = Buffer.from(csvContent, 'utf-8');

            const result = await FileIntegrityValidator.validateExportFile(
                buffer,
                'csv',
                { expectedRows: 1 }
            );

            expect(result.valid).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings[0]).toContain('Row count mismatch');
        });
    });

    describe('Integrity Report', () => {
        it('should create proper integrity report', () => {
            const validationResult = {
                valid: true,
                hash: 'test-hash',
                fileSize: 1024,
                format: 'csv',
                timestamp: '2024-01-01T00:00:00.000Z',
                metadata: { rows: 10, columns: 3 }
            };

            const report = FileIntegrityValidator.createIntegrityReport(
                validationResult,
                { jobId: 'test-job-id' }
            );

            expect(report.job_id).toBe('test-job-id');
            expect(report.file_hash).toBe('test-hash');
            expect(report.validation_status).toBe('passed');
            expect(report.metadata).toEqual({ rows: 10, columns: 3 });
        });

        it('should create report for failed validation', () => {
            const validationResult = {
                valid: false,
                error: 'Test error',
                hash: 'test-hash',
                fileSize: 0,
                format: 'csv',
                timestamp: '2024-01-01T00:00:00.000Z'
            };

            const report = FileIntegrityValidator.createIntegrityReport(validationResult);

            expect(report.validation_status).toBe('failed');
            expect(report.validation_errors).toContain('Test error');
        });
    });
});