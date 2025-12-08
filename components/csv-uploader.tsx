'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Upload, FileText, Loader2 } from 'lucide-react';

export default function CsvUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFile(acceptedFiles[0]);
        setStatus(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        maxFiles: 1,
    });

    const handleUpload = () => {
        if (!file) return;
        setUploading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const users = results.data.map((row: any) => ({
                    email: row.email,
                    firstName: row.firstName || row.first_name, // Handle both cases
                    lastName: row.lastName || row.last_name,
                    collegeName: row.collegeName || row.college_name,
                    collegeMailId: row.collegeMailId || row.college_mail_id,
                    branch: row.branch,
                }));

                try {
                    const res = await fetch('/api/bulk-upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ users, defaultPassword: 'Student@123' }),
                    });

                    const data = await res.json();
                    setStatus(data);
                } catch (err) {
                    setStatus({ error: 'Upload failed' });
                } finally {
                    setUploading(false);
                }
            }
        });
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border">
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
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            )}

            {status && (
                <div className={`mt-4 p-3 rounded text-sm ${status.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {status.error ? (
                        <p>Error: {status.error}</p>
                    ) : (
                        <>
                            <p className="font-semibold">Upload Complete</p>
                            <p>Success: {status.stats?.success || 0}</p>
                            <p>Failed: {status.stats?.failed || 0}</p>
                            {status.stats?.errors?.length > 0 && (
                                <div className="mt-2 text-xs text-red-600 max-h-32 overflow-y-auto">
                                    <p className="font-semibold">Errors:</p>
                                    <ul className="list-disc list-inside">
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
