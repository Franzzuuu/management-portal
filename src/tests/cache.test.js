// src/tests/cache.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CacheManager, CacheConfig } from '../lib/cache.js';

describe('Cache Manager', () => {
    beforeEach(() => {
        // Clear cache before each test
        CacheManager.clearAll();
    });

    describe('Basic Cache Operations', () => {
        it('should store and retrieve data', () => {
            const cache = CacheManager.getInstance();
            const testData = { test: 'data' };

            cache.set('test-key', testData);
            const retrieved = cache.get('test-key');

            expect(retrieved).toEqual(testData);
        });

        it('should return undefined for non-existent keys', () => {
            const cache = CacheManager.getInstance();
            const result = cache.get('non-existent');

            expect(result).toBeUndefined();
        });

        it('should expire data after TTL', (done) => {
            const cache = CacheManager.getInstance();
            const testData = { test: 'data' };

            cache.set('test-key', testData, 100); // 100ms TTL

            setTimeout(() => {
                const result = cache.get('test-key');
                expect(result).toBeUndefined();
                done();
            }, 150);
        });

        it('should delete data correctly', () => {
            const cache = CacheManager.getInstance();
            cache.set('test-key', 'test-data');

            const deleted = cache.delete('test-key');
            const retrieved = cache.get('test-key');

            expect(deleted).toBe(true);
            expect(retrieved).toBeUndefined();
        });

        it('should check key existence', () => {
            const cache = CacheManager.getInstance();
            cache.set('test-key', 'test-data');

            expect(cache.has('test-key')).toBe(true);
            expect(cache.has('non-existent')).toBe(false);
        });
    });

    describe('Cache Statistics', () => {
        it('should track hits and misses', () => {
            const cache = CacheManager.getInstance();
            cache.set('test-key', 'test-data');

            // Hit
            cache.get('test-key');
            // Miss
            cache.get('non-existent');

            const stats = cache.getStats();
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
            expect(stats.hitRate).toBe('50.00%');
        });

        it('should track sets and deletes', () => {
            const cache = CacheManager.getInstance();

            cache.set('key1', 'data1');
            cache.set('key2', 'data2');
            cache.delete('key1');

            const stats = cache.getStats();
            expect(stats.sets).toBe(2);
            expect(stats.deletes).toBe(1);
            expect(stats.size).toBe(1);
        });
    });

    describe('Cache Key Generation', () => {
        it('should generate consistent report cache keys', () => {
            const filters = { startDate: '2024-01-01', endDate: '2024-01-31' };
            const pagination = { page: 1, limit: 20 };

            const key1 = CacheManager.generateReportCacheKey('users', filters, pagination);
            const key2 = CacheManager.generateReportCacheKey('users', filters, pagination);

            expect(key1).toBe(key2);
            expect(key1).toContain('report:users:');
        });

        it('should generate different keys for different filters', () => {
            const filters1 = { startDate: '2024-01-01' };
            const filters2 = { startDate: '2024-02-01' };

            const key1 = CacheManager.generateReportCacheKey('users', filters1);
            const key2 = CacheManager.generateReportCacheKey('users', filters2);

            expect(key1).not.toBe(key2);
        });

        it('should generate user stats cache keys', () => {
            const key = CacheManager.generateUserStatsCacheKey('user123');
            expect(key).toBe('user_stats:user123');
        });

        it('should generate overview cache keys', () => {
            const dateRange = { start: '2024-01-01', end: '2024-01-31' };
            const key = CacheManager.generateOverviewCacheKey(dateRange);
            expect(key).toContain('overview:');
        });
    });

    describe('Report Data Caching', () => {
        it('should cache and retrieve report data', async () => {
            const reportData = {
                userStats: { total: 100 },
                vehicleStats: { total: 50 }
            };

            const cached = await CacheManager.cacheReportData('users', {}, reportData);
            const retrieved = CacheManager.getCachedReportData('users', {});

            expect(cached.cachedAt).toBeTruthy();
            expect(cached.cacheKey).toBeTruthy();
            expect(retrieved).toEqual(cached);
        });

        it('should return null for non-cached reports', () => {
            const result = CacheManager.getCachedReportData('non-existent', {});
            expect(result).toBeUndefined();
        });
    });

    describe('Cache Invalidation', () => {
        it('should invalidate specific report type', async () => {
            await CacheManager.cacheReportData('users', {}, { data: 'test1' });
            await CacheManager.cacheReportData('vehicles', {}, { data: 'test2' });
            await CacheManager.cacheReportData('users', { filter: 'active' }, { data: 'test3' });

            const invalidated = CacheManager.invalidateReportCache('users');

            expect(invalidated).toBe(2); // Two users cache entries invalidated
            expect(CacheManager.getCachedReportData('users', {})).toBeUndefined();
            expect(CacheManager.getCachedReportData('vehicles', {})).toBeTruthy();
        });

        it('should invalidate all report cache', async () => {
            await CacheManager.cacheReportData('users', {}, { data: 'test1' });
            await CacheManager.cacheReportData('vehicles', {}, { data: 'test2' });

            const invalidated = CacheManager.invalidateReportCache();

            expect(invalidated).toBe(2);
            expect(CacheManager.getCachedReportData('users', {})).toBeUndefined();
            expect(CacheManager.getCachedReportData('vehicles', {})).toBeUndefined();
        });
    });

    describe('Get or Set Pattern', () => {
        it('should fetch and cache data on first call', async () => {
            const cache = CacheManager.getInstance();
            const mockFn = jest.fn().mockResolvedValue({ result: 'fresh data' });

            const result = await cache.getOrSet('test-key', mockFn);

            expect(result).toEqual({ result: 'fresh data' });
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should return cached data on subsequent calls', async () => {
            const cache = CacheManager.getInstance();
            const mockFn = jest.fn().mockResolvedValue({ result: 'fresh data' });

            await cache.getOrSet('test-key', mockFn);
            const result = await cache.getOrSet('test-key', mockFn);

            expect(result).toEqual({ result: 'fresh data' });
            expect(mockFn).toHaveBeenCalledTimes(1); // Should not be called again
        });

        it('should handle async function errors', async () => {
            const cache = CacheManager.getInstance();
            const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

            await expect(cache.getOrSet('test-key', mockFn)).rejects.toThrow('Test error');
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cache Configuration', () => {
        it('should have proper cache configurations', () => {
            expect(CacheConfig.REPORT_DATA.ttl).toBe(5 * 60 * 1000);
            expect(CacheConfig.USER_STATS.ttl).toBe(10 * 60 * 1000);
            expect(CacheConfig.SYSTEM_OVERVIEW.ttl).toBe(2 * 60 * 1000);
            expect(CacheConfig.EXPORT_METADATA.ttl).toBe(30 * 60 * 1000);

            expect(CacheConfig.REPORT_DATA.enabled).toBe(true);
            expect(CacheConfig.USER_STATS.enabled).toBe(true);
            expect(CacheConfig.SYSTEM_OVERVIEW.enabled).toBe(true);
            expect(CacheConfig.EXPORT_METADATA.enabled).toBe(true);
        });
    });
});