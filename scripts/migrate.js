const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database');

        const query = `
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS college_name text,
      ADD COLUMN IF NOT EXISTS college_mail_id text,
      ADD COLUMN IF NOT EXISTS branch text;
    `;

        await client.query(query);
        console.log('Schema updated successfully');
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await client.end();
    }
}

migrate();
