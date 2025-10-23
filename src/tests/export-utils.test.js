// src/tests/export-utils.test.js
import { describe, it, expect, beforeEach } from '@jest/globals';
import { DateUtils, AnonymizationUtils, FileUtils, ExportJobUtils } from '../lib/export-utils.js';

describe('Export Utils', () => {
    describe('DateUtils', () => {
        it('should convert to Manila time correctly', () => {
            const date = new Date('2024-01-01T12:00:00Z');
            const manilaTime = DateUtils.toManilaTime(date);
            expect(manilaTime).toMatch(/2024/);
            expect(manilaTime).toBeTruthy();
        });

        it('should make end date inclusive', () => {
            const dateStr = '2024-01-01';
            const inclusiveDate = DateUtils.makeEndDateInclusive(dateStr);
            expect(inclusiveDate).toContain('23:59:59');
        });

        it('should generate date range string correctly', () => {
            const start = '2024-01-01';
            const end = '2024-01-31';
            const range = DateUtils.getDateRangeString(start, end);
            expect(range).toBe('20240101_to_20240131');
        });

        it('should handle single dates', () => {
            const start = '2024-01-01';
            const range = DateUtils.getDateRangeString(start, null);
            expect(range).toBe('from_20240101');
        });

        it('should handle all-time range', () => {
            const range = DateUtils.getDateRangeString(null, null);
            expect(range).toBe('all-time');
        });
    });

    describe('AnonymizationUtils', () => {
        it('should generate consistent hash for same string', () => {
            const str = 'test@example.com';
            const hash1 = AnonymizationUtils.hashString(str);
            const hash2 = AnonymizationUtils.hashString(str);
            expect(hash1).toBe(hash2);
        });

        it('should anonymize names correctly', () => {
            const name = 'John Doe';
            const anonymized = AnonymizationUtils.anonymize(name, 'name', 'full_name');
            expect(anonymized).toMatch(/^User_\d+$/);
        });

        it('should anonymize emails correctly', () => {
            const email = 'john.doe@example.com';
            const anonymized = AnonymizationUtils.anonymize(email, 'email', 'email');
            expect(anonymized).toMatch(/^user\d+@example\.com$/);
        });

        it('should anonymize plate numbers correctly', () => {
            const plate = 'ABC123';
            const anonymized = AnonymizationUtils.anonymize(plate, 'plate', 'plate_number');
            expect(anonymized).toMatch(/^\*\*\*\d+$/);
        });

        it('should not anonymize non-PII fields', () => {
            const designation = 'Student';
            const anonymized = AnonymizationUtils.anonymize(designation, 'default', 'designation');
            expect(anonymized).toBe(designation);
        });
    });

    describe('FileUtils', () => {
        it('should generate filename with proper format', () => {
            const filename = FileUtils.generateFileName(
                'users',
                'csv',
                '2024-01-01',
                '2024-01-31',
                'John Doe',
                false
            );

            expect(filename).toMatch(/^users-\d{8}_\d{6}_Manila-20240101_to_20240131-user\d{4}\.csv$/);
        });

        it('should add anonymization suffix when anonymized', () => {
            const filename = FileUtils.generateFileName(
                'users',
                'csv',
                '2024-01-01',
                '2024-01-31',
                'John Doe',
                true
            );

            expect(filename).toContain('_anon');
        });

        it('should generate CSV metadata correctly', () => {
            const metadata = FileUtils.generateCSVMetadata(
                'users',
                'John Doe',
                { startDate: '2024-01-01' },
                ['id', 'name', 'email'],
                'view',
                { by: 'id', dir: 'asc' },
                100,
                false
            );

            expect(metadata).toContain('# RFID Vehicle Management System Export');
            expect(metadata).toContain('# Report: users');
            expect(metadata).toContain('# Row Count: 100');
            expect(metadata).toContain('# Anonymized: false');
        });
    });

    describe('ExportJobUtils', () => {
        it('should create job with correct default values', () => {
            const job = ExportJobUtils.createJob('users', 'csv');

            expect(job).toHaveProperty('id');
            expect(job.report_type).toBe('users');
            expect(job.format).toBe('csv');
            expect(job.status).toBe('queued');
            expect(job.mode).toBe('view');
            expect(job.sort_by).toBe('id');
            expect(job.sort_dir).toBe('desc');
        });

        it('should create job with custom options', () => {
            const options = {
                filters: { startDate: '2024-01-01' },
                columns: ['id', 'name'],
                mode: 'full',
                sortBy: 'name',
                sortDir: 'asc',
                anonymize: true
            };

            const job = ExportJobUtils.createJob('users', 'xlsx', options);

            expect(job.filters).toEqual(options.filters);
            expect(job.columns).toEqual(options.columns);
            expect(job.mode).toBe('full');
            expect(job.sort_by).toBe('name');
            expect(job.sort_dir).toBe('asc');
            expect(job.anonymize).toBe(true);
        });

        it('should estimate processing time correctly', () => {
            const csvTime = ExportJobUtils.estimateProcessingTime(1000, 'csv');
            const xlsxTime = ExportJobUtils.estimateProcessingTime(1000, 'xlsx');
            const pdfTime = ExportJobUtils.estimateProcessingTime(1000, 'pdf');

            expect(csvTime).toBeLessThan(xlsxTime);
            expect(xlsxTime).toBeLessThan(pdfTime);
            expect(csvTime).toBeGreaterThan(1000); // Base time + processing time
        });

        it('should cap processing time at maximum', () => {
            const largeDatasetTime = ExportJobUtils.estimateProcessingTime(1000000, 'pdf');
            expect(largeDatasetTime).toBeLessThanOrEqual(300000); // 5 minutes max
        });
    });
});