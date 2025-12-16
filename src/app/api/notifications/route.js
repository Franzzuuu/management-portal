import { queryMany, queryOne, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

// GET /api/notifications - Get all notifications for current user
export async function GET(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's database ID from uscId
        const user = await queryOne('SELECT id FROM users WHERE usc_id = ?', [session.uscId]);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const userId = user.id;

        const { searchParams } = new URL(request.url);
        const limit = Number(parseInt(searchParams.get('limit')) || 20);
        const unreadOnly = searchParams.get('unread_only') === 'true';

        // Build query with limit directly in the string to avoid prepared statement issues
        let query = `
            SELECT id, user_id, title, message, type, related_id, is_read, created_at
            FROM notifications
            WHERE user_id = ?
        `;

        if (unreadOnly) {
            query += ` AND is_read = 0`;
        }

        query += ` ORDER BY created_at DESC LIMIT ${limit}`;

        const notifications = await queryMany(query, [userId]);

        // Get unread count
        const unreadResult = await queryOne(
            `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
            [userId]
        );

        return Response.json({
            success: true,
            notifications: notifications || [],
            unread_count: unreadResult?.count || 0
        });

    } catch (error) {
        console.error('Notifications API error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch notifications'
        }, { status: 500 });
    }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's database ID from uscId
        const user = await queryOne('SELECT id FROM users WHERE usc_id = ?', [session.uscId]);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const userId = user.id;

        const body = await request.json();
        const { notification_id, mark_all } = body;

        if (mark_all) {
            // Mark all notifications as read for this user
            await executeQuery(
                `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
                [userId]
            );
            return Response.json({
                success: true,
                message: 'All notifications marked as read'
            });
        } else if (notification_id) {
            // Mark specific notification as read
            await executeQuery(
                `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
                [notification_id, userId]
            );
            return Response.json({
                success: true,
                message: 'Notification marked as read'
            });
        } else {
            return Response.json({
                success: false,
                error: 'notification_id or mark_all required'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Notifications PUT error:', error);
        return Response.json({
            success: false,
            error: 'Failed to update notification'
        }, { status: 500 });
    }
}

// DELETE /api/notifications - Delete a notification
export async function DELETE(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's database ID from uscId
        const user = await queryOne('SELECT id FROM users WHERE usc_id = ?', [session.uscId]);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const userId = user.id;

        const { searchParams } = new URL(request.url);
        const notificationId = searchParams.get('id');
        const deleteAll = searchParams.get('delete_all') === 'true';

        if (deleteAll) {
            await executeQuery(
                `DELETE FROM notifications WHERE user_id = ?`,
                [userId]
            );
            return Response.json({
                success: true,
                message: 'All notifications deleted'
            });
        } else if (notificationId) {
            await executeQuery(
                `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
                [notificationId, userId]
            );
            return Response.json({
                success: true,
                message: 'Notification deleted'
            });
        } else {
            return Response.json({
                success: false,
                error: 'id or delete_all required'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Notifications DELETE error:', error);
        return Response.json({
            success: false,
            error: 'Failed to delete notification'
        }, { status: 500 });
    }
}

// Helper function to create a notification (exported for use in other routes)
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
