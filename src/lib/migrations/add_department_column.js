import { executeQuery } from '../database';

export async function addDepartmentColumn() {
    const query = `
        ALTER TABLE users 
        ADD COLUMN department VARCHAR(100);
    `;
    
    try {
        await executeQuery(query);
        console.log('Successfully added department column to users table');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
