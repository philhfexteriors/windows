'use client';

import SpreadsheetUpload from '@/components/SpreadsheetUpload';

export default function UploadPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#9D2235]">
          H&F Exteriors
        </h1>
        <p className="text-lg text-gray-600">Upload Window Measurements</p>
        <a
          href="/"
          className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Measurement App
        </a>
      </header>

      <SpreadsheetUpload />
    </div>
  );
}
