"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Lightbulb05, CheckCircle, AlertCircle, Stars01, BarChart01, RefreshCw05 } from "@untitledui/icons";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { ColorPicker } from "@/components/upload";
import { TransparentVideo } from "@/components/TransparentVideo";
import { TestLevel } from "@/types";
import { fileToBase64, getMediaType } from "@/lib/utils";

// Loading messages that cycle during analysis
const LOADING_MESSAGES = {
    vision: [
        "Színek azonosítása...",
        "Formák felismerése...",
        "Tipográfia elemzése...",
        "Elrendezés vizsgálata...",
        "Technikai részletek...",
        "Stílus meghatározása...",
    ],
    scoring: [
        "Megkülönböztethetőség vizsgálata...",
        "Egyszerűség elemzése...",
        "Alkalmazhatóság tesztelése...",
        "Emlékezetesség felmérése...",
        "Időtállóság értékelése...",
        "Univerzalitás ellenőrzése...",
        "Láthatóság vizsgálata...",
        "Erősségek összegyűjtése...",
        "Fejlesztendő területek azonosítása...",
    ],
    colors: [
        "Színpaletta elemzése...",
        "Színharmónia vizsgálata...",
        "Színpszichológia értékelése...",
        "Technikai reprodukálhatóság...",
    ],
    typography: [
        "Betűtípus karakter vizsgálata...",
        "Olvashatóság elemzése...",
        "Tipográfiai illeszkedés...",
    ],
    visual: [
        "Formai elemek elemzése...",
        "Arculati elemek vizsgálata...",
        "Stílusegység értékelése...",
    ],
    processing: [
        "Eredmények feldolgozása...",
        "Pontszámok kiszámítása...",
        "Értékelés véglegesítése...",
    ],
};

// Direct brandguideAI pipeline phases
type Phase = "start" | "vision" | "vision_old" | "vision_new" | "brandguide_analysis" | "brandguide_old" | "brandguide_new" | "comparing" | "processing" | "visual" | "saving" | "complete";

const phaseProgress: Record<Phase, number> = {
    start: 5,
    vision: 15,
    vision_old: 10,
    vision_new: 35,
    brandguide_analysis: 30,
    brandguide_old: 25,
    brandguide_new: 55,
    comparing: 50,
    processing: 70,
    visual: 85,
    saving: 95,
    complete: 100,
};

const phaseLabels: Record<Phase, string> = {
    start: "Indítás",
    vision: "Kép feldolgozás",
    vision_old: "Régi kép",
    vision_new: "Új kép",
    brandguide_analysis: "Pontozás",
    brandguide_old: "Régi logó",
    brandguide_new: "Új logó",
    comparing: "Színek",
    processing: "Tipográfia",
    visual: "Vizuális nyelv",
    saving: "Mentés",
    complete: "Kész",
};

// Phase steps for the progress indicator
const phaseSteps: Phase[] = ["vision", "brandguide_analysis", "comparing", "processing", "visual", "saving"];
const rebrandingPhaseSteps: Phase[] = ["vision_old", "brandguide_old", "vision_new", "brandguide_new", "comparing", "saving"];

