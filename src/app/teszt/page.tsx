"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Lightbulb05, CheckCircle, AlertCircle, Upload01, Stars01, BarChart01 } from "@untitledui/icons";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LevelSelector, ColorPicker } from "@/components/upload";
import { TestLevel } from "@/types";
import { fileToBase64, getMediaType } from "@/lib/utils";

type Phase = "start" | "analyzing" | "processing" | "saving" | "complete";

const phaseProgress: Record<Phase, number> = {
    start: 10,
    analyzing: 40,
    processing: 70,
    saving: 90,
    complete: 100,
};

const phaseLabels: Record<Phase, string> = {
    start: "Indítás",
    analyzing: "Elemzés",
    processing: "Feldolgozás",
    saving: "Mentés",
    complete: "Kész",
};

export default function TestPage() {
    const router = useRouter();
    const [testLevel, setTestLevel] = useState<TestLevel>("detailed");
    const [logo, setLogo] = useState<File | null>(null);
    const [colors, setColors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [streamingStatus, setStreamingStatus] = useState("");
    const [streamingPhase, setStreamingPhase] = useState<Phase>("start");
    const [streamingText, setStreamingText] = useState("");

    const handleFileSelect = useCallback((files: FileList) => {
        if (files.length > 0) {
            setLogo(files[0]);
            setError(null);
        }
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!logo) {
            setError("Kérlek töltsd fel a logódat!");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setStreamingText("");
        setStreamingStatus("Elemzés indítása...");
        setStreamingPhase("start");

        try {
            const base64 = await fileToBase64(logo);
            const mediaType = getMediaType(logo);

            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    logo: base64,
                    mediaType,
                    testLevel,
                    colors: testLevel !== "basic" ? colors : undefined,
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
                                case "chunk":
                                    setStreamingText((prev) => prev + parsed.text);
                                    break;
                                case "complete":
                                    setStreamingPhase("complete");
                                    setStreamingStatus("Kész!");
                                    setTimeout(() => {
                                        router.push(`/eredmeny/${parsed.id}`);
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
    }, [logo, testLevel, colors, router]);

    // Loading state - soft minimal style
    if (isSubmitting) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4">
                <div className="w-full max-w-md text-center">
                    {/* Animated logo preview */}
                    {logo && (
                        <div className="mx-auto mb-8 flex size-24 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <img
                                src={URL.createObjectURL(logo)}
                                alt="Logo"
                                className="max-h-full max-w-full object-contain opacity-0 animate-[fadeIn_0.5s_ease_forwards]"
                            />
                        </div>
                    )}

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
                    <div className="flex justify-center gap-3">
                        {(["start", "analyzing", "processing", "saving"] as Phase[]).map((phase, index) => {
                            const isActive = streamingPhase === phase;
                            const isComplete = phaseProgress[streamingPhase] > phaseProgress[phase];
                            return (
                                <div
                                    key={phase}
                                    className={`flex size-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                                        isComplete
                                            ? "bg-[#fff012] text-gray-900"
                                            : isActive
                                              ? "bg-gray-900 text-white"
                                              : "bg-gray-100 text-gray-400"
                                    }`}
                                >
                                    {isComplete ? (
                                        <CheckCircle className="size-4" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Streaming preview */}
                    {streamingText && (
                        <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-left">
                            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-400">
                                Előnézet
                            </p>
                            <p className="max-h-32 overflow-y-auto text-sm leading-relaxed text-gray-600">
                                {streamingText.slice(0, 300)}
                                {streamingText.length > 300 && "..."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Global animations */}
                <style jsx global>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-3xl items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-900"
                    >
                        <ArrowLeft className="size-4" />
                        Vissza
                    </Link>
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                        Logó teszt
                    </span>
                </div>
            </div>

            <div className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
                <div className="mx-auto max-w-2xl">
                    {/* Page header */}
                    <div className="mb-12 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]">
                        <h1 className="mb-3 text-3xl font-light text-gray-900 md:text-4xl">
                            Elemezd a logódat
                        </h1>
                        <p className="text-gray-500">
                            Töltsd fel a logódat és kapj szakmai értékelést
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Step 1 - Test Level */}
                        <div
                            className="opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                            style={{ animationDelay: "0.1s" }}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex size-6 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
                                    1
                                </span>
                                <h2 className="text-sm font-medium text-gray-900">Válaszd ki a teszt szintjét</h2>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Basic */}
                                <button
                                    onClick={() => setTestLevel("basic")}
                                    className={`group rounded-xl border p-5 text-left transition-all duration-300 ${
                                        testLevel === "basic"
                                            ? "border-gray-900 bg-gray-50"
                                            : "border-gray-100 bg-white hover:border-gray-200"
                                    }`}
                                >
                                    <div className={`mb-3 inline-flex rounded-lg p-2 ${
                                        testLevel === "basic" ? "bg-gray-900" : "bg-gray-50"
                                    }`}>
                                        <BarChart01 className={`size-5 ${
                                            testLevel === "basic" ? "text-white" : "text-gray-400"
                                        }`} />
                                    </div>
                                    <h3 className="mb-1 font-medium text-gray-900">Alap teszt</h3>
                                    <p className="text-sm text-gray-500">7 szempont szerinti gyors elemzés</p>
                                </button>

                                {/* Detailed */}
                                <button
                                    onClick={() => setTestLevel("detailed")}
                                    className={`group relative rounded-xl border p-5 text-left transition-all duration-300 ${
                                        testLevel === "detailed"
                                            ? "border-[#fff012] bg-[#fff012]/10"
                                            : "border-gray-100 bg-white hover:border-gray-200"
                                    }`}
                                >
                                    <div className="absolute -top-2 right-4 rounded-full bg-[#fff012] px-2 py-0.5 text-xs font-medium text-gray-900">
                                        Ajánlott
                                    </div>
                                    <div className={`mb-3 inline-flex rounded-lg p-2 ${
                                        testLevel === "detailed" ? "bg-[#fff012]" : "bg-gray-50"
                                    }`}>
                                        <Stars01 className={`size-5 ${
                                            testLevel === "detailed" ? "text-gray-900" : "text-gray-400"
                                        }`} />
                                    </div>
                                    <h3 className="mb-1 font-medium text-gray-900">Részletes teszt</h3>
                                    <p className="text-sm text-gray-500">+ színpaletta és tipográfia elemzés</p>
                                </button>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="mx-auto h-px w-16 bg-gray-100" />

                        {/* Step 2 - Upload */}
                        <div
                            className="opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                            style={{ animationDelay: "0.2s" }}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex size-6 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
                                    2
                                </span>
                                <h2 className="text-sm font-medium text-gray-900">Töltsd fel a logódat</h2>
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-gray-200">
                                <FileUpload.Root>
                                    <FileUpload.DropZone
                                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                        allowsMultiple={false}
                                        maxSize={5 * 1024 * 1024}
                                        hint="PNG, JPG, WebP vagy SVG (max. 5MB)"
                                        onDropFiles={handleFileSelect}
                                        onDropUnacceptedFiles={() => setError("Csak képfájlokat fogadunk el (PNG, JPG, WebP, SVG)")}
                                        onSizeLimitExceed={() => setError("A fájl mérete maximum 5MB lehet")}
                                    />
                                    {logo && (
                                        <FileUpload.List>
                                            <FileUpload.ListItemProgressBar
                                                name={logo.name}
                                                size={logo.size}
                                                progress={100}
                                                type="image"
                                                onDelete={() => setLogo(null)}
                                            />
                                        </FileUpload.List>
                                    )}
                                </FileUpload.Root>

                                {/* Preview */}
                                {logo && (
                                    <div className="mt-6 flex justify-center">
                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
                                            <img
                                                src={URL.createObjectURL(logo)}
                                                alt="Logo preview"
                                                className="max-h-28 max-w-full object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step 3 - Colors (optional) */}
                        {testLevel !== "basic" && (
                            <>
                                <div className="mx-auto h-px w-16 bg-gray-100" />

                                <div
                                    className="opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                                    style={{ animationDelay: "0.3s" }}
                                >
                                    <div className="mb-4 flex items-center gap-3">
                                        <span className="flex size-6 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-400">
                                            3
                                        </span>
                                        <div>
                                            <h2 className="text-sm font-medium text-gray-900">Színpaletta</h2>
                                            <span className="text-xs text-gray-400">Opcionális</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <ColorPicker colors={colors} onChange={setColors} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                                <AlertCircle className="size-5 shrink-0 text-red-500" />
                                <div>
                                    <p className="font-medium text-red-900">Hiba történt</p>
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <div
                            className="pt-4 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                            style={{ animationDelay: "0.4s" }}
                        >
                            <button
                                onClick={handleSubmit}
                                disabled={!logo}
                                className={`group inline-flex items-center gap-3 rounded-full px-10 py-4 text-base font-medium transition-all duration-300 ${
                                    logo
                                        ? "bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg"
                                        : "cursor-not-allowed bg-gray-100 text-gray-400"
                                }`}
                            >
                                Elemzés indítása
                                <ArrowRight className={`size-5 transition-transform duration-300 ${logo ? "group-hover:translate-x-1" : ""}`} />
                            </button>
                        </div>

                        {/* Tip */}
                        <div
                            className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                            style={{ animationDelay: "0.5s" }}
                        >
                            <div className="rounded-lg bg-[#fff012]/30 p-1.5">
                                <Lightbulb05 className="size-4 text-gray-700" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Tipp</p>
                                <p className="text-sm text-gray-500">
                                    A legjobb eredményhez használj jó minőségű, átlátszó hátterű (PNG) logót.
                                </p>
                            </div>
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
