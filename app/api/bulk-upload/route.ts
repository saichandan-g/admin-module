import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
    try {
        const { users, defaultPassword } = await request.json();

        if (!users?.length || !defaultPassword) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        // Validate mandatory user fields before processing any batches
        for (const user of users) {
            if (!user.email || !user.firstName || !user.lastName || !user.phoneNumber) {
                return NextResponse.json(
                    { error: 'Invalid user data: email, firstName, lastName, and phoneNumber are required for all users.' },
                    { status: 400 }
                );
            }
        }

        // Hash once for the entire batch
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const client = await getClient();
        const results = { success: 0, failed: 0, errors: [] as string[], skipped: 0 };

        try {
            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);

                for (const user of batch) {
                    try {
                        const userId = uuidv4();

                        const result = await client.query(
                            `INSERT INTO users (id, email, password_hash, first_name, last_name, display_name, phone_number, college_name, college_mail_id, branch, roll_no, is_pro, is_registered, created_at, updated_at)` +
                            ` VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, NOW(), NOW())` +
                            ` ON CONFLICT (email) DO NOTHING`,
                            [
                                userId,
                                user.email.toLowerCase().trim(),
                                passwordHash,
                                user.firstName.trim(),
                                user.lastName.trim(),
                                `${user.firstName.trim()} ${user.lastName.trim()}`,
                                user.phoneNumber.trim(),
                                user.collegeName?.trim() || null,
                                user.collegeMailId?.trim() || null,
                                user.branch?.trim() || null,
                                user.rollNo?.trim() || null
                            ]
                        );

                        if ((result.rowCount ?? 0) > 0) {
                            results.success++;
                        } else {
                            // User already exists (ON CONFLICT skipped the insert)
                            results.skipped++;
                        }
                    } catch (err: unknown) {
                        results.failed++;
                        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                        results.errors.push(`Email ${user.email}: ${errorMessage}`);
                    }
                }
            }
        } finally {
            client.release();
        }

        return NextResponse.json({ message: 'Upload Complete', stats: results });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
