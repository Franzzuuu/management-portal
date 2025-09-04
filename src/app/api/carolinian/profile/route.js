import { queryOne, executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is a Student or Faculty user
        if (!['Student', 'Faculty'].includes(session.userRole)) {
            return Response.json({ error: 'Access denied. Students and Faculty only.' }, { status: 403 });
        }

        const userId = session.userId;

        // Get user profile information (using correct column names)
        const profile = await queryOne(`
            SELECT 
                up.full_name,
                u.email,
                up.phone_number as phone,
                u.department,
                '' as student_id,
                '' as employee_id,
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
            `, [userId, session.userEmail || 'User']);

            // Fetch the newly created profile
            const newProfile = await queryOne(`
                SELECT 
                    up.full_name,
                    u.email,
                    up.phone_number as phone,
                    '' as department,
                    '' as student_id,
                    '' as employee_id,
                    u.email as username,
                    u.designation,
                    u.created_at
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE u.id = ?
            `, [userId]);

            return Response.json({
                success: true,
                profile: newProfile || {}
            });
        }

        return Response.json({
            success: true,
            profile: profile
        });

    } catch (error) {
        console.error('Carolinian profile GET API error:', error);
        return Response.json(
            { error: 'Failed to fetch profile' },
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

        // Ensure this is a Student or Faculty user
        if (!['Student', 'Faculty'].includes(session.userRole)) {
            return Response.json({ error: 'Access denied. Students and Faculty only.' }, { status: 403 });
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
            // Update existing profile (using correct column names)
            await executeQuery(`
                UPDATE user_profiles 
                SET 
                    full_name = ?,
                    phone_number = ?,
                    updated_at = NOW()
                WHERE user_id = ?
            `, [
                profileData.full_name.trim(),
                profileData.phone?.trim() || null,
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
            // Create new profile (using correct column names)
            await executeQuery(`
                INSERT INTO user_profiles (
                    user_id,
                    full_name,
                    phone_number,
                    created_at
                ) VALUES (?, ?, ?, NOW())
            `, [
                userId,
                profileData.full_name.trim(),
                profileData.phone?.trim() || null
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
        console.error('Carolinian profile PUT API error:', error);
        return Response.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}