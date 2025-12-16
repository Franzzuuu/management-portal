import { executeQuery, queryMany } from '@/lib/database';

/**
 * Create a notification for a user
 * @param {Object} params - Notification parameters
 * @param {number} params.userId - The user ID to notify
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Notification type (vehicle_pending, appeal_pending, violation_issued, etc.)
 * @param {number|null} params.relatedId - Related entity ID (vehicle_id, violation_id, etc.)
 */
export async function createNotification({ userId, title, message, type, relatedId = null }) {
    try {
        const result = await executeQuery(
            `INSERT INTO notifications (user_id, title, message, type, related_id, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, 0, NOW())`,
            [userId, title, message, type, relatedId]
        );
        return { success: true, notificationId: result.insertId };
    } catch (error) {
        console.error('Failed to create notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create notifications for multiple users
 * @param {number[]} userIds - Array of user IDs to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {number|null} relatedId - Related entity ID
 */
export async function createBulkNotifications(userIds, title, message, type, relatedId = null) {
    try {
        const values = userIds.map(userId => [userId, title, message, type, relatedId, 0]);
        const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, NOW())').join(', ');
        const flatValues = values.flat();

        await executeQuery(
            `INSERT INTO notifications (user_id, title, message, type, related_id, is_read, created_at)
             VALUES ${placeholders}`,
            flatValues
        );
        return { success: true };
    } catch (error) {
        console.error('Failed to create bulk notifications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create notifications for all admins
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {number|null} relatedId - Related entity ID
 */
export async function notifyAllAdmins(title, message, type, relatedId = null) {
    try {
        const admins = await queryMany(
            `SELECT id FROM users WHERE designation = 'Admin' AND status = 'active'`
        );
        
        if (admins && admins.length > 0) {
            const adminIds = admins.map(admin => admin.id);
            return await createBulkNotifications(adminIds, title, message, type, relatedId);
        }
        return { success: true, message: 'No admins to notify' };
    } catch (error) {
        console.error('Failed to notify admins:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Notification type constants
 */
export const NotificationTypes = {
    VEHICLE_PENDING: 'vehicle_pending',
    VEHICLE_APPROVED: 'vehicle_approved',
    VEHICLE_REJECTED: 'vehicle_rejected',
    APPEAL_PENDING: 'appeal_pending',
    APPEAL_RESOLVED: 'appeal_resolved',
    VIOLATION_ISSUED: 'violation_issued',
    STICKER_ASSIGNED: 'sticker_assigned',
    ACCOUNT_STATUS_CHANGED: 'account_status_changed'
};

/**
 * Get the navigation path for a notification based on its type and user designation
 * @param {string} type - Notification type
 * @param {number|null} relatedId - Related entity ID
 * @param {string} designation - User designation (Admin, Security, Carolinian)
 */
export function getNotificationPath(type, relatedId, designation) {
    const basePath = designation === 'Admin' ? '/admin' : 
                     designation === 'Security' ? '/security' : '/carolinian';
    
    switch (type) {
        case NotificationTypes.VEHICLE_PENDING:
            return designation === 'Admin' ? `/admin/vehicles?highlight=${relatedId}` : `${basePath}/vehicles`;
        case NotificationTypes.VEHICLE_APPROVED:
        case NotificationTypes.VEHICLE_REJECTED:
            return `${basePath}/vehicles`;
        case NotificationTypes.APPEAL_PENDING:
            return designation === 'Admin' ? `/admin/appeals?highlight=${relatedId}` : `${basePath}/violations`;
        case NotificationTypes.APPEAL_RESOLVED:
            return `${basePath}/violations`;
        case NotificationTypes.VIOLATION_ISSUED:
            return `${basePath}/violations`;
        case NotificationTypes.STICKER_ASSIGNED:
            return `${basePath}/vehicles`;
        case NotificationTypes.ACCOUNT_STATUS_CHANGED:
            return `${basePath}/profile`;
        default:
            return basePath;
    }
}
