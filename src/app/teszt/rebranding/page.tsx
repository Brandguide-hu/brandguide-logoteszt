"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Lightbulb05, CheckCircle, AlertCircle, RefreshCw05 } from "@untitledui/icons";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { fileToBase64, getMediaType } from "@/lib/utils";

type Phase = "start" | "analyzing_old" | "analyzing_new" | "comparing" | "saving" | "complete";

const phaseProgress: Record<Phase, number> = {
    start: 5,
    analyzing_old: 25,
    analyzing_new: 50,
    comparing: 75,
    saving: 90,
    complete: 100,
};

const phaseLabels: Record<Phase, string> = {
    start: "Indítás",
    analyzing_old: "Régi logó elemzése",
    analyzing_new: "Új logó elemzése",
    comparing: "Összehasonlítás",
    saving: "Mentés",
    complete: "Kész",
};

export default function RebrandingTestPage() {
    const router = useRouter();
    const [oldLogo, setOldLogo] = useState<File | null>(null);
    const [newLogo, setNewLogo] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [streamingStatus, setStreamingStatus] = useState("");
    const [streamingPhase, setStreamingPhase] = useState<Phase>("start");

    const handleOldLogoSelect = useCallback((files: FileList) => {
        if (files.length > 0) {
            setOldLogo(files[0]);
            setError(null);
        }
    }, []);

    const handleNewLogoSelect = useCallback((files: FileList) => {
        if (files.length > 0) {
            setNewLogo(files[0]);
            setError(null);
        }
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!oldLogo || !newLogo) {
            setError("Kérlek töltsd fel mindkét logót!");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setStreamingStatus("Elemzés indítása...");
        setStreamingPhase("start");

        try {
            const [oldBase64, newBase64] = await Promise.all([
                fileToBase64(oldLogo),
                fileToBase64(newLogo),
            ]);
            const oldMediaType = getMediaType(oldLogo);
            const newMediaType = getMediaType(newLogo);

            const response = await fetch("/api/analyze/rebranding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    oldLogo: oldBase64,
                    oldMediaType,
                    newLogo: newBase64,
                    newMediaType,
                }),
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType?.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Hiba történt az elemzés során");
                }
                throw new Error("Hiba történt az elemzés során");
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Nem sikerült olvasni a választ");
            }

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                let currentEvent = "";
                for (const line of lines) {
                    if (line.startsWith("event: ")) {
                        currentEvent = line.slice(7);
                    } else if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        try {
                            const parsed = JSON.parse(data);

                            switch (currentEvent) {
                                case "status":
                                    setStreamingStatus(parsed.message);
                                    setStreamingPhase(parsed.phase as Phase);
                                    break;
                                case "complete":
                                    setStreamingPhase("complete");
                                    setStreamingStatus("Kész!");
                                    setTimeout(() => {
                                        router.push(`/eredmeny/rebranding/${parsed.id}`);
                                    }, 500);
                                    break;
                                case "error":
                                    throw new Error(parsed.message);
                            }
                        } catch (e) {
                            if (e instanceof SyntaxError) {
                                console.warn("Failed to parse SSE data:", data);
                            } else {
                                throw e;
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Analysis error:", err);
            setError(err instanceof Error ? err.message : "Ismeretlen hiba történt");
            setIsSubmitting(false);
        }
    }, [oldLogo, newLogo, router]);

    // Loading state
    if (isSubmitting) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4">
                <div className="w-full max-w-lg text-center">
                    {/* Dual logo preview */}
                    <div className="mx-auto mb-8 flex items-center justify-center gap-6">
                        {oldLogo && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex size-20 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    <img
                                        src={URL.createObjectURL(oldLogo)}
                                        alt="Régi logó"
                                        className="max-h-full max-w-full object-contain opacity-50"
                                    />
                                </div>
                                <span className="text-xs text-gray-400">Régi</span>
                            </div>
                        )}

                        <div className="flex size-10 items-center justify-center rounded-full bg-gray-100">
                            <ArrowRight className="size-5 text-gray-400" />
                        </div>

                        {newLogo && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex size-20 items-center justify-center rounded-xl border-2 border-[#fff012] bg-[#fff012]/10 p-3">
                                    <img
                                        src={URL.createObjectURL(newLogo)}
                                        alt="Új logó"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                                <span className="text-xs font-medium text-gray-900">Új</span>
                            </div>
                        )}
                    </div>

                    {/* Status text */}
                    <p className="mb-6 text-lg text-gray-900">{streamingStatus}</p>

                    {/* Progress bar */}
                    <div className="mb-8">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                                className="h-full bg-[#fff012] transition-all duration-500 ease-out"
                                style={{ width: `${phaseProgress[streamingPhase]}%` }}
                            />
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-gray-400">
                            <span>{phaseProgress[streamingPhase]}%</span>
                            <span>{phaseLabels[streamingPhase]}</span>
                        </div>
                    </div>

                    {/* Phase steps */}
                    <div className="flex justify-center gap-2">
                        {(["start", "analyzing_old", "analyzing_new", "comparing", "saving"] as Phase[]).map((phase, index) => {
                            const isActive = streamingPhase === phase;
                            const isComplete = phaseProgress[streamingPhase] > phaseProgress[phase];
                            return (
                                <div
                                    key={phase}
                                    className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                                        isComplete
                                            ? "bg-[#fff012] text-gray-900"
                                            : isActive
                                              ? "bg-gray-900 text-white"
                                              : "bg-gray-100 text-gray-400"
                                    }`}
                                >
                                    {isComplete ? (
                                        <CheckCircle className="size-3.5" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-4xl items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-900"
                    >
                        <ArrowLeft className="size-4" />
                        Vissza
                    </Link>
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                        Rebranding teszt
                    </span>
                </div>
            </div>

            <div className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    {/* Page header */}
                    <div className="mb-12 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]">
                        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gray-50">
                            <RefreshCw05 className="size-8 text-gray-400" />
                        </div>
                        <h1 className="mb-3 text-3xl font-light text-gray-900 md:text-4xl">
                            Rebranding teszt
                        </h1>
                        <p className="text-gray-500">
                            Hasonlítsd össze a régi és az új logódat objektív szempontok alapján
                        </p>
                    </div>

                    {/* Dual upload */}
                    <div
                        className="mb-8 grid gap-6 md:grid-cols-2 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                        style={{ animationDelay: "0.1s" }}
                    >
                        {/* Old Logo */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-500">
                                    1
                                </span>
                                <div>
                                    <h2 className="font-medium text-gray-900">Régi logó</h2>
                                    <p className="text-xs text-gray-400">A jelenlegi vagy korábbi verzió</p>
                                </div>
                            </div>

                            <FileUpload.Root>
                                <FileUpload.DropZone
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    allowsMultiple={false}
                                    maxSize={5 * 1024 * 1024}
                                    hint="PNG, JPG, WebP vagy SVG"
                                    onDropFiles={handleOldLogoSelect}
                                    onDropUnacceptedFiles={() => setError("Csak képfájlokat fogadunk el")}
                                    onSizeLimitExceed={() => setError("Max. 5MB")}
                                />
                            </FileUpload.Root>

                            {oldLogo && (
                                <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={URL.createObjectURL(oldLogo)}
                                            alt="Régi logó"
                                            className="size-12 rounded object-contain"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{oldLogo.name}</p>
                                            <p className="text-xs text-gray-400">{(oldLogo.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setOldLogo(null)}
                                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                    >
                                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* New Logo */}
                        <div className="rounded-2xl border-2 border-[#fff012]/30 bg-white p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-full bg-[#fff012] text-sm font-medium text-gray-900">
                                    2
                                </span>
                                <div>
                                    <h2 className="font-medium text-gray-900">Új logó</h2>
                                    <p className="text-xs text-gray-400">Az új vagy tervezett verzió</p>
                                </div>
                            </div>

                            <FileUpload.Root>
                                <FileUpload.DropZone
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    allowsMultiple={false}
                                    maxSize={5 * 1024 * 1024}
                                    hint="PNG, JPG, WebP vagy SVG"
                                    onDropFiles={handleNewLogoSelect}
                                    onDropUnacceptedFiles={() => setError("Csak képfájlokat fogadunk el")}
                                    onSizeLimitExceed={() => setError("Max. 5MB")}
                                />
                            </FileUpload.Root>

                            {newLogo && (
                                <div className="mt-4 flex items-center justify-between rounded-lg border border-[#fff012]/30 bg-[#fff012]/10 p-3">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={URL.createObjectURL(newLogo)}
                                            alt="Új logó"
                                            className="size-12 rounded object-contain"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{newLogo.name}</p>
                                            <p className="text-xs text-gray-400">{(newLogo.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setNewLogo(null)}
                                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#fff012]/20 hover:text-gray-900"
                                    >
                                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview comparison */}
                    {oldLogo && newLogo && (
                        <div
                            className="mb-8 rounded-2xl border border-gray-100 bg-gray-50/50 p-8 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                            style={{ animationDelay: "0.2s" }}
                        >
                            <p className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-gray-400">
                                Előnézet
                            </p>
                            <div className="flex items-center justify-center gap-8">
                                <div className="text-center">
                                    <div className="mb-3 inline-flex size-24 items-center justify-center rounded-xl border border-gray-200 bg-white p-4">
                                        <img
                                            src={URL.createObjectURL(oldLogo)}
                                            alt="Régi"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400">Régi</p>
                                </div>

                                <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-sm">
                                    <ArrowRight className="size-6 text-[#fff012]" />
                                </div>

                                <div className="text-center">
                                    <div className="mb-3 inline-flex size-24 items-center justify-center rounded-xl border-2 border-[#fff012] bg-white p-4">
                                        <img
                                            src={URL.createObjectURL(newLogo)}
                                            alt="Új"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                    <p className="text-xs font-medium text-gray-900">Új</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                            <AlertCircle className="size-5 shrink-0 text-red-500" />
                            <div>
                                <p className="font-medium text-red-900">Hiba történt</p>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div
                        className="text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                        style={{ animationDelay: "0.3s" }}
                    >
                        <button
                            onClick={handleSubmit}
                            disabled={!oldLogo || !newLogo}
                            className={`group inline-flex items-center gap-3 rounded-full px-10 py-4 text-base font-medium transition-all duration-300 ${
                                oldLogo && newLogo
                                    ? "bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg"
                                    : "cursor-not-allowed bg-gray-100 text-gray-400"
                            }`}
                        >
                            Összehasonlítás indítása
                            <RefreshCw05 className={`size-5 transition-transform duration-300 ${oldLogo && newLogo ? "group-hover:rotate-180" : ""}`} />
                        </button>

                        {(!oldLogo || !newLogo) && (
                            <p className="mt-4 text-sm text-gray-400">
                                {!oldLogo && !newLogo
                                    ? "Töltsd fel mindkét logót az indításhoz"
                                    : !oldLogo
                                      ? "Töltsd fel a régi logót"
                                      : "Töltsd fel az új logót"}
                            </p>
                        )}
                    </div>

                    {/* Tip */}
                    <div
                        className="mt-12 flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                        style={{ animationDelay: "0.4s" }}
                    >
                        <div className="rounded-lg bg-[#fff012]/30 p-1.5">
                            <Lightbulb05 className="size-4 text-gray-700" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Mit fogsz kapni?</p>
                            <p className="text-sm text-gray-500">
                                Kritériumonkénti összehasonlítás, radar chart vizualizáció, sikerességi mutató,
                                és célzott javaslatok az új logó további fejlesztéséhez.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global animations */}
            <style jsx global>{`
                @keyframes fadeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