export default function TestPage() {
    const router = useRouter();
    const [testLevel, setTestLevel] = useState<TestLevel>("detailed");
    const [logo, setLogo] = useState<File | null>(null);
    const [oldLogo, setOldLogo] = useState<File | null>(null);
    const [newLogo, setNewLogo] = useState<File | null>(null);
    const [colors, setColors] = useState<string[]>([]);
    const [fontName, setFontName] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [streamingStatus, setStreamingStatus] = useState("");
    const [streamingPhase, setStreamingPhase] = useState<Phase>("start");
    const [streamingText, setStreamingText] = useState("");
    const [cyclingMessage, setCyclingMessage] = useState("");

    const [displayedMessage, setDisplayedMessage] = useState("");

    // Cycle through loading messages based on current phase
    useEffect(() => {
        if (!isSubmitting) return;

        let messages: string[] = [];
        if (streamingPhase === "start" || streamingPhase === "vision" || streamingPhase === "vision_old" || streamingPhase === "vision_new") {
            // During vision phase, cycle through vision messages
            messages = LOADING_MESSAGES.vision;
        } else if (streamingPhase === "brandguide_analysis" || streamingPhase === "brandguide_old" || streamingPhase === "brandguide_new") {
            // During scoring phase, cycle through criteria
            messages = LOADING_MESSAGES.scoring;
        } else if (streamingPhase === "comparing") {
            messages = LOADING_MESSAGES.colors;
        } else if (streamingPhase === "processing") {
            messages = LOADING_MESSAGES.typography;
        } else if (streamingPhase === "visual") {
            messages = LOADING_MESSAGES.visual;
        } else if (streamingPhase === "saving") {
            messages = LOADING_MESSAGES.processing;
        }

        if (messages.length === 0) return;

        let index = 0;
        setCyclingMessage(messages[0]);

        const interval = setInterval(() => {
            index = (index + 1) % messages.length;
            setCyclingMessage(messages[index]);
        }, 3000); // Change message every 3 seconds (longer to allow typewriter to finish)

        return () => clearInterval(interval);
    }, [isSubmitting, streamingPhase]);

    // Typewriter effect for cycling message
    useEffect(() => {
        if (!cyclingMessage) {
            setDisplayedMessage("");
            return;
        }

        setDisplayedMessage("");
        let charIndex = 0;

        const typeInterval = setInterval(() => {
            if (charIndex < cyclingMessage.length) {
                setDisplayedMessage(cyclingMessage.slice(0, charIndex + 1));
                charIndex++;
            } else {
                clearInterval(typeInterval);
            }
        }, 40); // 40ms per character for smooth typing

        return () => clearInterval(typeInterval);
    }, [cyclingMessage]);

    const isRebranding = testLevel === "rebranding";

    const handleFileSelect = useCallback((files: FileList) => {
        if (files.length > 0) {
            setLogo(files[0]);
            setError(null);
        }
    }, []);

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
        if (isRebranding) {
            if (!oldLogo || !newLogo) {
                setError("Kérlek töltsd fel mindkét logót!");
                return;
            }
        } else {
            if (!logo) {
                setError("Kérlek töltsd fel a logódat!");
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);
        setStreamingText("");
        setStreamingStatus("Elemzés indítása...");
        setStreamingPhase("start");

        try {
            let response: Response;

            if (isRebranding) {
                const oldBase64 = await fileToBase64(oldLogo!);
                const oldMediaType = getMediaType(oldLogo!);
                const newBase64 = await fileToBase64(newLogo!);
                const newMediaType = getMediaType(newLogo!);

                response = await fetch("/api/analyze/rebranding", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        oldLogo: oldBase64,
                        oldMediaType,
                        newLogo: newBase64,
                        newMediaType,
                    }),
                });
            } else {
                const base64 = await fileToBase64(logo!);
                const mediaType = getMediaType(logo!);

                response = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        logo: base64,
                        mediaType,
                        testLevel,
                        colors: testLevel !== "basic" ? colors : undefined,
                        fontName: testLevel !== "basic" && fontName ? fontName : undefined,
                    }),
                });
            }

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
                                        if (isRebranding) {
                                            router.push(`/eredmeny/rebranding/${parsed.id}`);
                                        } else {
                                            router.push(`/eredmeny/${parsed.id}`);
                                        }
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
    }, [logo, oldLogo, newLogo, testLevel, colors, fontName, router, isRebranding]);

    // Loading state
    const currentProgress = phaseProgress[streamingPhase] ?? 0;
    const currentLabel = phaseLabels[streamingPhase] ?? streamingPhase;
    const activePhaseSteps = isRebranding ? rebrandingPhaseSteps : phaseSteps;

    if (isSubmitting) {
        return (
            <div className="min-h-screen bg-white">
                {/* Header */}
                <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="mx-auto flex max-w-3xl justify-center">
                        <Link href="/">
                            <img src="/logolab-logo-new.svg" alt="LogoLab" className="h-12" />
                        </Link>
                    </div>
                </div>

                <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
                    {/* Dark card container */}
                    <div className="w-full max-w-lg rounded-3xl bg-gray-900 p-8 text-center shadow-2xl">
                        {/* SCORE Animation at top */}
                        <div className="mb-6 flex justify-center">
                            <TransparentVideo
                                src="/score-animation.webm"
                                maxSize={200}
                                threshold={40}
                            />
                        </div>

                        {/* Logo preview - smaller, below animation */}
                        {isRebranding ? (
                            <div className="mx-auto mb-6 flex items-center justify-center gap-4">
                                {oldLogo && (
                                    <div className="flex size-16 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 p-2">
                                        <img
                                            src={URL.createObjectURL(oldLogo)}
                                            alt="Régi logó"
                                            className="max-h-full max-w-full object-contain opacity-0 animate-[fadeIn_0.5s_ease_forwards]"
                                        />
                                    </div>
                                )}
                                <ArrowRight className="size-4 text-gray-500" />
                                {newLogo && (
                                    <div className="flex size-16 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 p-2">
                                        <img
                                            src={URL.createObjectURL(newLogo)}
                                            alt="Új logó"
                                            className="max-h-full max-w-full object-contain opacity-0 animate-[fadeIn_0.5s_ease_forwards]"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            logo && (
                                <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 p-3">
                                    <img
                                        src={URL.createObjectURL(logo)}
                                        alt="Logo"
                                        className="max-h-full max-w-full object-contain opacity-0 animate-[fadeIn_0.5s_ease_forwards]"
                                    />
                                </div>
                            )
                        )}

                        {/* brandguideAI indicator */}
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1">
                            <Stars01 className="size-3.5 text-[#fff012]" />
                            <span className="text-xs font-medium text-gray-300">
                                {isRebranding ? "Rebranding elemzés" : "brandguideAI elemzés"}
                            </span>
                        </div>

                        {/* Status text with cycling message */}
                        <div className="mb-6">
                            {streamingPhase !== "complete" && (
                                <p className="h-6 text-lg font-medium text-white">
                                    {displayedMessage}
                                    {displayedMessage && <span className="inline-block w-0.5 h-5 ml-0.5 bg-[#fff012] animate-pulse align-middle" />}
                                </p>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="mb-8">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                                <div
                                    className="h-full bg-[#fff012] transition-all duration-500 ease-out"
                                    style={{ width: `${currentProgress}%` }}
                                />
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-gray-500">
                                <span>{currentProgress}%</span>
                                <span>{currentLabel}</span>
                            </div>
                        </div>

                        {/* Phase steps */}
                        <div className="flex justify-center gap-2">
                            {activePhaseSteps.map((phase, index) => {
                                const isActive = streamingPhase === phase;
                                const stepProgress = phaseProgress[phase] ?? 0;
                                const isComplete = currentProgress > stepProgress;
                                const stepLabel = phaseLabels[phase] ?? phase;

                                const getStepColors = () => {
                                    if (isComplete) return "bg-[#fff012] text-gray-900";
                                    if (isActive) return "bg-white text-gray-900";
                                    return "bg-gray-800 text-gray-500";
                                };

                                return (
                                    <div key={phase} className="flex flex-col items-center gap-1">
                                        <div
                                            className={`flex size-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${getStepColors()}`}
                                        >
                                            {isComplete ? <CheckCircle className="size-4" /> : index + 1}
                                        </div>
                                        <span className={`max-w-[60px] text-center text-[10px] leading-tight ${isActive ? "font-medium text-gray-300" : "text-gray-500"}`}>
                                            {stepLabel}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Streaming preview */}
                        {streamingText && (
                            <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800/50 p-4 text-left">
                                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">
                                    Előnézet
                                </p>
                                <p className="max-h-32 overflow-y-auto text-sm leading-relaxed text-gray-400">
                                    {streamingText.slice(0, 300)}
                                    {streamingText.length > 300 && "..."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <style jsx global>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}</style>
            </div>
        );
    }

    const canSubmit = isRebranding ? (oldLogo && newLogo) : logo;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-3xl grid-cols-3 items-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-900"
                    >
                        <ArrowLeft className="size-4" />
                        Vissza
                    </Link>
                    <Link href="/" className="justify-self-center">
                        <img src="/logolab-logo-new.svg" alt="LogoLab" className="h-12" />
                    </Link>
                    <div></div>
                </div>
            </div>

            <div className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
                <div className="mx-auto max-w-2xl">
                    {/* Page header */}
                    <div className="mb-12 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]">
                        <h1 className="mb-3 text-3xl font-light text-gray-900 md:text-4xl">
                            {isRebranding ? "Rebranding elemzés" : "Elemezd a logódat"}
                        </h1>
                        <p className="text-gray-500">
                            {isRebranding
                                ? "Hasonlítsd össze a régi és az új logódat"
                                : "Töltsd fel a logódat és kapj szakmai értékelést"
                            }
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

                            <div className="grid gap-4 md:grid-cols-3">
                                {/* Basic - DISABLED */}
                                <div
                                    className="relative cursor-not-allowed rounded-xl border border-gray-100 bg-gray-50 p-5 text-left opacity-50"
                                >
                                    <div className="absolute -top-2 right-3 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                        Hamarosan
                                    </div>
                                    <div className="mb-3 inline-flex rounded-lg bg-gray-100 p-2">
                                        <BarChart01 className="size-5 text-gray-300" />
                                    </div>
                                    <h3 className="mb-1 font-medium text-gray-400">Alap teszt</h3>
                                    <p className="text-sm text-gray-400">7 szempont szerinti gyors elemzés</p>
                                </div>

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

                                {/* Rebranding - DISABLED */}
                                <div
                                    className="relative cursor-not-allowed rounded-xl border border-gray-100 bg-gray-50 p-5 text-left opacity-50"
                                >
                                    <div className="absolute -top-2 right-3 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                        Hamarosan
                                    </div>
                                    <div className="mb-3 inline-flex rounded-lg bg-gray-100 p-2">
                                        <RefreshCw05 className="size-5 text-gray-300" />
                                    </div>
                                    <h3 className="mb-1 font-medium text-gray-400">Rebranding teszt</h3>
                                    <p className="text-sm text-gray-400">Régi és új logó összehasonlítása</p>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="mx-auto h-px w-16 bg-gray-100" />

                        {/* Step 2 - Upload */}
                        {isRebranding ? (
                            /* Rebranding: Two upload fields */
                            <div
                                className="opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                                style={{ animationDelay: "0.2s" }}
                            >
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="flex size-6 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
                                        2
                                    </span>
                                    <h2 className="text-sm font-medium text-gray-900">Töltsd fel mindkét logót</h2>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Old Logo */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:border-gray-200">
                                        <p className="mb-3 text-sm font-medium text-gray-700">Régi logó</p>
                                        <FileUpload.Root>
                                            <FileUpload.DropZone
                                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                                allowsMultiple={false}
                                                maxSize={5 * 1024 * 1024}
                                                hint="PNG, JPG, WebP vagy SVG"
                                                onDropFiles={handleOldLogoSelect}
                                                onDropUnacceptedFiles={() => setError("Csak képfájlokat fogadunk el")}
                                                onSizeLimitExceed={() => setError("Max 5MB")}
                                            />
                                            {oldLogo && (
                                                <FileUpload.List>
                                                    <FileUpload.ListItemProgressBar
                                                        name={oldLogo.name}
                                                        size={oldLogo.size}
                                                        progress={100}
                                                        type="image"
                                                        onDelete={() => setOldLogo(null)}
                                                    />
                                                </FileUpload.List>
                                            )}
                                        </FileUpload.Root>
                                        {oldLogo && (
                                            <div className="mt-4 flex justify-center">
                                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                                    <img
                                                        src={URL.createObjectURL(oldLogo)}
                                                        alt="Régi logó"
                                                        className="max-h-20 max-w-full object-contain"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* New Logo */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:border-gray-200">
                                        <p className="mb-3 text-sm font-medium text-gray-700">Új logó</p>
                                        <FileUpload.Root>
                                            <FileUpload.DropZone
                                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                                allowsMultiple={false}
                                                maxSize={5 * 1024 * 1024}
                                                hint="PNG, JPG, WebP vagy SVG"
                                                onDropFiles={handleNewLogoSelect}
                                                onDropUnacceptedFiles={() => setError("Csak képfájlokat fogadunk el")}
                                                onSizeLimitExceed={() => setError("Max 5MB")}
                                            />
                                            {newLogo && (
                                                <FileUpload.List>
                                                    <FileUpload.ListItemProgressBar
                                                        name={newLogo.name}
                                                        size={newLogo.size}
                                                        progress={100}
                                                        type="image"
                                                        onDelete={() => setNewLogo(null)}
                                                    />
                                                </FileUpload.List>
                                            )}
                                        </FileUpload.Root>
                                        {newLogo && (
                                            <div className="mt-4 flex justify-center">
                                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                                    <img
                                                        src={URL.createObjectURL(newLogo)}
                                                        alt="Új logó"
                                                        className="max-h-20 max-w-full object-contain"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Basic/Detailed: Single upload field */
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
                        )}

                        {/* Step 3 - Colors (optional, only for detailed) */}
                        {testLevel === "detailed" && (
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

                                {/* Step 4 - Font name (optional) */}
                                <div className="mx-auto h-px w-16 bg-gray-100" />

                                <div
                                    className="opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                                    style={{ animationDelay: "0.35s" }}
                                >
                                    <div className="mb-4 flex items-center gap-3">
                                        <span className="flex size-6 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-400">
                                            4
                                        </span>
                                        <div>
                                            <h2 className="text-sm font-medium text-gray-900">Betűtípus neve</h2>
                                            <span className="text-xs text-gray-400">Opcionális</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <input
                                            type="text"
                                            value={fontName}
                                            onChange={(e) => setFontName(e.target.value)}
                                            placeholder="pl. Montserrat, Poppins, stb."
                                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-0"
                                        />
                                        <p className="mt-2 text-xs text-gray-400">
                                            Ha tudod, milyen betűtípust használ a logód, add meg a nevét a pontosabb elemzésért.
                                        </p>
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
                                disabled={!canSubmit}
                                className={`group inline-flex items-center gap-3 rounded-full px-10 py-4 text-base font-medium transition-all duration-300 ${
                                    canSubmit
                                        ? "bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg"
                                        : "cursor-not-allowed bg-gray-100 text-gray-400"
                                }`}
                            >
                                {isRebranding ? "Összehasonlítás indítása" : "Elemzés indítása"}
                                <ArrowRight className={`size-5 transition-transform duration-300 ${canSubmit ? "group-hover:translate-x-1" : ""}`} />
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
                                    {isRebranding
                                        ? "A legjobb eredményhez használj hasonló méretű és minőségű képeket mindkét logóhoz."
                                        : "A legjobb eredményhez használj jó minőségű, átlátszó hátterű (PNG) logót."
                                    }
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
