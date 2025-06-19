import { createUser } from '@/lib/auth';

// Accept both GET and POST for testing
export async function GET() {
    return await createTestUser();
}

export async function POST() {
    return await createTestUser();
}

async function createTestUser() {
    try {
        // Create a test admin user
        const testUser = {
            email: 'admin@test.com',
            password: 'Admin123!',
            designation: 'Admin',
            fullName: 'Test Administrator',
            phoneNumber: '1234567890',
            gender: 'Other'
        };

        const result = await createUser(testUser);

        return Response.json({
            success: true,
            message: 'Test admin user created successfully!',
            user: {
                userId: result.userId,
                email: result.email,
                designation: result.designation
            }
        });

    } catch (error) {
        // If user already exists, that's fine
        if (error.message.includes('already exists')) {
            return Response.json({
                success: true,
                message: 'Test admin user already exists',
                note: 'You can login with admin@test.com / Admin123!'
            });
        }

        console.error('Test auth error:', error);
        return Response.json(
            {
                error: 'Failed to create test user',
                details: error.message
            },
            { status: 500 }
        );
    }
}