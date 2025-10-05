// src/app/api/test-db/route.js
import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/database';
import { initializeDatabase } from '@/lib/init-database'; // ensure this exists; or remove if not needed

export async function GET() {
    try {
        const ok = await testConnection();
        if (!ok) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        // Optional: initialize tables/seeds if you have this helper
        if (initializeDatabase) {
            await initializeDatabase();
        }

        return NextResponse.json({
            success: true,
            message: 'Database connection successful and tables initialized!',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Database test error:', error);
        return NextResponse.json(
            { error: 'Database test failed', details: String(error?.message ?? error) },
            { status: 500 }
        );
    }
}
