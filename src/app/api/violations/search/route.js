export async function GET(request) {
    try {
        const session = await getSession();
        if (!session || !['Admin', 'Security'].includes(session.userRole)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        if (query.length < 2) {
            return NextResponse.json({ suggestions: [] });
        }

        const searchTerm = `%${query}%`;

        // Get unique suggestions from different fields
        const [names, plates, violationTypes] = await Promise.all([
            // Student names
            queryMany(`
                SELECT DISTINCT up.full_name as value, 'name' as type
                FROM user_profiles up
                JOIN users u ON up.user_id = u.id
                JOIN vehicles v ON u.id = v.user_id
                JOIN violations vl ON v.id = vl.vehicle_id
                WHERE up.full_name LIKE ?
                LIMIT 3
            `, [searchTerm]),

            // Plate numbers
            queryMany(`
                SELECT DISTINCT v.plate_number as value, 'plate' as type
                FROM vehicles v
                JOIN violations vl ON v.id = vl.vehicle_id
                WHERE v.plate_number LIKE ?
                LIMIT 3
            `, [searchTerm]),

            // Violation types
            queryMany(`
                SELECT DISTINCT violation_type as value, 'violation' as type
                FROM violations
                WHERE violation_type LIKE ?
                LIMIT 3
            `, [searchTerm])
        ]);

        const suggestions = [...names, ...plates, ...violationTypes];

        return NextResponse.json({ suggestions });

    } catch (error) {
        console.error('Error getting search suggestions:', error);
        return NextResponse.json(
            { error: 'Failed to get suggestions' },
            { status: 500 }
        );
    }
}