import { queryOne, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is a Security user
        if (session.userRole !== 'Security') {
            return Response.json({ error: 'Access denied. Security only.' }, { status: 403 });
        }

        const userId = session.userId;

        // Get user profile information
        const profile = await queryOne(`
            SELECT 
                up.full_name,
                u.email,
                up.phone_number as phone,
                u.department,
                up.usc_id as employee_id,
                u.email as username,
                u.designation,
                u.created_at
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        `, [userId]);

        if (!profile) {
            // Create default profile if none exists
            await executeQuery(`
                INSERT INTO user_profiles (
                    user_id,
                    full_name,
                    created_at
                ) VALUES (?, ?, NOW())
            `, [userId, session.userEmail || 'Security User']);

            // Fetch the newly created profile
            const newProfile = await queryOne(`
                SELECT 
                    up.full_name,
                    u.email,
                    up.phone_number as phone,
                    u.department,
                    up.usc_id as employee_id,
                    u.email as username,
                    u.designation,
                    u.created_at
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE u.id = ?
            `, [userId]);

            return Response.json({
                success: true,
                profile: newProfile || {
                    full_name: session.userEmail || 'Security User',
                    email: session.userEmail || '',
                    phone: '',
                    department: '',
                    employee_id: '',
                    username: session.userEmail || '',
                    designation: 'Security',
                    created_at: new Date().toISOString()
                }
            });
        }

        return Response.json({
            success: true,
            profile
        });

    } catch (error) {
        console.error('Security profile GET API error:', error);
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

        // Ensure this is a Security user
        if (session.userRole !== 'Security') {
            return Response.json({ error: 'Access denied. Security only.' }, { status: 403 });
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
            SELECT id FROM user_profiles WHERE user_id = ?
        `, [userId]);

        if (existingProfile) {
            // Update existing profile
            await executeQuery(`
                UPDATE user_profiles 
                SET 
                    full_name = ?,
                    phone_number = ?,
                    usc_id = ?,
                    updated_at = NOW()
                WHERE user_id = ?
            `, [
                profileData.full_name.trim(),
                profileData.phone?.trim() || null,
                profileData.employee_id?.trim() || null,
                userId
            ]);

            // Update email and department in users table
            await executeQuery(`
                UPDATE users 
                SET 
                    email = ?,
                    department = ?
                WHERE id = ?
            `, [
                profileData.email.trim(),
                profileData.department?.trim() || null,
                userId
            ]);
        } else {
            // Create new profile
            await executeQuery(`
                INSERT INTO user_profiles (
                    user_id,
                    full_name,
                    phone_number,
                    usc_id,
                    created_at
                ) VALUES (?, ?, ?, ?, NOW())
            `, [
                userId,
                profileData.full_name.trim(),
                profileData.phone?.trim() || null,
                profileData.employee_id?.trim() || null
            ]);

            // Update email and department in users table
            await executeQuery(`
                UPDATE users 
                SET 
                    email = ?,
                    department = ?
                WHERE id = ?
            `, [
                profileData.email.trim(),
                profileData.department?.trim() || null,
                userId
            ]);
        }

        return Response.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Security profile PUT API error:', error);
        return Response.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
