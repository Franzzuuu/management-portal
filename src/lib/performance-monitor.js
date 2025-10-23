// src/lib/performance-monitor.js
import { executeQuery } from './database.js';

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.alerts = [];
        this.thresholds = {
            exportJobDuration: 5 * 60 * 1000, // 5 minutes
            errorRate: 0.1, // 10%
            queueSize: 10,
            avgProcessingTime: 2 * 60 * 1000, // 2 minutes
            cacheHitRate: 0.7 // 70%
        };
    }

    /**
     * Record export job metrics
     */
    async recordExportJobMetric(jobId, reportType, format, duration, status, rowCount = 0, errorMessage = null) {
        const metric = {
            job_id: jobId,
            report_type: reportType,
            format,
            duration_ms: duration,
            status,
            row_count: rowCount,
            error_message: errorMessage,
            timestamp: new Date(),
            processing_rate: rowCount > 0 ? Math.round(rowCount / (duration / 1000)) : 0 // rows per second
        };

        // Store in memory for immediate analysis
        this.metrics.set(jobId, metric);

        // Store in database for historical analysis
        try {
            await executeQuery(`
                INSERT INTO export_job_metrics (
                    job_id, report_type, format, duration_ms, status, 
                    row_count, error_message, processing_rate, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                jobId, reportType, format, duration, status,
                rowCount, errorMessage, metric.processing_rate
            ]);
        } catch (error) {
            console.warn('Failed to store export job metric:', error);
        }

        // Check for alerts
        this.checkExportJobAlerts(metric);

        return metric;
    }

    /**
     * Record API endpoint performance
     */
    recordAPIMetric(endpoint, method, duration, statusCode, userAgent = null) {
        const metric = {
            endpoint,
            method,
            duration_ms: duration,
            status_code: statusCode,
            user_agent: userAgent,
            timestamp: new Date(),
            is_error: statusCode >= 400
        };

        const key = `api:${endpoint}:${method}:${Date.now()}`;
        this.metrics.set(key, metric);

        // Check API performance alerts
        this.checkAPIAlerts(endpoint, method, metric);

        return metric;
    }

    /**
     * Record cache performance metrics
     */
    recordCacheMetric(operation, key, hit, duration = 0) {
        const metric = {
            operation, // 'get', 'set', 'delete'
            cache_key: key,
            hit,
            duration_ms: duration,
            timestamp: new Date()
        };

        const metricKey = `cache:${operation}:${Date.now()}`;
        this.metrics.set(metricKey, metric);

        return metric;
    }

    /**
     * Check for export job performance alerts
     */
    checkExportJobAlerts(metric) {
        const alerts = [];

        // Alert for long-running jobs
        if (metric.duration_ms > this.thresholds.exportJobDuration) {
            alerts.push({
                type: 'export_job_slow',
                severity: 'warning',
                message: `Export job ${metric.job_id} took ${Math.round(metric.duration_ms / 1000)}s (threshold: ${this.thresholds.exportJobDuration / 1000}s)`,
                metric,
                timestamp: new Date()
            });
        }

        // Alert for failed jobs
        if (metric.status === 'error') {
            alerts.push({
                type: 'export_job_failed',
                severity: 'error',
                message: `Export job ${metric.job_id} failed: ${metric.error_message}`,
                metric,
                timestamp: new Date()
            });
        }

        // Alert for low processing rate
        if (metric.processing_rate > 0 && metric.processing_rate < 10) { // Less than 10 rows/second
            alerts.push({
                type: 'export_job_slow_processing',
                severity: 'warning',
                message: `Export job ${metric.job_id} has low processing rate: ${metric.processing_rate} rows/sec`,
                metric,
                timestamp: new Date()
            });
        }

        this.alerts.push(...alerts);
        return alerts;
    }

    /**
     * Check for API performance alerts
     */
    checkAPIAlerts(endpoint, method, metric) {
        const alerts = [];

        // Alert for slow API responses
        if (metric.duration_ms > 5000) { // 5 seconds
            alerts.push({
                type: 'api_slow_response',
                severity: 'warning',
                message: `Slow API response: ${method} ${endpoint} took ${metric.duration_ms}ms`,
                metric,
                timestamp: new Date()
            });
        }

        // Alert for API errors
        if (metric.is_error) {
            alerts.push({
                type: 'api_error',
                severity: metric.status_code >= 500 ? 'error' : 'warning',
                message: `API error: ${method} ${endpoint} returned ${metric.status_code}`,
                metric,
                timestamp: new Date()
            });
        }

        this.alerts.push(...alerts);
        return alerts;
    }

    /**
     * Get current queue size from database
     */
    async getCurrentQueueSize() {
        try {
            const result = await executeQuery(`
                SELECT COUNT(*) as count 
                FROM export_jobs 
                WHERE status IN ('queued', 'running')
            `);
            return result[0]?.count || 0;
        } catch (error) {
            console.error('Failed to get queue size:', error);
            return 0;
        }
    }

    /**
     * Calculate error rate for recent export jobs
     */
    async getRecentErrorRate(hours = 24) {
        try {
            const [totalJobs, errorJobs] = await Promise.all([
                executeQuery(`
                    SELECT COUNT(*) as count 
                    FROM export_jobs 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                `, [hours]),
                executeQuery(`
                    SELECT COUNT(*) as count 
                    FROM export_jobs 
                    WHERE status = 'error' AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                `, [hours])
            ]);

            const total = totalJobs[0]?.count || 0;
            const errors = errorJobs[0]?.count || 0;

            return total > 0 ? errors / total : 0;
        } catch (error) {
            console.error('Failed to calculate error rate:', error);
            return 0;
        }
    }

    /**
     * Get average processing time for recent jobs
     */
    async getAverageProcessingTime(hours = 24) {
        try {
            const result = await executeQuery(`
                SELECT AVG(TIMESTAMPDIFF(MICROSECOND, started_at, completed_at) / 1000) as avg_duration
                FROM export_jobs 
                WHERE status = 'done' 
                AND completed_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                AND started_at IS NOT NULL
            `, [hours]);

            return result[0]?.avg_duration || 0;
        } catch (error) {
            console.error('Failed to calculate average processing time:', error);
            return 0;
        }
    }

    /**
     * Generate comprehensive health report
     */
    async generateHealthReport() {
        try {
            const [queueSize, errorRate, avgProcessingTime] = await Promise.all([
                this.getCurrentQueueSize(),
                this.getRecentErrorRate(),
                this.getAverageProcessingTime()
            ]);

            const recentAlerts = this.alerts.filter(alert =>
                Date.now() - alert.timestamp.getTime() < 60 * 60 * 1000 // Last hour
            );

            const healthScore = this.calculateHealthScore(queueSize, errorRate, avgProcessingTime);

            return {
                timestamp: new Date().toISOString(),
                health_score: healthScore,
                status: healthScore >= 0.8 ? 'healthy' : healthScore >= 0.6 ? 'warning' : 'critical',
                metrics: {
                    queue_size: queueSize,
                    error_rate: Math.round(errorRate * 100) / 100,
                    avg_processing_time_ms: Math.round(avgProcessingTime),
                    active_alerts: recentAlerts.length
                },
                thresholds: this.thresholds,
                recent_alerts: recentAlerts.slice(-10), // Last 10 alerts
                recommendations: this.generateRecommendations(queueSize, errorRate, avgProcessingTime)
            };
        } catch (error) {
            console.error('Failed to generate health report:', error);
            return {
                timestamp: new Date().toISOString(),
                health_score: 0,
                status: 'unknown',
                error: error.message
            };
        }
    }

    /**
     * Calculate overall system health score (0-1)
     */
    calculateHealthScore(queueSize, errorRate, avgProcessingTime) {
        let score = 1.0;

        // Penalize high queue size
        if (queueSize > this.thresholds.queueSize) {
            score -= 0.2;
        }

        // Penalize high error rate
        if (errorRate > this.thresholds.errorRate) {
            score -= 0.3;
        }

        // Penalize slow processing
        if (avgProcessingTime > this.thresholds.avgProcessingTime) {
            score -= 0.2;
        }

        // Recent critical alerts
        const recentCriticalAlerts = this.alerts.filter(alert =>
            alert.severity === 'error' &&
            Date.now() - alert.timestamp.getTime() < 30 * 60 * 1000 // Last 30 minutes
        );

        if (recentCriticalAlerts.length > 0) {
            score -= 0.3;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations(queueSize, errorRate, avgProcessingTime) {
        const recommendations = [];

        if (queueSize > this.thresholds.queueSize) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Consider adding more export workers or optimizing export queries',
                action: 'scale_workers'
            });
        }

        if (errorRate > this.thresholds.errorRate) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                message: 'High error rate detected. Review recent failed jobs and error patterns',
                action: 'investigate_errors'
            });
        }

        if (avgProcessingTime > this.thresholds.avgProcessingTime) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Export jobs are taking longer than expected. Consider database optimization',
                action: 'optimize_queries'
            });
        }

        return recommendations;
    }

    /**
     * Clear old metrics and alerts
     */
    cleanup(olderThanHours = 24) {
        const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);

        // Clear old in-memory metrics
        for (const [key, metric] of this.metrics.entries()) {
            if (metric.timestamp.getTime() < cutoff) {
                this.metrics.delete(key);
            }
        }

        // Clear old alerts
        this.alerts = this.alerts.filter(alert => alert.timestamp.getTime() >= cutoff);
    }

    /**
     * Get recent metrics summary
     */
    getMetricsSummary(hours = 1) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        const recentMetrics = Array.from(this.metrics.values())
            .filter(metric => metric.timestamp.getTime() >= cutoff);

        const exportMetrics = recentMetrics.filter(m => m.job_id);
        const apiMetrics = recentMetrics.filter(m => m.endpoint);

        return {
            export_jobs: {
                total: exportMetrics.length,
                successful: exportMetrics.filter(m => m.status === 'done').length,
                failed: exportMetrics.filter(m => m.status === 'error').length,
                avg_duration: exportMetrics.length > 0
                    ? Math.round(exportMetrics.reduce((sum, m) => sum + m.duration_ms, 0) / exportMetrics.length)
                    : 0
            },
            api_calls: {
                total: apiMetrics.length,
                successful: apiMetrics.filter(m => !m.is_error).length,
                failed: apiMetrics.filter(m => m.is_error).length,
                avg_duration: apiMetrics.length > 0
                    ? Math.round(apiMetrics.reduce((sum, m) => sum + m.duration_ms, 0) / apiMetrics.length)
                    : 0
            }
        };
    }
}

// Singleton instance
let monitorInstance = null;

export function getPerformanceMonitor() {
    if (!monitorInstance) {
        monitorInstance = new PerformanceMonitor();
    }
    return monitorInstance;
}

export default PerformanceMonitor;