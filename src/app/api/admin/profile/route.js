import { queryOne, executeQuery, getConnection } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { autoGeneratePinIfNeeded } from '@/lib/pin-utils';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is an Admin user
        if (session.userRole !== 'Admin') {
            return Response.json({ error: 'Access denied. Admin only.' }, { status: 403 });
        }

        const userId = session.userId;

        // Auto-generate PIN if user doesn't have one (first profile view)
        const pin = await autoGeneratePinIfNeeded(session.uscId, 'Admin');

        // Get user profile information
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
                up.profile_picture_type,
                u.pin
            FROM users u
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            WHERE u.usc_id = ?
        `, [session.uscId]);

        if (!profile) {
            // Create default profile if none exists
            await executeQuery(`
                INSERT INTO user_profiles (
                    usc_id,
                    email,
                    full_name,
                    created_at
                ) VALUES (?, ?, ?, NOW())
            `, [session.uscId, session.userEmail || '', session.userEmail || 'Admin User']);

            // Fetch the newly created profile
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
                    up.profile_picture_type,
                    u.pin
                FROM users u
                LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
                WHERE u.usc_id = ?
            `, [session.uscId]);

            return Response.json({
                success: true,
                profile: newProfile || {
                    full_name: session.userEmail || 'Admin User',
                    email: session.userEmail || '',
                    phone: '',
                    department: '',
                    employee_id: '',
                    username: session.userEmail || '',
                    designation: 'Admin',
                    created_at: new Date().toISOString(),
                    pin: pin
                }
            });
        }

        return Response.json({
            success: true,
            profile
        });

    } catch (error) {
        console.error('Admin profile GET API error:', error);
        return Response.json(
            { error: 'Failed to fetch profile data' },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is an Admin user
        if (session.userRole !== 'Admin') {
            return Response.json({ error: 'Access denied. Admin only.' }, { status: 403 });
        }

        const userId = session.userId;
        const profileData = await request.json();

        // Validate required fields
        if (!profileData.full_name?.trim()) {
            return Response.json({
                error: 'Full name is required'
            }, { status: 400 });
        }

        if (!profileData.email?.trim()) {
            return Response.json({
                error: 'Email is required'
            }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profileData.email)) {
            return Response.json({
                error: 'Please enter a valid email address'
            }, { status: 400 });
        }

        // Check if profile exists
        const existingProfile = await queryOne(`
            SELECT id FROM user_profiles WHERE usc_id = ?
        `, [session.uscId]);

        // Start a transaction
        const connection = await getConnection();
        await connection.beginTransaction();

        try {
            if (existingProfile) {
                // Update existing profile
                await connection.execute(`
                    UPDATE user_profiles 
                    SET 
                        full_name = ?,
                        phone_number = ?,
                        email = ?,
                        updated_at = NOW()
                    WHERE usc_id = ?
                `, [
                    profileData.full_name.trim(),
                    profileData.phone?.trim() || null,
                    profileData.email.trim(),
                    session.uscId
                ]);

                // Get the new USC ID (employee_id in the UI)
                const newUscId = profileData.employee_id?.trim() || session.uscId;

                // Update email and USC ID in users table
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

                // Update department and USC ID in user_profiles
                await connection.execute(`
                    UPDATE user_profiles 
                    SET 
                        department = ?,
                        usc_id = ?
                    WHERE usc_id = ?
                `, [
                    profileData.department?.trim() || null,
                    newUscId,
                    session.uscId
                ]);
            } else {
                // Get the new USC ID (employee_id in the UI)
                const newUscId = profileData.employee_id?.trim() || session.uscId;

                // Create new profile with the new USC ID
                await connection.execute(`
                    INSERT INTO user_profiles (
                        usc_id,
                        full_name,
                        phone_number,
                        email,
                        created_at
                    ) VALUES (?, ?, ?, ?, NOW())
                `, [
                    newUscId,
                    profileData.full_name.trim(),
                    profileData.phone?.trim() || null,
                    profileData.email.trim()
                ]);

                // Update department in user_profiles
                await connection.execute(`
                    UPDATE user_profiles 
                    SET 
                        department = ?
                    WHERE usc_id = ?
                `, [
                    profileData.department?.trim() || null,
                    newUscId
                ]);

                // Update USC ID in users table
                await connection.execute(`
                    UPDATE users 
                    SET usc_id = ?
                    WHERE usc_id = ?
                `, [
                    newUscId,
                    session.uscId
                ]);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        return Response.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Admin profile PUT API error:', error);
        return Response.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
