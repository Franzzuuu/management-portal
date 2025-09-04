import { executeQuery } from '../database';

export async function addProfilePictureColumn() {
    const query = `
        ALTER TABLE users 
        ADD COLUMN profile_picture MEDIUMBLOB,
        ADD COLUMN profile_picture_type VARCHAR(50);
    `;

    try {
        await executeQuery(query);
        console.log('Successfully added profile_picture column to users table');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
