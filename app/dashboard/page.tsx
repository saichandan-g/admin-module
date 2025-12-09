'use client';

import CsvUploader from '@/components/csv-uploader';

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Bulk User Admin</h1>

        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload Users (CSV)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Required columns: email, firstName, lastName. <br />
            Optional: collegeName, collegeMailId, branch.
          </p>
          <CsvUploader />
        </div>
      </div>
    </main>
  );
}
