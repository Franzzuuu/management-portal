import { queryMany, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

// GET /api/notifications/violations - Get violation-related notifications
export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const type = url.searchParams.get('type'); // 'all', 'unread', 'violation_related'
        const limit = parseInt(url.searchParams.get('limit')) || 20;

        let whereCondition = 'WHERE n.user_id = ?';
        let params = [session.userId];

        // Filter by type
        if (type === 'unread') {
            whereCondition += ' AND n.is_read = FALSE';
        } else if (type === 'violation_related') {
            whereCondition += ' AND n.type IN ("violation_issued", "violation_status_update", "violation_contested")';
        }

        // Admin/Staff can see system-wide notifications
        if (['Admin', 'Staff'].includes(session.userRole)) {
            // For admin, also include violations they need to review
            const adminNotifications = await queryMany(`
                SELECT 
                    'system' as source,
                    CONCAT('violation_', v.id) as id,
                    'violation_pending_review' as type,
                    'Violation Pending Review' as title,
                    CONCAT('Violation #', v.id, ' by ', up.full_name, ' (', ve.plate_number, ') requires attention') as message,
                    v.id as related_id,
                    FALSE as is_read,
                    v.created_at,
                    NULL as read_at
                FROM violations v
                JOIN vehicles ve ON v.vehicle_id = ve.id
                JOIN users u ON ve.user_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                WHERE v.status = 'contested'
                ORDER BY v.created_at DESC
                LIMIT ?
            `, [Math.floor(limit / 2)]);

            // Get regular notifications
            const regularNotifications = await queryMany(`
                SELECT 
                    'notification' as source,
                    n.id,
                    n.type,
                    n.title,
                    n.message,
                    n.related_id,
                    n.is_read,
                    n.created_at,
                    n.read_at
                FROM notifications n
                ${whereCondition}
                ORDER BY n.created_at DESC
                LIMIT ?
            `, [...params, Math.floor(limit / 2)]);

            // Combine and sort notifications
            const allNotifications = [...adminNotifications, ...regularNotifications]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, limit);

            return Response.json({
                success: true,
                notifications: allNotifications,
                unread_count: allNotifications.filter(n => !n.is_read).length
            });
        }

        // Regular user notifications
        const notifications = await queryMany(`
            SELECT 
                'notification' as source,
                n.id,
                n.type,
                n.title,
                n.message,
                n.related_id,
                n.is_read,
                n.created_at,
                n.read_at
            FROM notifications n
            ${whereCondition}
            ORDER BY n.created_at DESC
            LIMIT ?
        `, [...params, limit]);

        // Get unread count
        const unreadCount = await queryMany(`
            SELECT COUNT(*) as count 
            FROM notifications n 
            WHERE n.user_id = ? AND n.is_read = FALSE
        `, [session.userId]);

        return Response.json({
            success: true,
            notifications: notifications || [],
            unread_count: unreadCount[0]?.count || 0
        });

    } catch (error) {
        console.error('Notifications API error:', error);
        return Response.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

// POST /api/notifications/violations - Mark notifications as read or create new ones
export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, notificationId, notificationIds, type, title, message, relatedId, targetUserId } = body;

        switch (action) {
            case 'mark_read':
                return markNotificationRead(notificationId, session);
            case 'mark_all_read':
                return markAllNotificationsRead(session);
            case 'mark_multiple_read':
                return markMultipleNotificationsRead(notificationIds, session);
            case 'create':
                return createNotification(type, title, message, relatedId, targetUserId || session.userId, session);
            case 'delete':
                return deleteNotification(notificationId, session);
            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Notifications POST error:', error);
        return Response.json(
            { error: 'Failed to process notification request' },
            { status: 500 }
        );
    }
}

async function markNotificationRead(notificationId, session) {
    // Users can only mark their own notifications as read
    await executeQuery(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW() 
        WHERE id = ? AND user_id = ?
    `, [notificationId, session.userId]);

    return Response.json({
        success: true,
        message: 'Notification marked as read'
    });
}

async function markAllNotificationsRead(session) {
    await executeQuery(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW() 
        WHERE user_id = ? AND is_read = FALSE
    `, [session.userId]);

    return Response.json({
        success: true,
        message: 'All notifications marked as read'
    });
}

async function markMultipleNotificationsRead(notificationIds, session) {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return Response.json({ error: 'No notifications specified' }, { status: 400 });
    }

    const placeholders = notificationIds.map(() => '?').join(',');
    await executeQuery(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW() 
        WHERE id IN (${placeholders}) AND user_id = ?
    `, [...notificationIds, session.userId]);

    return Response.json({
        success: true,
        message: `${notificationIds.length} notifications marked as read`
    });
}

async function createNotification(type, title, message, relatedId, targetUserId, session) {
    // Only admins can create notifications for other users
    if (targetUserId !== session.userId && !['Admin', 'Staff'].includes(session.userRole)) {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate notification type
    const validTypes = ['violation_issued', 'violation_status_update', 'violation_contested', 'system_announcement'];
    if (!validTypes.includes(type)) {
        return Response.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    await executeQuery(`
        INSERT INTO notifications (user_id, type, title, message, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    `, [targetUserId, type, title, message, relatedId]);

    return Response.json({
        success: true,
        message: 'Notification created successfully'
    });
}

async function deleteNotification(notificationId, session) {
    // Users can only delete their own notifications
    const result = await executeQuery(`
        DELETE FROM notifications 
        WHERE id = ? AND user_id = ?
    `, [notificationId, session.userId]);

    if (result.affectedRows === 0) {
        return Response.json({ error: 'Notification not found' }, { status: 404 });
    }

    return Response.json({
        success: true,
        message: 'Notification deleted successfully'
    });
}

// Helper function to send violation notification
export async function sendViolationNotification(violationId, userId, type, customMessage = null) {
    try {
        let title, message;

        switch (type) {
            case 'violation_issued':
                title = 'New Violation Issued';
                message = customMessage || `A new violation #${violationId} has been issued for your vehicle.`;
                break;
            case 'violation_status_update':
                title = 'Violation Status Updated';
                message = customMessage || `The status of violation #${violationId} has been updated.`;
                break;
            case 'violation_contested':
                title = 'Violation Contested';
                message = customMessage || `Violation #${violationId} has been contested and is under review.`;
                break;
            default:
                return;
        }

        await executeQuery(`
            INSERT INTO notifications (user_id, type, title, message, related_id, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [userId, type, title, message, violationId]);

        // Also check user notification preferences
        const preferences = await queryMany(`
            SELECT * FROM user_notification_preferences WHERE user_id = ?
        `, [userId]);

        if (preferences.length > 0 && preferences[0].email_violations) {
            // Here you could integrate with an email service
            // await sendEmailNotification(userId, title, message);
        }

    } catch (error) {
        console.error('Failed to send violation notification:', error);
    }
}

// Batch notification system for admin announcements
export async function createBatchNotification(title, message, targetUsers, session) {
    try {
        if (!['Admin', 'Staff'].includes(session.userRole)) {
            throw new Error('Insufficient permissions for batch notifications');
        }

        const insertPromises = targetUsers.map(userId =>
            executeQuery(`
                INSERT INTO notifications (user_id, type, title, message, created_at)
                VALUES (?, 'system_announcement', ?, ?, NOW())
            `, [userId, title, message])
        );

        await Promise.all(insertPromises);

        return {
            success: true,
            message: `Notification sent to ${targetUsers.length} users`
        };

    } catch (error) {
        console.error('Failed to send batch notification:', error);
        throw error;
    }
}