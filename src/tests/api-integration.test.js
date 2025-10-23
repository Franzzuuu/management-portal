// src/tests/api-integration.test.js
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock Next.js environment
global.process.env.NODE_ENV = 'test';

// Mock database functions
const mockQueryOne = jest.fn();
const mockQueryMany = jest.fn();
const mockExecuteQuery = jest.fn();

jest.mock('../lib/database', () => ({
    queryOne: mockQueryOne,
    queryMany: mockQueryMany,
    executeQuery: mockExecuteQuery
}));

// Mock session utility
const mockGetSession = jest.fn();
jest.mock('../lib/utils', () => ({
    getSession: mockGetSession
}));

describe('Reports API Integration', () => {
    beforeAll(() => {
        // Setup default session mock
        mockGetSession.mockResolvedValue({
            userId: 'test-user-id',
            userRole: 'Admin'
        });
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/reports', () => {
        it('should return cached data when available', async () => {
            // Mock database responses
            mockQueryOne
                .mockResolvedValueOnce({ count: 100 }) // total users
                .mockResolvedValueOnce({ count: 50 })  // students
                .mockResolvedValueOnce({ count: 30 })  // faculty
                .mockResolvedValueOnce({ count: 20 })  // staff
                .mockResolvedValueOnce({ count: 5 })   // new users
                .mockResolvedValueOnce({ count: 75 })  // total vehicles
                .mockResolvedValueOnce({ count: 60 })  // approved vehicles
                .mockResolvedValueOnce({ count: 40 })  // 2-wheel
                .mockResolvedValueOnce({ count: 35 })  // 4-wheel
                .mockResolvedValueOnce({ count: 200 }) // total access logs
                .mockResolvedValueOnce({ count: 150 }) // access logs in range
                .mockResolvedValueOnce({ count: 25 })  // total violations
                .mockResolvedValueOnce({ count: 5 });  // pending violations

            mockQueryMany.mockResolvedValueOnce([
                {
                    timestamp: '2024-01-01T10:00:00Z',
                    entry_type: 'entry',
                    plate_number: 'ABC123',
                    user_name: 'John Doe'
                }
            ]);

            // Import the route handler
            const { GET } = await import('../app/api/reports/route.js');

            // Create a mock request
            const request = new Request('http://localhost:3000/api/reports?page=1&limit=20');

            // Call the handler
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.reportData).toBeDefined();
            expect(data.reportData.userStats.total).toBe(100);
            expect(data.reportData.vehicleStats.total).toBe(75);
        });

        it('should return 401 for unauthorized users', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const { GET } = await import('../app/api/reports/route.js');
            const request = new Request('http://localhost:3000/api/reports');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return 401 for non-admin users', async () => {
            mockGetSession.mockResolvedValueOnce({
                userId: 'test-user',
                userRole: 'Student'
            });

            const { GET } = await import('../app/api/reports/route.js');
            const request = new Request('http://localhost:3000/api/reports');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });
    });

    describe('POST /api/reports/export/job', () => {
        beforeAll(() => {
            // Reset session mock to admin user
            mockGetSession.mockResolvedValue({
                userId: 'test-user-id',
                userRole: 'Admin'
            });
        });

        it('should create export job successfully', async () => {
            // Mock active jobs check
            mockQueryOne.mockResolvedValueOnce({ count: 0 });

            // Mock job creation
            mockExecuteQuery
                .mockResolvedValueOnce(undefined) // INSERT into export_jobs
                .mockResolvedValueOnce(undefined); // INSERT into audit_log

            const { POST } = await import('../app/api/reports/export/job/route.js');

            const requestBody = {
                report: 'users',
                format: 'csv',
                mode: 'view',
                sortBy: 'id',
                sortDir: 'desc'
            };

            const request = new Request('http://localhost:3000/api/reports/export/job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.jobId).toBeTruthy();
            expect(data.message).toBe('Export job created successfully');
        });

        it('should enforce rate limiting', async () => {
            // Mock active jobs at limit
            mockQueryOne.mockResolvedValueOnce({ count: 3 });

            const { POST } = await import('../app/api/reports/export/job/route.js');

            const requestBody = {
                report: 'users',
                format: 'csv'
            };

            const request = new Request('http://localhost:3000/api/reports/export/job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(429);
            expect(data.error).toContain('Maximum number of active export jobs reached');
        });

        it('should validate required fields', async () => {
            const { POST } = await import('../app/api/reports/export/job/route.js');

            const requestBody = {
                format: 'csv' // Missing 'report' field
            };

            const request = new Request('http://localhost:3000/api/reports/export/job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Missing required fields');
        });

        it('should validate enum values', async () => {
            const { POST } = await import('../app/api/reports/export/job/route.js');

            const requestBody = {
                report: 'invalid-report',
                format: 'csv'
            };

            const request = new Request('http://localhost:3000/api/reports/export/job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Invalid report type');
        });
    });

    describe('POST /api/reports/export/cancel', () => {
        it('should cancel job successfully', async () => {
            // Mock job lookup
            mockQueryOne.mockResolvedValueOnce({
                id: 'test-job-id',
                status: 'queued',
                user_id: 'test-user-id'
            });

            // Mock job update and audit log
            mockExecuteQuery
                .mockResolvedValueOnce(undefined) // UPDATE export_jobs
                .mockResolvedValueOnce(undefined); // INSERT audit_log

            const { POST } = await import('../app/api/reports/export/cancel/route.js');

            const requestBody = { jobId: 'test-job-id' };

            const request = new Request('http://localhost:3000/api/reports/export/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Export job cancelled successfully');
        });

        it('should prevent canceling completed jobs', async () => {
            mockQueryOne.mockResolvedValueOnce({
                id: 'test-job-id',
                status: 'done',
                user_id: 'test-user-id'
            });

            const { POST } = await import('../app/api/reports/export/cancel/route.js');

            const requestBody = { jobId: 'test-job-id' };

            const request = new Request('http://localhost:3000/api/reports/export/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Cannot cancel job with status: done');
        });
    });

    describe('GET /api/admin/cache', () => {
        it('should return cache statistics', async () => {
            const { GET } = await import('../app/api/admin/cache/route.js');

            const request = new Request('http://localhost:3000/api/admin/cache');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.cache.stats).toBeDefined();
            expect(data.cache.status).toBe('active');
            expect(data.cache.type).toBe('memory');
        });
    });
});