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

        // Hash once for the entire batch
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const client = await getClient();
        const results = { success: 0, failed: 0, errors: [] as string[] };

        try {
            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);

                try {
                    await client.query('BEGIN');

                    for (const user of batch) {
                        if (!user.email || !user.firstName || !user.lastName) {
                            results.failed++;
                            continue;
                        }

                        const userId = uuidv4();
                        await client.query(
                            `INSERT INTO users (id, email, password_hash, first_name, last_name, display_name, college_name, college_mail_id, branch, roll_no, is_registered, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, NOW(), NOW())
               ON CONFLICT (email) DO NOTHING`,
                            [
                                userId,
                                user.email.toLowerCase().trim(),
                                passwordHash,
                                user.firstName.trim(),
                                user.lastName.trim(),
                                `${user.firstName.trim()} ${user.lastName.trim()}`,
                                user.collegeName?.trim() || null,
                                user.collegeMailId?.trim() || null,
                                user.branch?.trim() || null,
                                user.rollNo?.trim() || null
                            ]
                        );
                        results.success++;
                    }

                    await client.query('COMMIT');
                } catch (err) {
                    await client.query('ROLLBACK');
                    results.failed += batch.length;
                    results.errors.push(`Batch failed: ${err}`);
                }
            }
        } finally {
            client.release();
        }

        return NextResponse.json({ message: 'Completed', stats: results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
