import { executeQuery, queryOne, executeDirectQuery, executeInQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function DELETE(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = await request.json();

        // Validate input
        if (!userId) {
            return Response.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Check if user exists and get their info
        const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Prevent admin from deleting themselves
        if (session.userId == userId) {
            return Response.json(
                { error: 'You cannot delete your own account' },
                { status: 400 }
            );
        }

        // Prevent deletion of other admin accounts (optional security measure)
        if (user.designation === 'Admin') {
            return Response.json(
                { error: 'Cannot delete admin accounts. Change designation first.' },
                { status: 400 }
            );
        }

        // Get the user's USC ID for related data deletion
        const uscId = user.usc_id;
        if (!uscId) {
            return Response.json(
                { error: 'User record is missing USC ID' },
                { status: 500 }
            );
        }

        // Make sure there is at least one admin user to reassign references to
        const adminCount = await executeQuery('SELECT COUNT(*) as count FROM users WHERE designation = "Admin" AND id != ?', [userId]);
        if (adminCount[0].count === 0) {
            return Response.json(
                { error: 'Cannot delete user: No admin user available for reference reassignment' },
                { status: 400 }
            );
        }

        // Begin a transaction to ensure all related data is properly deleted
        await executeDirectQuery('START TRANSACTION');

        try {
            console.log(`Starting deletion process for user ${userId} with USC ID ${uscId}`);

            // Validate that we can find an admin user for reassignment if needed
            const adminUser = await queryOne('SELECT id FROM users WHERE designation = "Admin" AND id != ? LIMIT 1', [userId]);
            if (!adminUser) {
                throw new Error('No admin user found for reassignment. Cannot safely delete user.');
            }
            console.log(`Will use admin user ID ${adminUser.id} for reference reassignment`);

            // 1. First, find all vehicle IDs belonging to this user
            const vehicles = await executeQuery('SELECT vehicle_id FROM vehicles WHERE usc_id = ?', [uscId]);
            const vehicleIds = vehicles.map(v => v.vehicle_id);
            console.log(`Found ${vehicleIds.length} vehicles to delete: ${vehicleIds.join(', ')}`);

            // 2. Handle rfid_tags associated with these vehicles
            if (vehicleIds.length > 0) {
                try {
                    // Update rfid_tags to set vehicle_id to NULL
                    for (const vehicleId of vehicleIds) {
                        await executeQuery('UPDATE rfid_tags SET vehicle_id = NULL, status = "unassigned" WHERE vehicle_id = ?', [vehicleId]);
                    }
                    console.log(`Unassigned RFID tags from user's vehicles`);
                } catch (err) {
                    console.error('Error updating RFID tags:', err.message);
                }
            }

            // 3. Handle access_logs for these vehicles
            if (vehicleIds.length > 0) {
                try {
                    // Delete access logs for the vehicles
                    for (const vehicleId of vehicleIds) {
                        const accessResult = await executeQuery('DELETE FROM access_logs WHERE vehicle_id = ?', [vehicleId]);
                        console.log(`Deleted ${accessResult.affectedRows} access logs for vehicle ${vehicleId}`);
                    }
                } catch (err) {
                    console.error('Error deleting access logs:', err.message);
                }
            }

            // 4. Handle violations for these vehicles
            if (vehicleIds.length > 0) {
                try {
                    for (const vehicleId of vehicleIds) {
                        // Get all violation IDs first
                        const violationResults = await executeQuery('SELECT id FROM violations WHERE vehicle_id = ?', [vehicleId]);
                        const violationIds = violationResults.map(v => v.id);

                        if (violationIds.length > 0) {
                            console.log(`Found ${violationIds.length} violations for vehicle ${vehicleId}`);

                            // Use our new helper function for IN queries
                            // Delete violation contests
                            const contestsResult = await executeInQuery(
                                'DELETE FROM violation_contests WHERE violation_id IN ?',
                                violationIds
                            );
                            console.log(`Deleted ${contestsResult.affectedRows} violation contests`);

                            // Delete violation status history
                            const statusHistoryResult = await executeInQuery(
                                'DELETE FROM violation_status_history WHERE violation_id IN ?',
                                violationIds
                            );
                            console.log(`Deleted ${statusHistoryResult.affectedRows} violation status history records`);

                            // Delete violations
                            const violationDeleteResult = await executeInQuery(
                                'DELETE FROM violations WHERE id IN ?',
                                violationIds
                            );
                            console.log(`Deleted ${violationDeleteResult.affectedRows} violations`);
                        }
                    }
                } catch (err) {
                    console.error('Error handling violations:', err.message);
                }
            }

            // 5. Delete the vehicles
            try {
                const vehicleResult = await executeQuery('DELETE FROM vehicles WHERE usc_id = ?', [uscId]);
                console.log(`Deleted ${vehicleResult.affectedRows} vehicles with usc_id: ${uscId}`);
            } catch (err) {
                console.error('Error deleting vehicles:', err.message);
            }

            // 6. Handle user-specific records in other tables
            try {
                // Delete user notification preferences
                await executeQuery('DELETE FROM user_notification_preferences WHERE user_id = ?', [userId]);
                console.log('Deleted user notification preferences');
            } catch (err) {
                console.error('Error deleting notification preferences:', err.message);
            }

            // Handle violation_history records first
            try {
                // Get all violations associated with this user
                const violations = await executeQuery(
                    'SELECT id FROM violations WHERE reported_by = ? OR updated_by = ?',
                    [userId, userId]
                );
                const violationIds = violations.map(v => v.id);
                console.log(`Found ${violationIds.length} violations associated with user ${userId}`);

                // Find an admin user that's not being deleted to reassign records to
                const adminUser = await queryOne('SELECT id FROM users WHERE designation = "Admin" AND id != ? LIMIT 1', [userId]);

                if (!adminUser) {
                    throw new Error('No admin user found to reassign violation history records to');
                }
                console.log(`Will use admin user ID ${adminUser.id} for reassignment`);

                // Process each violation's history records
                if (violationIds.length > 0) {
                    if (violationIds.length === 1) {
                        // For a single violation
                        const historyCount = await executeQuery(
                            'SELECT COUNT(*) as count FROM violation_history WHERE violation_id = ? AND reported_by = ?',
                            [violationIds[0], userId]
                        );

                        if (historyCount[0].count > 0) {
                            // Reassign to admin
                            await executeQuery(
                                'UPDATE violation_history SET reported_by = ? WHERE violation_id = ? AND reported_by = ?',
                                [adminUser.id, violationIds[0], userId]
                            );
                            console.log(`Reassigned ${historyCount[0].count} violation history records for violation ${violationIds[0]}`);
                        }
                    } else {
                        // For multiple violations using our helper function
                        // Check if there are records to update
                        const historyCount = await executeInQuery(
                            'SELECT COUNT(*) as count FROM violation_history WHERE violation_id IN ? AND reported_by = ?',
                            violationIds,
                            [userId]
                        );

                        if (historyCount[0].count > 0) {
                            // Update all matching records
                            await executeInQuery(
                                'UPDATE violation_history SET reported_by = ? WHERE violation_id IN ? AND reported_by = ?',
                                violationIds,
                                [adminUser.id, userId]
                            );
                            console.log(`Reassigned ${historyCount[0].count} violation history records for ${violationIds.length} violations`);
                        }
                    }
                }

                // Direct update for all remaining reported_by references
                await executeQuery('UPDATE violation_history SET reported_by = ? WHERE reported_by = ?',
                    [adminUser.id, userId]
                );

                // Handle resolved_by (if it allows NULL)
                try {
                    await executeQuery('UPDATE violation_history SET resolved_by = NULL WHERE resolved_by = ?', [userId]);
                    console.log('Updated violation_history resolved_by to NULL');
                } catch (nullErr) {
                    // If NULL not allowed, reassign to admin
                    await executeQuery('UPDATE violation_history SET resolved_by = ? WHERE resolved_by = ?',
                        [adminUser.id, userId]
                    );
                    console.log('Updated violation_history resolved_by to admin user');
                }

                // Final verification
                const remainingReferences = await executeQuery(
                    'SELECT COUNT(*) as count FROM violation_history WHERE reported_by = ? OR resolved_by = ?',
                    [userId, userId]
                );

                if (remainingReferences[0].count > 0) {
                    console.log(`WARNING: Still found ${remainingReferences[0].count} references in violation_history`);
                } else {
                    console.log('Successfully updated all violation history records');
                }

            } catch (err) {
                console.error('Error handling violation_history:', err.message);
                throw err; // Rethrow to trigger rollback
            }

            try {
                // Update violations where this user is the reporter or updater
                // First, find an admin user to reassign (if needed)
                const adminUser = await queryOne('SELECT id FROM users WHERE designation = "Admin" AND id != ? LIMIT 1', [userId]);
                if (!adminUser) {
                    throw new Error('No admin user found to reassign violation records to');
                }

                // Get count of violations where user is the reporter
                const reporterCount = await executeQuery('SELECT COUNT(*) as count FROM violations WHERE reported_by = ?', [userId]);
                if (reporterCount[0].count > 0) {
                    console.log(`Found ${reporterCount[0].count} violations where user is the reporter`);

                    // reported_by likely doesn't allow NULL based on error messages, so reassign to admin
                    await executeQuery('UPDATE violations SET reported_by = ? WHERE reported_by = ?',
                        [adminUser.id, userId]
                    );
                    console.log(`Reassigned ${reporterCount[0].count} violations to admin user ID ${adminUser.id}`);
                }

                // Check if updated_by column exists and handle it
                try {
                    const updaterCount = await executeQuery('SELECT COUNT(*) as count FROM violations WHERE updated_by = ?', [userId]);
                    if (updaterCount[0].count > 0) {
                        console.log(`Found ${updaterCount[0].count} violations where user is the updater`);

                        // Try to set to NULL first (if column allows NULL)
                        try {
                            await executeQuery('UPDATE violations SET updated_by = NULL WHERE updated_by = ?', [userId]);
                            console.log(`Set updated_by to NULL for ${updaterCount[0].count} violations`);
                        } catch (nullErr) {
                            // If NULL not allowed, reassign to admin
                            await executeQuery('UPDATE violations SET updated_by = ? WHERE updated_by = ?',
                                [adminUser.id, userId]
                            );
                            console.log(`Reassigned updated_by to admin for ${updaterCount[0].count} violations`);
                        }
                    }
                } catch (columnErr) {
                    // updated_by column might not exist in this schema version
                    console.log('Note: updated_by column might not exist in violations table');
                }

                // Final verification
                const remainingReferences = await executeQuery(
                    'SELECT COUNT(*) as count FROM violations WHERE reported_by = ?',
                    [userId]
                );

                if (remainingReferences[0].count > 0) {
                    console.log(`WARNING: Still found ${remainingReferences[0].count} references in violations`);
                    throw new Error('Failed to reassign all violation references');
                } else {
                    console.log('Successfully updated all violation records');
                }
            } catch (err) {
                console.error('Error updating violations table:', err.message);
                throw err; // Rethrow to trigger rollback
            }

            try {
                // First, check if the table exists and the column allows NULL
                const adminUser = await queryOne('SELECT id FROM users WHERE designation = "Admin" AND id != ? LIMIT 1', [userId]);
                if (!adminUser) {
                    throw new Error('No admin user found to reassign violation status history records to');
                }

                // Get count of records to update
                const historyCount = await executeQuery(
                    'SELECT COUNT(*) as count FROM violation_status_history WHERE changed_by = ?',
                    [userId]
                );

                if (historyCount[0].count > 0) {
                    console.log(`Found ${historyCount[0].count} violation status history records to update`);

                    // Try setting to NULL first
                    try {
                        await executeQuery('UPDATE violation_status_history SET changed_by = NULL WHERE changed_by = ?', [userId]);
                        console.log(`Set changed_by to NULL for ${historyCount[0].count} status history records`);
                    } catch (nullErr) {
                        // If NULL not allowed, reassign to admin
                        await executeQuery('UPDATE violation_status_history SET changed_by = ? WHERE changed_by = ?',
                            [adminUser.id, userId]
                        );
                        console.log(`Reassigned ${historyCount[0].count} status history records to admin`);
                    }

                    // Verify the update
                    const remainingCount = await executeQuery(
                        'SELECT COUNT(*) as count FROM violation_status_history WHERE changed_by = ?',
                        [userId]
                    );

                    if (remainingCount[0].count > 0) {
                        console.log(`WARNING: Still found ${remainingCount[0].count} references in violation_status_history`);
                    } else {
                        console.log('Successfully updated all violation status history records');
                    }
                } else {
                    console.log('No violation status history records found for this user');
                }
            } catch (err) {
                console.error('Error updating violation_status_history:', err.message);
                throw err; // Rethrow to trigger rollback
            }

            try {
                // Handle violation_contests
                const adminUser = await queryOne('SELECT id FROM users WHERE designation = "Admin" AND id != ? LIMIT 1', [userId]);

                // First, check for contests reviewed by this user
                const reviewCount = await executeQuery(
                    'SELECT COUNT(*) as count FROM violation_contests WHERE reviewed_by = ?',
                    [userId]
                );

                if (reviewCount[0].count > 0) {
                    console.log(`Found ${reviewCount[0].count} violation contests reviewed by user ${userId}`);

                    // Try setting to NULL first
                    try {
                        await executeQuery('UPDATE violation_contests SET reviewed_by = NULL WHERE reviewed_by = ?', [userId]);
                        console.log(`Set reviewed_by to NULL for ${reviewCount[0].count} contests`);
                    } catch (nullErr) {
                        // If NULL not allowed, reassign to admin
                        if (!adminUser) {
                            throw new Error('No admin user found to reassign contest reviews to');
                        }
                        await executeQuery('UPDATE violation_contests SET reviewed_by = ? WHERE reviewed_by = ?',
                            [adminUser.id, userId]
                        );
                        console.log(`Reassigned ${reviewCount[0].count} contest reviews to admin user ${adminUser.id}`);
                    }
                }

                // Then delete any contests submitted by this user
                const contestCount = await executeQuery(
                    'SELECT COUNT(*) as count FROM violation_contests WHERE user_id = ?',
                    [userId]
                );

                if (contestCount[0].count > 0) {
                    console.log(`Found ${contestCount[0].count} violation contests submitted by user ${userId}`);
                    await executeQuery('DELETE FROM violation_contests WHERE user_id = ?', [userId]);
                    console.log(`Deleted ${contestCount[0].count} violation contests`);
                }

                // Final verification for reviewed_by
                const remainingReviews = await executeQuery(
                    'SELECT COUNT(*) as count FROM violation_contests WHERE reviewed_by = ?',
                    [userId]
                );

                if (remainingReviews[0].count > 0) {
                    console.log(`WARNING: Still found ${remainingReviews[0].count} reviews in violation_contests`);
                    throw new Error('Failed to clean up all contest review references');
                }
            } catch (err) {
                console.error('Error handling violation contests:', err.message);
                throw err; // Rethrow to trigger rollback
            }

            // 7. Delete user profile
            try {
                const profileResult = await executeQuery('DELETE FROM user_profiles WHERE usc_id = ?', [uscId]);
                console.log(`Deleted ${profileResult.affectedRows} profiles with usc_id: ${uscId}`);
            } catch (err) {
                console.error('Error deleting user profile:', err.message);
            }

            // Final check for any remaining references to this user
            try {
                console.log('Running final check for any remaining references to user...');

                // Find an admin user to reassign references to (if needed)
                const adminUser = await queryOne('SELECT id FROM users WHERE designation = "Admin" AND id != ? LIMIT 1', [userId]);
                if (!adminUser) {
                    throw new Error('No admin user found to reassign references to');
                }

                // Tables that might have references to the user
                const tables = [
                    'violation_history',
                    'violations',
                    'violation_status_history',
                    'violation_contests',
                    'user_notification_preferences',
                    // Add any other tables that might reference users
                ];

                // Columns that might reference users.id
                const possibleColumns = ['user_id', 'reported_by', 'changed_by', 'reviewed_by', 'updated_by', 'resolved_by'];

                // Gather information about existing tables and columns first
                const tablesAndColumns = [];

                // Find all tables and columns that exist and might reference our user
                const [tableResults] = await executeQuery(`
                    SELECT table_name, column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = DATABASE() 
                    AND table_name IN (${tables.map(() => '?').join(',')})
                    AND column_name IN (${possibleColumns.map(() => '?').join(',')})
                `, [...tables, ...possibleColumns]);

                if (tableResults && tableResults.length > 0) {
                    for (const row of tableResults) {
                        tablesAndColumns.push({
                            table: row.table_name,
                            column: row.column_name
                        });
                    }
                }

                console.log(`Found ${tablesAndColumns.length} potential reference points to check`);

                // Check each table and column combination that exists
                for (const { table, column } of tablesAndColumns) {
                    try {
                        // Check if there are any references to our user
                        const [refCount] = await executeQuery(
                            `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = ?`,
                            [userId]
                        );

                        if (refCount && refCount.count > 0) {
                            console.log(`Found ${refCount.count} references to user ${userId} in ${table}.${column}`);

                            // Try to set to NULL first
                            try {
                                await executeQuery(`UPDATE ${table} SET ${column} = NULL WHERE ${column} = ?`, [userId]);
                                console.log(`Set ${refCount.count} references in ${table}.${column} to NULL`);
                            } catch (nullErr) {
                                // If NULL not allowed, try to reassign to admin
                                try {
                                    await executeQuery(`UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`, [adminUser.id, userId]);
                                    console.log(`Reassigned ${refCount.count} references in ${table}.${column} to admin`);
                                } catch (updateErr) {
                                    // If all else fails, try to delete the records
                                    await executeQuery(`DELETE FROM ${table} WHERE ${column} = ?`, [userId]);
                                    console.log(`Deleted ${refCount.count} records from ${table} with ${column}=${userId}`);
                                }
                            }

                            // Verify the update worked
                            const [verifyCount] = await executeQuery(
                                `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = ?`,
                                [userId]
                            );

                            if (verifyCount && verifyCount.count > 0) {
                                console.log(`WARNING: Still found ${verifyCount.count} references in ${table}.${column}`);
                                throw new Error(`Failed to clean up references in ${table}.${column}`);
                            }
                        }
                    } catch (err) {
                        if (err.message.includes('Failed to clean up references')) {
                            throw err; // Rethrow our custom error to trigger rollback
                        }
                        console.error(`Error processing ${table}.${column}:`, err.message);
                        // Continue with other tables/columns
                    }
                }

                console.log('Completed final reference check. All references cleaned up.');
            } catch (err) {
                console.error('Error checking for remaining references:', err.message);
                throw err; // Rethrow to trigger rollback
            }

            // 8. Delete the user record - this is critical and should fail if it can't be done
            const userResult = await executeQuery('DELETE FROM users WHERE id = ?', [userId]);

            if (userResult.affectedRows === 0) {
                throw new Error('Failed to delete user');
            }

            console.log(`User ${userId} with USC ID ${uscId} successfully deleted`);


            // Commit the transaction
            await executeDirectQuery('COMMIT');

            return Response.json({
                success: true,
                message: 'User and all associated data deleted successfully'
            });
        } catch (error) {
            // Rollback in case of any error
            console.error('Transaction error details:', {
                message: error.message,
                code: error.code,
                errno: error.errno,
                sqlState: error.sqlState,
                sqlMessage: error.sqlMessage,
                sql: error.sql
            });

            await executeDirectQuery('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Delete user error:', error);
        // Include more detailed error info if available
        if (error.sqlMessage) {
            console.error('SQL Error:', {
                message: error.message,
                code: error.code,
                errno: error.errno,
                sqlState: error.sqlState,
                sqlMessage: error.sqlMessage,
                sql: error.sql
            });
        }

        return Response.json(
            { error: 'Failed to delete user: ' + (error.sqlMessage || error.message) },
            { status: 500 }
        );
    }
}
