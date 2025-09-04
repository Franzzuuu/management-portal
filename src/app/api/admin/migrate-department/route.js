import { addDepartmentColumn } from '@/lib/migrations/add_department_column';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        // Run the department column migration
        await addDepartmentColumn();

        return Response.json({
            success: true,
            message: 'Department column added successfully'
        });

    } catch (error) {
        console.error('Migration API error:', error);
        return Response.json({
            success: false,
            error: error.message || 'Migration failed'
        }, { status: 500 });
    }
}
