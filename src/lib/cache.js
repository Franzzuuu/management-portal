// src/lib/cache.js
class MemoryCache {
    constructor(defaultTTL = 300000) { // 5 minutes default
        this.cache = new Map();
        this.timers = new Map();
        this.defaultTTL = defaultTTL;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    /**
     * Get value from cache
     */
    get(key) {
        const item = this.cache.get(key);

        if (!item) {
            this.stats.misses++;
            return undefined;
        }

        // Check if expired
        if (Date.now() > item.expiry) {
            this.delete(key);
            this.stats.misses++;
            return undefined;
        }

        this.stats.hits++;
        return item.value;
    }

    /**
     * Set value in cache
     */
    set(key, value, ttl = this.defaultTTL) {
        // Clear existing timer if any
        const existingTimer = this.timers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const expiry = Date.now() + ttl;
        this.cache.set(key, { value, expiry });

        // Set cleanup timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);

        this.timers.set(key, timer);
        this.stats.sets++;

        return true;
    }

    /**
     * Delete value from cache
     */
    delete(key) {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }

        const existed = this.cache.delete(key);
        if (existed) {
            this.stats.deletes++;
        }

        return existed;
    }

    /**
     * Clear entire cache
     */
    clear() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }

        this.timers.clear();
        this.cache.clear();

        // Reset stats
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: this.stats.hits + this.stats.misses > 0
                ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Get or set with async function
     */
    async getOrSet(key, asyncFn, ttl = this.defaultTTL) {
        let value = this.get(key);

        if (value !== undefined) {
            return value;
        }

        try {
            value = await asyncFn();
            this.set(key, value, ttl);
            return value;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if key exists (without updating access time)
     */
    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;

        // Check if expired
        if (Date.now() > item.expiry) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Get all keys
     */
    keys() {
        const validKeys = [];
        const now = Date.now();

        for (const [key, item] of this.cache.entries()) {
            if (now <= item.expiry) {
                validKeys.push(key);
            } else {
                // Clean up expired key
                this.delete(key);
            }
        }

        return validKeys;
    }
}

// Singleton cache instance
let cacheInstance = null;

export class CacheManager {
    static getInstance() {
        if (!cacheInstance) {
            cacheInstance = new MemoryCache();
        }
        return cacheInstance;
    }

    /**
     * Generate cache key for reports
     */
    static generateReportCacheKey(reportType, filters = {}, pagination = {}) {
        const filterString = JSON.stringify(filters);
        const pageString = JSON.stringify(pagination);
        return `report:${reportType}:${Buffer.from(filterString + pageString).toString('base64')}`;
    }

    /**
     * Generate cache key for user stats
     */
    static generateUserStatsCacheKey(userId) {
        return `user_stats:${userId}`;
    }

    /**
     * Generate cache key for system overview
     */
    static generateOverviewCacheKey(dateRange = {}) {
        const dateString = JSON.stringify(dateRange);
        return `overview:${Buffer.from(dateString).toString('base64')}`;
    }

    /**
     * Cache report data with automatic invalidation
     */
    static async cacheReportData(reportType, filters, data, ttl = 300000) {
        const cache = this.getInstance();
        const key = this.generateReportCacheKey(reportType, filters);

        // Add timestamp to data for freshness tracking
        const cachedData = {
            ...data,
            cachedAt: new Date().toISOString(),
            cacheKey: key
        };

        cache.set(key, cachedData, ttl);
        return cachedData;
    }

    /**
     * Get cached report data
     */
    static getCachedReportData(reportType, filters) {
        const cache = this.getInstance();
        const key = this.generateReportCacheKey(reportType, filters);
        return cache.get(key);
    }

    /**
     * Invalidate report cache by pattern
     */
    static invalidateReportCache(reportType = null) {
        const cache = this.getInstance();
        const keys = cache.keys();

        let invalidatedCount = 0;

        for (const key of keys) {
            if (key.startsWith('report:')) {
                if (!reportType || key.includes(`report:${reportType}:`)) {
                    cache.delete(key);
                    invalidatedCount++;
                }
            }
        }

        return invalidatedCount;
    }

    /**
     * Get cache statistics
     */
    static getStats() {
        return this.getInstance().getStats();
    }

    /**
     * Clear all cache
     */
    static clearAll() {
        this.getInstance().clear();
    }
}

// Cache configurations for different data types
export const CacheConfig = {
    REPORT_DATA: {
        ttl: 5 * 60 * 1000, // 5 minutes
        enabled: true
    },
    USER_STATS: {
        ttl: 10 * 60 * 1000, // 10 minutes
        enabled: true
    },
    SYSTEM_OVERVIEW: {
        ttl: 2 * 60 * 1000, // 2 minutes
        enabled: true
    },
    EXPORT_METADATA: {
        ttl: 30 * 60 * 1000, // 30 minutes
        enabled: true
    }
};

export default CacheManager;