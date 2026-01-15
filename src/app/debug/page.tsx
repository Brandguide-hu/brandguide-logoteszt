'use client';

import { useState } from 'react';

interface DebugLog {
  timestamp: string;
  step: string;
  type: 'input' | 'output';
  data: string;
}

export default function DebugPage() {
  const [logo, setLogo] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/png');
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  const runDebugAnalysis = async () => {
    if (!logo) return;

    setIsLoading(true);
    setLogs([]);
    setError(null);

    try {
      const response = await fetch('/api/analyze/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo, mediaType }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      }

      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🔧 Debug Mode - brandguideAI</h1>

      <div className="mb-8">
        <label className="block mb-2 text-lg">Logó feltöltése:</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
        {logo && (
          <div className="mt-4">
            <img
              src={`data:${mediaType};base64,${logo}`}
              alt="Logo preview"
              className="max-w-xs border border-gray-600 rounded"
            />
          </div>
        )}
      </div>

      <button
        onClick={runDebugAnalysis}
        disabled={!logo || isLoading}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded font-bold text-lg mb-8"
      >
        {isLoading ? '⏳ Elemzés folyamatban...' : '🚀 Debug elemzés indítása'}
      </button>

      {error && (
        <div className="bg-red-900 border border-red-600 p-4 rounded mb-8">
          <h3 className="font-bold text-red-400">❌ Hiba:</h3>
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}

      <div className="space-y-6">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`border rounded p-4 ${
              log.type === 'input'
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-green-500 bg-green-900/30'
            }`}
          >
            <div className="flex items-center gap-4 mb-2">
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${
                  log.type === 'input' ? 'bg-blue-600' : 'bg-green-600'
                }`}
              >
                {log.type === 'input' ? '📤 INPUT' : '📥 OUTPUT'}
              </span>
              <span className="font-bold text-lg">{log.step}</span>
              <span className="text-gray-400 text-sm">{log.timestamp}</span>
            </div>
            <pre className="whitespace-pre-wrap text-sm bg-black/50 p-4 rounded overflow-x-auto max-h-96 overflow-y-auto">
              {log.data}
            </pre>
            <div className="mt-2 text-gray-400 text-sm">
              Hossz: {log.data.length} karakter
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
