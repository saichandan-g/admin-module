'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';

interface UploadStatus {
    message?: string;
    error?: string;
    stats?: {
        success: number;
        failed: number;
        skipped: number;
        errors: string[];
    };
}

interface CsvRow {
    // camelCase format
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    collegeName?: string;
    collegeMailId?: string;
    branch?: string;
    rollNo?: string;
    // snake_case format
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    college_name?: string;
    college_mail_id?: string;
    roll_no?: string;
    // Google Form format (title case with spaces)
    'Email Address'?: string;
    'First Name'?: string;
    'Last Name'?: string;
    'Phone Number'?: string;
    'College Name'?: string;
    'College Mail ID'?: string;
    'Branch'?: string;
    'Roll No'?: string;
    [key: string]: string | undefined;
}

export default function CsvUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<UploadStatus | null>(null);
    const [uploading, setUploading] = useState(false);
    const [validationError, setValidationError] = useState<string>('');

    const processFile = useCallback((fileToProcess: File) => {
        setFile(fileToProcess);
        setStatus(null);
        setValidationError('');
        setUploading(true);

        Papa.parse(fileToProcess, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                // Validate CSV data
                const invalidRows = [];
                const users = [];

                for (let i = 0; i < results.data.length; i++) {
                    const row = results.data[i] as CsvRow;
                    // Support camelCase, snake_case, and Google Form (title case) headers
                    const email = row.email?.trim() || row['Email Address']?.trim();
                    const firstName = row.firstName?.trim() || row.first_name?.trim() || row['First Name']?.trim();
                    const lastName = row.lastName?.trim() || row.last_name?.trim() || row['Last Name']?.trim();
                    const phoneNumber = row.phoneNumber?.trim() || row.phone_number?.trim() || row['Phone Number']?.trim();

                    if (!email || !firstName || !lastName || !phoneNumber) {
                        invalidRows.push(i + 2); // +2 because row 1 is header, 0-indexed
                        continue;
                    }

                    users.push({
                        email,
                        firstName,
                        lastName,
                        phoneNumber,
                        collegeName: row.collegeName?.trim() || row.college_name?.trim() || row['College Name']?.trim() || null,
                        collegeMailId: row.collegeMailId?.trim() || row.college_mail_id?.trim() || row['College Mail ID']?.trim() || null,
                        branch: row.branch?.trim() || row.Branch?.trim() || null,
                        rollNo: row.rollNo?.trim() || row.roll_no?.trim() || row['Roll No']?.trim() || null,
                    });
                }

                if (invalidRows.length > 0) {
                    setValidationError(
                        `Missing required fields in rows: ${invalidRows.join(', ')}. Required: email, firstName, lastName, phoneNumber`
                    );
                    setUploading(false);
                    return;
                }

                if (users.length === 0) {
                    setValidationError('No valid users found in CSV');
                    setUploading(false);
                    return;
                }

                try {
                    const res = await fetch('/api/bulk-upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ users, defaultPassword: 'Student@123' }),
                    });

                    const data = await res.json();
                    setStatus(data);
                } catch {
                    setStatus({ error: 'Upload failed: Network error' });
                } finally {
                    setUploading(false);
                }
            }
        });
    }, []);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            processFile(acceptedFiles[0]);
        }
    }, [processFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        maxFiles: 1,
    });

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border">
            {/* CSV Format Requirements */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements</h3>
                <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-2">Required columns:</p>
                    <ul className="list-disc list-inside mb-3 space-y-1">
                        <li><span className="font-mono">email</span></li>
                        <li><span className="font-mono">firstName</span> (or <span className="font-mono">first_name</span>)</li>
                        <li><span className="font-mono">lastName</span> (or <span className="font-mono">last_name</span>)</li>
                        <li><span className="font-mono">phoneNumber</span> (or <span className="font-mono">phone_number</span>)</li>
                    </ul>
                    {/* <p className="font-semibold mb-2">Optional columns:</p> */}
                    <ul className="list-disc list-inside mb-3 space-y-1">

                        <li><span className="font-mono">collegeName</span> (or <span className="font-mono">college_name</span>)</li>
                        <li><span className="font-mono">collegeMailId</span> (or <span className="font-mono">college_mail_id</span>)</li>
                        <li><span className="font-mono">branch</span></li>
                        <li><span className="font-mono">rollNo</span> (or <span className="font-mono">roll_no</span>)</li>
                    </ul>
                </div>
            </div>

            <div
                {...getRootProps()}
                className={`border-2 border-dashed p-8 text-center rounded-lg cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}`}
            >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                    {isDragActive ? 'Drop the CSV here...' : 'Drag & drop CSV or click to select'}
                </p>
            </div>

            {file && (
                <div className="mt-4 flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{file.name}</span>
                    </div>
                    {uploading && (
                        <div className="flex items-center gap-2 text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Uploading...</span>
                        </div>
                    )}
                </div>
            )}

            {validationError && (
                <div className="mt-4 p-3 rounded text-sm bg-red-50 text-red-700 flex gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                </div>
            )}

            {status && (
                <div className={`mt-4 p-4 rounded text-sm ${status.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {status.error ? (
                        <p>Error: {status.error}</p>
                    ) : (
                        <>
                            <p className="font-semibold text-lg mb-2">{status.message}</p>
                            <div className="grid grid-cols-3 gap-4 mb-3">
                                <div className="p-2 bg-green-100 rounded text-green-800">
                                    <p className="text-xs font-semibold">Success</p>
                                    <p className="text-lg font-bold">{status.stats?.success || 0}</p>
                                </div>
                                <div className="p-2 bg-yellow-100 rounded text-yellow-800">
                                    <p className="text-xs font-semibold">Skipped</p>
                                    <p className="text-lg font-bold">{status.stats?.skipped || 0}</p>
                                </div>
                                <div className="p-2 bg-red-100 rounded text-red-800">
                                    <p className="text-xs font-semibold">Failed</p>
                                    <p className="text-lg font-bold">{status.stats?.failed || 0}</p>
                                </div>
                            </div>
                            {(status.stats?.errors?.length ?? 0) > 0 && status.stats && (
                                <div className="mt-3 text-xs text-red-600 max-h-40 overflow-y-auto bg-red-100 p-2 rounded">
                                    <p className="font-semibold">Errors:</p>
                                    <ul className="list-disc list-inside mt-1">
                                        {status.stats.errors.map((err: string, i: number) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
