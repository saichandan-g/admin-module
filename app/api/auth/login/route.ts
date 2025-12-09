import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const client = await getClient();
        try {
            const result = await client.query(
                'SELECT id, email, password_hash, role FROM users WHERE email = $1',
                [email.toLowerCase().trim()]
            );

            if (result.rows.length === 0) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            const user = result.rows[0];

            // Verify password
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            // Create JWT
            const token = await new SignJWT({ userId: user.id, email: user.email, role: user.role })
                .setProtectedHeader({ alg: 'HS256' })
                .setExpirationTime('24h')
                .sign(new TextEncoder().encode(JWT_SECRET));

            // Set cookie
            const response = NextResponse.json({ success: true });
            response.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24, // 24 hours
                path: '/',
            });

            return response;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
