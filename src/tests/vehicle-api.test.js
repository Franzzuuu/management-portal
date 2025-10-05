import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST as createVehicleHandler } from '../app/api/vehicles/create/route';
import { PUT as updateVehicleHandler } from '../app/api/vehicles/update/route';
import { executeQuery } from '../lib/database';
import { getSession } from '../lib/utils';

// Mock the dependencies
vi.mock('../lib/database', () => ({
    executeQuery: vi.fn(),
}));

vi.mock('../lib/utils', () => ({
    getSession: vi.fn(),
}));

// Mock Response.json
global.Response = {
    json: vi.fn((data, options) => ({
        data,
        options,
    })),
};

describe('Vehicle API Tests', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        // Mock admin session by default
        getSession.mockResolvedValue({
            userId: '1',
            userRole: 'Admin',
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Create Vehicle API', () => {
        it('should require year field for new vehicles', async () => {
            // Prepare mock request
            const request = {
                json: vi.fn().mockResolvedValue({
                    userId: '1',
                    vehicleType: '4-wheel',
                    make: 'Toyota',
                    model: 'Corolla',
                    // year is missing
                    color: 'Black',
                    plateNumber: 'ABC-123',
                    registrationDate: '2023-10-05',
                }),
            };

            // Execute the handler
            const result = await createVehicleHandler(request);

            // Verify the response
            expect(result.data.error).toContain('Missing required fields');
            expect(result.options.status).toBe(400);
        });

        it('should validate year range (1900 to currentYear+1)', async () => {
            // Prepare mock request with invalid year
            const request = {
                json: vi.fn().mockResolvedValue({
                    userId: '1',
                    vehicleType: '4-wheel',
                    make: 'Toyota',
                    model: 'Corolla',
                    year: '1800', // Invalid year (too old)
                    color: 'Black',
                    plateNumber: 'ABC-123',
                    registrationDate: '2023-10-05',
                }),
            };

            // Mock user information
            executeQuery.mockResolvedValueOnce([{ usc_id: 'USCxxxxxxx' }]);

            // Execute the handler
            const result = await createVehicleHandler(request);

            // Verify the response
            expect(result.data.error).toContain('Invalid year');
            expect(result.options.status).toBe(400);

            // Test with year in the far future
            request.json = vi.fn().mockResolvedValue({
                userId: '1',
                vehicleType: '4-wheel',
                make: 'Toyota',
                model: 'Corolla',
                year: '2050', // Invalid year (too far in future)
                color: 'Black',
                plateNumber: 'ABC-123',
                registrationDate: '2023-10-05',
            });

            // Reset mock for consistency
            executeQuery.mockReset();
            executeQuery.mockResolvedValueOnce([{ usc_id: 'USCxxxxxxx' }]);

            const result2 = await createVehicleHandler(request);

            // Verify the response
            expect(result2.data.error).toContain('Invalid year');
            expect(result2.options.status).toBe(400);
        });

        it('should accept valid year values', async () => {
            const currentYear = new Date().getFullYear();

            // Prepare mock request with valid year
            const request = {
                json: vi.fn().mockResolvedValue({
                    userId: '1',
                    vehicleType: '4-wheel',
                    make: 'Toyota',
                    model: 'Corolla',
                    year: '2023', // Valid current year
                    color: 'Black',
                    plateNumber: 'ABC-123',
                    registrationDate: '2023-10-05',
                }),
            };

            // Mock user information and database responses
            executeQuery.mockResolvedValueOnce([{ usc_id: 'USCxxxxxxx' }]); // User info
            executeQuery.mockResolvedValueOnce([]); // No existing vehicle with plate number
            executeQuery.mockResolvedValueOnce({ insertId: 123 }); // Successful insert

            // Execute the handler
            const result = await createVehicleHandler(request);

            // Verify the response
            expect(result.data.success).toBe(true);

            // Verify that year was passed to the query
            expect(executeQuery).toHaveBeenCalledTimes(3);
            const insertCall = executeQuery.mock.calls[2];
            expect(insertCall[0]).toContain('year');
            expect(insertCall[1][8]).toBe(2023); // 9th parameter should be the year
        });

        it('should deny access to non-admin users', async () => {
            // Mock non-admin session
            getSession.mockResolvedValue({
                userId: '1',
                userRole: 'Student',
            });

            const request = {
                json: vi.fn().mockResolvedValue({
                    userId: '1',
                    vehicleType: '4-wheel',
                    make: 'Toyota',
                    model: 'Corolla',
                    year: '2023',
                    color: 'Black',
                    plateNumber: 'ABC-123',
                }),
            };

            // Execute the handler
            const result = await createVehicleHandler(request);

            // Verify unauthorized response
            expect(result.data.error).toBe('Unauthorized');
            expect(result.options.status).toBe(401);
        });
    });

    describe('Update Vehicle API', () => {
        it('should allow updating year on existing vehicles', async () => {
            // Prepare mock request with updated year
            const request = {
                json: vi.fn().mockResolvedValue({
                    vehicleId: '123',
                    year: '2020', // New year value
                }),
            };

            // Mock vehicle exists
            executeQuery.mockResolvedValueOnce([{ id: 123, plate_number: 'ABC-123' }]);
            // Mock successful update
            executeQuery.mockResolvedValueOnce({ affectedRows: 1 });

            // Execute the handler
            const result = await updateVehicleHandler(request);

            // Verify the response
            expect(result.data.success).toBe(true);

            // Verify that update query included year
            const updateCall = executeQuery.mock.calls[1];
            expect(updateCall[0]).toContain('year = ?');
        });

        it('should validate year format during updates', async () => {
            // Prepare mock request with invalid year
            const request = {
                json: vi.fn().mockResolvedValue({
                    vehicleId: '123',
                    year: 'invalid', // Non-numeric year
                }),
            };

            // Mock vehicle exists
            executeQuery.mockResolvedValueOnce([{ id: 123, plate_number: 'ABC-123' }]);

            // Execute the handler
            const result = await updateVehicleHandler(request);

            // Verify the response shows validation error
            expect(result.data.error).toContain('Invalid year');
            expect(result.options.status).toBe(400);
        });

        it('should deny access to non-admin users for updates', async () => {
            // Mock non-admin session
            getSession.mockResolvedValue({
                userId: '1',
                userRole: 'Student',
            });

            const request = {
                json: vi.fn().mockResolvedValue({
                    vehicleId: '123',
                    year: '2020',
                }),
            };

            // Execute the handler
            const result = await updateVehicleHandler(request);

            // Verify unauthorized response
            expect(result.data.error).toBe('Unauthorized');
            expect(result.options.status).toBe(401);
        });
    });
});