"use client";

import { useCallback, useState } from "react";
import { Upload01, XClose, Image01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { validateFile } from "@/lib/utils";

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
                setError(validation.error || "Érvénytelen fájl");
                return;
            }

            setError(null);
            onFileSelect(selectedFile);

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
                    className={cx(
                        "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
                        isDragging
                            ? "border-brand-500 bg-brand-50"
                            : "border-secondary bg-secondary hover:bg-tertiary hover:border-tertiary"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div
                            className={cx(
                                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                                isDragging ? "bg-brand-500" : "bg-tertiary"
                            )}
                        >
                            <Upload01
                                className={cx("w-8 h-8 transition-colors", isDragging ? "text-white" : "text-quaternary")}
                            />
                        </div>
                        <p className="mb-2 text-lg font-medium text-primary">
                            {isDragging ? "Engedd el a fájlt!" : "Húzd ide a logódat"}
                        </p>
                        <p className="text-sm text-secondary">
                            vagy <span className="text-brand-600 font-medium">kattints a tallózáshoz</span>
                        </p>
                        <p className="mt-2 text-xs text-tertiary">PNG, JPG, WebP (max 5MB)</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleInputChange}
                    />
                </label>
            ) : (
                <div className="relative w-full h-64 bg-secondary rounded-xl border border-secondary overflow-hidden">
                    {preview && (
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <img src={preview} alt="Logó előnézet" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    <button
                        onClick={handleRemove}
                        className="absolute top-3 right-3 w-8 h-8 bg-error-500 text-white rounded-full flex items-center justify-center hover:bg-error-600 transition-colors shadow-lg"
                    >
                        <XClose className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-2">
                        <Image01 className="w-4 h-4 text-quaternary" />
                        <span className="text-sm text-primary truncate">{file.name}</span>
                        <span className="text-xs text-tertiary ml-auto">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                </div>
            )}

            {error && <div className="mt-3 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-600">{error}</div>}
        </div>
    );
}
