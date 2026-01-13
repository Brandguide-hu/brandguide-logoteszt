"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AnalysisResult, CRITERIA_META, CriteriaName } from "@/types";
import {
    ScoreDisplay,
    RadarChart,
    CriteriaCard,
    StrengthsWeaknesses,
    ColorAnalysis,
    TypographyAnalysis,
} from "@/components/results";
import { ArrowRight, ArrowLeft, RefreshCw05, Copy01, Check, Share07, AlertCircle, ThumbsUp, ThumbsDown } from "@untitledui/icons";

export default function ResultPage() {
    const params = useParams();
    const id = params.id as string;

    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchResult() {
            try {
                const { data, error: dbError } = await supabase.from("analyses").select("*").eq("id", id).single();

                if (dbError) throw dbError;
                if (!data) throw new Error("Eredmény nem található");

                setResult(data.result as unknown as AnalysisResult);
                setLogoUrl(`data:image/png;base64,${data.logo_base64}`);
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Nem sikerült betölteni az eredményt");
            } finally {
                setLoading(false);
            }
        }

        fetchResult();
    }, [id]);

    const getShareUrl = () => {
        if (typeof window !== "undefined") {
            return window.location.href;
        }
        return "";
    };

    const getShareText = () => {
        return `A logóm ${result?.osszpontszam}/100 pontot kapott a Brandguide Logóteszten!`;
    };

    const handleCopyUrl = async () => {
        const url = getShareUrl();
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareFacebook = () => {
        const url = encodeURIComponent(getShareUrl());
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=600,height=400");
    };

    const handleShareLinkedIn = () => {
        const url = encodeURIComponent(getShareUrl());
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "width=600,height=400");
    };

    const handleShareX = () => {
        const url = encodeURIComponent(getShareUrl());
        const text = encodeURIComponent(getShareText());
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "width=600,height=400");
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <div className="text-center">
                    <div className="mx-auto mb-6 size-12 animate-spin rounded-full border-2 border-gray-200 border-t-[#fff012]" />
                    <p className="text-gray-500">Eredmény betöltése...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !result) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-red-50">
                        <AlertCircle className="size-8 text-red-500" />
                    </div>
                    <h1 className="mb-2 text-2xl font-light text-gray-900">{error || "Eredmény nem található"}</h1>
                    <p className="mb-8 text-gray-500">
                        Lehet, hogy az elemzés már nem elérhető, vagy hibás a link.
                    </p>
                    <Link href="/teszt">
                        <button className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white transition-all hover:bg-gray-800">
                            <RefreshCw05 className="size-4" />
                            Új teszt indítása
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-600";
        if (score >= 60) return "text-[#fff012]";
        if (score >= 40) return "text-amber-500";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <Link
                        href="/teszt"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-900"
                    >
                        <ArrowLeft className="size-4" />
                        Új teszt
                    </Link>
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                        Eredmény
                    </span>
                </div>
            </div>

            <div className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    {/* Hero section with score */}
                    <div className="mb-16 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]">
                        <p className="mb-4 text-sm text-gray-500">Elemzés kész</p>
                        <h1 className="mb-8 text-3xl font-light text-gray-900 md:text-4xl">
                            A logód eredménye
                        </h1>

                        {/* Score and logo side by side */}
                        <div className="flex flex-col items-center gap-12 md:flex-row md:justify-center">
                            {/* Logo */}
                            {logoUrl && (
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
                                    <img
                                        src={logoUrl}
                                        alt="Feltöltött logó"
                                        className="max-h-32 max-w-[200px] object-contain"
                                    />
                                </div>
                            )}

                            {/* Score */}
                            <div className="text-center">
                                <div className={`text-8xl font-extralight ${getScoreColor(result.osszpontszam)} md:text-9xl`}>
                                    {result.osszpontszam}
                                </div>
                                <div className="mt-2 text-sm text-gray-400">/ 100 pont</div>
                                <div className="mt-4 inline-block rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700">
                                    {result.minosites}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div
                        className="mb-12 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                        style={{ animationDelay: "0.1s" }}
                    >
                        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-400">
                            Összefoglaló
                        </h2>
                        <p className="text-lg leading-relaxed text-gray-600">
                            {result.osszegzes}
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="mx-auto mb-12 h-px w-16 bg-gray-100" />

                    {/* Strengths & Weaknesses */}
                    <div
                        className="mb-12 grid gap-6 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards] md:grid-cols-2"
                        style={{ animationDelay: "0.2s" }}
                    >
                        {/* Strengths */}
                        <div className="rounded-xl border border-gray-100 bg-white p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-lg bg-emerald-50 p-1.5">
                                    <ThumbsUp className="size-4 text-emerald-600" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-900">Erősségek</h3>
                            </div>
                            <ul className="space-y-3">
                                {result.erossegek.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="rounded-xl border border-gray-100 bg-white p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-lg bg-amber-50 p-1.5">
                                    <ThumbsDown className="size-4 text-amber-600" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-900">Fejlesztendő</h3>
                            </div>
                            <ul className="space-y-3">
                                {result.fejlesztendo.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div
                        className="mb-12 rounded-xl border border-gray-100 bg-white p-6 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                        style={{ animationDelay: "0.3s" }}
                    >
                        <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-gray-400">
                            Szempontok áttekintése
                        </h2>
                        <RadarChart result={result} />
                    </div>

                    {/* Criteria Details */}
                    <div
                        className="mb-12 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                        style={{ animationDelay: "0.4s" }}
                    >
                        <div className="mb-6 flex items-center gap-3">
                            <h2 className="text-sm font-medium uppercase tracking-widest text-gray-400">
                                Részletes értékelés
                            </h2>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                7 szempont
                            </span>
                        </div>
                        <div className="space-y-3">
                            {Object.entries(result.szempontok).map(([key, value], index) => {
                                const criteriaKey = key as CriteriaName;
                                const meta = CRITERIA_META[criteriaKey];
                                if (!meta) return null;

                                const percentage = (value.pont / meta.maxScore) * 100;

                                return (
                                    <div
                                        key={key}
                                        className="group rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:border-gray-200 hover:shadow-sm"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="font-medium text-gray-900">{meta.displayName}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-400">{value.pont}/{meta.maxScore}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-300 ${
                                                    percentage >= 70
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : percentage >= 50
                                                          ? "bg-[#fff012]/20 text-gray-700"
                                                          : "bg-amber-50 text-amber-700"
                                                }`}>
                                                    {Math.round(percentage)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    percentage >= 70
                                                        ? "bg-emerald-500"
                                                        : percentage >= 50
                                                          ? "bg-[#fff012]"
                                                          : "bg-amber-500"
                                                }`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <p className="text-sm text-gray-500">{value.indoklas}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color & Typography Analysis */}
                    {result.szinek && (
                        <div
                            className="mb-12 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                            style={{ animationDelay: "0.5s" }}
                        >
                            <ColorAnalysis analysis={result.szinek} />
                        </div>
                    )}

                    {result.tipografia && (
                        <div
                            className="mb-12 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                            style={{ animationDelay: "0.6s" }}
                        >
                            <TypographyAnalysis analysis={result.tipografia} />
                        </div>
                    )}

                    {/* Share section */}
                    <div
                        className="mb-12 rounded-xl border border-gray-100 bg-gray-50/50 p-6 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                        style={{ animationDelay: "0.7s" }}
                    >
                        <div className="mb-4 flex items-center gap-2">
                            <Share07 className="size-4 text-gray-400" />
                            <h3 className="text-sm font-medium text-gray-900">Eredmény megosztása</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleCopyUrl}
                                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all hover:border-gray-300 hover:shadow-sm"
                            >
                                {copied ? (
                                    <>
                                        <Check className="size-4 text-emerald-500" />
                                        Másolva!
                                    </>
                                ) : (
                                    <>
                                        <Copy01 className="size-4" />
                                        Link másolása
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleShareFacebook}
                                className="inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-4 py-2 text-sm text-white transition-all hover:bg-[#1877F2]/90"
                            >
                                Facebook
                            </button>
                            <button
                                onClick={handleShareLinkedIn}
                                className="inline-flex items-center gap-2 rounded-full bg-[#0A66C2] px-4 py-2 text-sm text-white transition-all hover:bg-[#0A66C2]/90"
                            >
                                LinkedIn
                            </button>
                            <button
                                onClick={handleShareX}
                                className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white transition-all hover:bg-gray-800"
                            >
                                X
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div
                        className="mb-12 flex flex-col items-center gap-4 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards] sm:flex-row sm:justify-center"
                        style={{ animationDelay: "0.8s" }}
                    >
                        <Link href="/teszt">
                            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:shadow-sm">
                                <RefreshCw05 className="size-4" />
                                Új teszt indítása
                            </button>
                        </Link>
                    </div>

                    {/* CTA */}
                    <div
                        className="rounded-2xl bg-gray-900 p-8 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards] md:p-12"
                        style={{ animationDelay: "0.9s" }}
                    >
                        <span className="mb-4 inline-block rounded-full bg-[#fff012] px-3 py-1 text-xs font-medium text-gray-900">
                            Brandguide/AI
                        </span>
                        <h2 className="mb-3 text-2xl font-light text-white md:text-3xl">
                            Szeretnéd továbbfejleszteni a brandedet?
                        </h2>
                        <p className="mx-auto mb-8 max-w-xl text-gray-400">
                            A Brandguide/AI segít kidolgozni a teljes brand alapjaidat – a stratégiától a vizuális rendszerig.
                        </p>
                        <a href="https://brandguide.hu" target="_blank" rel="noopener noreferrer">
                            <button className="group inline-flex items-center gap-3 rounded-full bg-[#fff012] px-8 py-4 font-medium text-gray-900 transition-all hover:shadow-lg hover:shadow-[#fff012]/20">
                                Ismerkedj meg a Brandguide/AI-jal
                                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                            </button>
                        </a>
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
