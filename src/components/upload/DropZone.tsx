'use client';

import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn, validateFile } from '@/lib/utils';

interface DropZoneProps {
  onFileSelect: (file: File | null) => void;
  file: File | null;
}

export function DropZone({ onFileSelect, file }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (selectedFile: File) => {
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        setError(validation.error || 'Érvénytelen fájl');
        return;
      }

      setError(null);
      onFileSelect(selectedFile);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    onFileSelect(null);
    setPreview(null);
    setError(null);
  }, [onFileSelect]);

  return (
    <div className="w-full">
      {!file ? (
        <label
          className={cn(
            'flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200',
            isDragging
              ? 'border-accent-yellow bg-highlight-yellow'
              : 'border-bg-tertiary bg-bg-secondary hover:bg-bg-tertiary hover:border-text-muted'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div
              className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors',
                isDragging ? 'bg-accent-yellow' : 'bg-bg-tertiary'
              )}
            >
              <Upload
                className={cn(
                  'w-8 h-8 transition-colors',
                  isDragging ? 'text-white' : 'text-text-muted'
                )}
              />
            </div>
            <p className="mb-2 text-lg font-medium text-text-primary">
              {isDragging ? 'Engedd el a fájlt!' : 'Húzd ide a logódat'}
            </p>
            <p className="text-sm text-text-secondary">
              vagy <span className="text-accent-yellow font-medium">kattints a tallózáshoz</span>
            </p>
            <p className="mt-2 text-xs text-text-muted">
              PNG, JPG, WebP (max 5MB)
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleInputChange}
          />
        </label>
      ) : (
        <div className="relative w-full h-64 bg-bg-secondary rounded-xl border border-bg-tertiary overflow-hidden">
          {preview && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src={preview}
                alt="Logó előnézet"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <button
            onClick={handleRemove}
            className="absolute top-3 right-3 w-8 h-8 bg-error text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-2">
            <ImageIcon className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-primary truncate">{file.name}</span>
            <span className="text-xs text-text-muted ml-auto">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
