import { queryOne, executeQuery, getConnection } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.userRole !== 'Security') return Response.json({ error: 'Access denied. Security only.' }, { status: 403 });

        const profile = await queryOne(`
            SELECT 
                up.full_name,
                u.email,
                up.phone_number as phone,
                up.department,
                u.usc_id as employee_id,
                u.email as username,
                u.designation,
                u.created_at,
                up.profile_picture_type
            FROM users u
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            WHERE u.usc_id = ?
        `, [session.uscId]);

        if (!profile) {
            await executeQuery(`
                INSERT INTO user_profiles (usc_id, email, full_name, created_at) 
                VALUES (?, ?, ?, NOW())
            `, [session.uscId, session.userEmail || '', session.userEmail || 'Security User']);

            const newProfile = await queryOne(`
                SELECT 
                    up.full_name,
                    u.email,
                    up.phone_number as phone,
                    up.department,
                    u.usc_id as employee_id,
                    u.email as username,
                    u.designation,
                    u.created_at,
                    up.profile_picture_type
                FROM users u
                LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
                WHERE u.usc_id = ?
            `, [session.uscId]);

            return Response.json({
                success: true,
                profile: newProfile || {
                    full_name: session.userEmail || 'Security User',
                    email: session.userEmail || '',
                    phone: '',
                    department: '',
                    employee_id: session.uscId,
                    username: session.userEmail || '',
                    designation: 'Security',
                    created_at: new Date().toISOString()
                }
            });
        }

        return Response.json({ success: true, profile });
    } catch (error) {
        console.error('Security profile GET API error:', error);
        return Response.json({ error: 'Failed to fetch profile data' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const session = await getSession();
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.userRole !== 'Security') return Response.json({ error: 'Access denied. Security only.' }, { status: 403 });

        const profileData = await request.json();

        if (!profileData.full_name?.trim()) {
            return Response.json({ error: 'Full name is required' }, { status: 400 });
        }

        if (!profileData.email?.trim()) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
            return Response.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }

        const existingProfile = await queryOne(`
            SELECT id FROM user_profiles WHERE usc_id = ?
        `, [session.uscId]);

        const connection = await getConnection();
        await connection.beginTransaction();

        try {
            if (existingProfile) {
                // Get the new USC ID (employee_id in the UI)
                const newUscId = profileData.employee_id?.trim() || session.uscId;

                await connection.execute(`
                    UPDATE user_profiles 
                    SET 
                        full_name = ?, 
                        phone_number = ?, 
                        email = ?, 
                        usc_id = ?,
                        updated_at = NOW()
                    WHERE usc_id = ?
                `, [
                    profileData.full_name.trim(),
                    profileData.phone?.trim() || null,
                    profileData.email.trim(),
                    newUscId,
                    session.uscId
                ]);

                await connection.execute(`
                    UPDATE users 
                    SET 
                        email = ?,
                        usc_id = ?
                    WHERE usc_id = ?
                `, [
                    profileData.email.trim(),
                    newUscId,
                    session.uscId
                ]);

                await connection.execute(`
                    UPDATE user_profiles 
                    SET department = ? 
                    WHERE usc_id = ?
                `, [
                    profileData.department?.trim() || null,
                    newUscId
                ]);
            } else {
                // Get the new USC ID (employee_id in the UI)
                const newUscId = profileData.employee_id?.trim() || session.uscId;

                await connection.execute(`
                    INSERT INTO user_profiles (usc_id, full_name, phone_number, email, created_at)
                    VALUES (?, ?, ?, ?, NOW())
                `, [
                    newUscId,
                    profileData.full_name.trim(),
                    profileData.phone?.trim() || null,
                    profileData.email.trim()
                ]);

                await connection.execute(`
                    UPDATE user_profiles SET department = ? WHERE usc_id = ?
                `, [profileData.department?.trim() || null, newUscId]);

                // Update USC ID in users table if it changed
                if (newUscId !== session.uscId) {
                    await connection.execute(`
                        UPDATE users SET usc_id = ? WHERE usc_id = ?
                    `, [newUscId, session.uscId]);
                }
            }

            await connection.commit();
            return Response.json({ success: true, message: 'Profile updated successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Security profile PUT API error:', error);
        return Response.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
