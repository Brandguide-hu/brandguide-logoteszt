"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AnalysisResult, CRITERIA_META, CriteriaName } from "@/types";
import {
    RadarChart,
    ResultSkeleton,
    ResultSidebar,
} from "@/components/results";
import { ArrowLeft, RefreshCw05, AlertCircle, CheckCircle, AlertTriangle, Lightbulb02 } from "@untitledui/icons";

// Criteria emoji icons (matching vertical design)
const CRITERIA_EMOJIS: Record<string, string> = {
    megkulonboztethetoseg: "🎯",
    egyszeruseg: "✨",
    alkalmazhatosag: "📐",
    emlekezetesseg: "💡",
    idotallosag: "⏳",
    univerzalitas: "🌍",
    lathatosag: "👁️",
};

export default function ResultPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<CriteriaName>("megkulonboztethetoseg");

    useEffect(() => {
        async function fetchResult() {
            try {
                const { data, error: dbError } = await supabase.from("analyses").select("*").eq("id", id).single();

                if (dbError) throw dbError;
                if (!data) throw new Error("Eredmény nem található");

                // Check if this is a rebranding result and redirect
                const rawResult = data.result as { type?: string };
                if (rawResult?.type === 'rebranding') {
                    router.replace(`/eredmeny/rebranding/${id}`);
                    return;
                }

                const resultData = data.result as unknown as AnalysisResult;
                setResult(resultData);
                setLogoUrl(`data:image/png;base64,${data.logo_base64}`);
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Nem sikerült betölteni az eredményt");
            } finally {
                setLoading(false);
            }
        }

        fetchResult();
    }, [id, router]);

    // Loading state - show skeleton UI
    if (loading) {
        return <ResultSkeleton />;
    }

    // Error state
    if (error || !result) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-red-50">
                        <AlertCircle className="size-8 text-red-500" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold text-[#1f2937]">{error || "Eredmény nem található"}</h1>
                    <p className="mb-8 text-[#6b7280]">
                        Lehet, hogy az elemzés már nem elérhető, vagy hibás a link.
                    </p>
                    <Link href="/teszt">
                        <button className="inline-flex items-center gap-2 rounded-full bg-[#1f2937] px-6 py-3 font-medium text-white transition-all hover:bg-[#374151]">
                            <RefreshCw05 className="size-4" />
                            Új teszt indítása
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    // Rating color based on score
    const getRatingStyle = (score: number) => {
        if (score >= 90) return { color: "text-[#ca8a04]", bg: "bg-[#fef9c3]", label: "Kivételes" };
        if (score >= 80) return { color: "text-[#9333ea]", bg: "bg-[#f3e8ff]", label: "Profi" };
        if (score >= 70) return { color: "text-[#16a34a]", bg: "bg-[#f0fdf4]", label: "Jó minőségű" };
        if (score >= 60) return { color: "text-[#2563eb]", bg: "bg-[#eff6ff]", label: "Átlagos" };
        if (score >= 40) return { color: "text-[#d97706]", bg: "bg-[#fffbeb]", label: "Problémás" };
        return { color: "text-[#dc2626]", bg: "bg-[#fef2f2]", label: "Újragondolandó" };
    };

    const ratingStyle = getRatingStyle(result.osszpontszam);

    return (
        <div className="min-h-screen bg-[#f9fafb]">
            {/* Header */}
            <header className="border-b border-[#e5e7eb] bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/teszt"
                            className="inline-flex items-center gap-2 text-sm text-[#6b7280] transition-colors hover:text-[#1f2937]"
                        >
                            <ArrowLeft className="size-4" />
                            Új teszt
                        </Link>
                        <Link href="/">
                            <img src="/logolab-logo-new.svg" alt="LogoLab" className="h-10" />
                        </Link>
                        <div className="w-20" />
                    </div>
                </div>
            </header>

            {/* Main content with sidebar */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                    {/* Main content area - 8 cols on desktop */}
                    <div className="lg:col-span-8">
                        {/* Hero section with logo and score */}
                        <div className="mb-6 overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-sm">
                            <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8">
                                {/* Logo */}
                                {logoUrl && (
                                    <div className="shrink-0 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-6">
                                        <img
                                            src={logoUrl}
                                            alt="Elemzett logó"
                                            className="max-h-28 max-w-[180px] object-contain"
                                        />
                                    </div>
                                )}

                                {/* Score and rating */}
                                <div className="flex-1 text-center sm:text-left">
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                                        Összpontszám
                                    </p>
                                    <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                                        <span className="text-5xl font-bold text-[#1f2937]">
                                            {result.osszpontszam}
                                        </span>
                                        <span className="text-xl text-[#6b7280]">/100</span>
                                    </div>
                                    <div className={`mt-3 inline-block rounded-lg px-3 py-1.5 text-sm font-semibold ${ratingStyle.bg} ${ratingStyle.color}`}>
                                        {result.minosites}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mb-6 rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-sm">
                            <h2 className="mb-3 text-xl font-bold text-[#1f2937]">
                                Összefoglaló
                            </h2>
                            <p className="text-[16px] leading-[26px] text-[#37352f]">
                                {result.osszegzes}
                            </p>
                        </div>

                        {/* Strengths & Weaknesses - Two column */}
                        <div className="mb-6 grid gap-4 sm:grid-cols-2">
                            {/* Strengths - green-50 bg, green-800 title, green-700 text, green-500 dots */}
                            <div className="rounded-lg bg-[#f0fdf4] p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <CheckCircle className="size-5 text-[#16a34a]" />
                                    <h3 className="font-bold text-[#047857]">Erősségek</h3>
                                </div>
                                {result.erossegek && result.erossegek.length > 0 ? (
                                    <ul className="space-y-2">
                                        {result.erossegek.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-[#15803d]">
                                                <span className="mt-1.5 text-[8px] text-[#10b981]">●</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-[#6b7280] italic">Nincs kiemelendő erősség</p>
                                )}
                            </div>

                            {/* Weaknesses - amber-50 bg, amber-800 title, amber-700 text, amber-500 dots */}
                            <div className="rounded-lg bg-[#fffbeb] p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <AlertTriangle className="size-5 text-[#d97706]" />
                                    <h3 className="font-bold text-[#92400e]">Fejlesztendő</h3>
                                </div>
                                {result.fejlesztendo && result.fejlesztendo.length > 0 ? (
                                    <ul className="space-y-2">
                                        {result.fejlesztendo.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-[#b45309]">
                                                <span className="mt-1.5 text-[8px] text-[#d97706]">●</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-[#6b7280] italic">Nincs kiemelendő fejlesztendő terület</p>
                                )}
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="mb-6 rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-xl font-bold text-[#1f2937]">
                                Szempontok áttekintése
                            </h2>
                            <RadarChart result={result} />
                        </div>

                        {/* Criteria Details - Tabbed layout like vertical */}
                        <div className="mb-6">
                            <h2 className="mb-4 text-xl font-bold text-[#1f2937]">
                                Részletes értékelés
                            </h2>
                            <div className="flex gap-4">
                                {/* Left side - Tab list */}
                                <div className="w-64 shrink-0 space-y-1">
                                    {Object.entries(result.szempontok).map(([key, value]) => {
                                        const criteriaKey = key as CriteriaName;
                                        const meta = CRITERIA_META[criteriaKey];
                                        if (!meta) return null;

                                        const emoji = CRITERIA_EMOJIS[key] || "🎯";
                                        const isActive = activeTab === key;

                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setActiveTab(criteriaKey)}
                                                className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all ${
                                                    isActive
                                                        ? "border border-[#e5e7eb] bg-white shadow-sm"
                                                        : "hover:bg-[#f3f4f6] hover:shadow-sm"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">{emoji}</span>
                                                    <span className={`text-sm font-medium ${isActive ? "text-[#1f2937]" : "text-[#6b7280]"}`}>
                                                        {meta.displayName}
                                                    </span>
                                                </div>
                                                <span className="rounded-full bg-[#fef2f2] px-2 py-0.5 text-xs font-semibold text-[#ef4444]">
                                                    {value.pont}/{meta.maxScore}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Right side - Active tab content */}
                                <div className="flex-1 rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-sm">
                                    {(() => {
                                        const value = result.szempontok[activeTab];
                                        const meta = CRITERIA_META[activeTab];
                                        if (!value || !meta) return null;

                                        return (
                                            <>
                                                {/* Header with score */}
                                                <div className="mb-4 flex items-start justify-between">
                                                    <h3 className="text-xl font-bold text-[#1f2937]">
                                                        {meta.displayName}
                                                    </h3>
                                                    <div className="text-right">
                                                        <span className="text-4xl font-bold text-[#1f2937]">{value.pont}</span>
                                                        <span className="text-xl text-[#6b7280]"> / {meta.maxScore}</span>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                                                    <div
                                                        className="h-full rounded-full bg-[#fcd34d] transition-all duration-300"
                                                        style={{ width: `${(value.pont / meta.maxScore) * 100}%` }}
                                                    />
                                                </div>

                                                {/* Description */}
                                                <p className="mb-6 text-[16px] leading-[26px] text-[#787774]">
                                                    {value.indoklas}
                                                </p>

                                                {/* Suggestions */}
                                                {value.javaslatok && value.javaslatok.length > 0 && (
                                                    <div className="rounded-lg bg-[#fefce8] p-4">
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <Lightbulb02 className="size-4 text-[#ca8a04]" />
                                                            <h4 className="font-semibold text-[#ca8a04]">Javaslatok</h4>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {value.javaslatok.map((javaslat, index) => (
                                                                <li key={index} className="flex items-start gap-2 text-[16px] leading-[26px] text-[#787774]">
                                                                    <span className="mt-2 text-[8px] text-[#ca8a04]">●</span>
                                                                    {javaslat}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Color, Typography Analysis - Two column grid */}
                        <div className="mb-6 grid gap-4 sm:grid-cols-2">
                            {/* Color Analysis - purple accent */}
                            {result.szinek && (
                                <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                                    <div className="mb-5 flex items-center gap-3">
                                        <span className="text-2xl">🎨</span>
                                        <h3 className="text-xl font-semibold text-[#1f2937]">Színpaletta elemzés</h3>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9333ea]">Harmónia</h4>
                                            <p className="text-[14px] leading-[23px] text-[#787774]">{result.szinek.harmonia}</p>
                                        </div>
                                        <div>
                                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9333ea]">Pszichológia</h4>
                                            <p className="text-[14px] leading-[23px] text-[#787774]">{result.szinek.pszichologia}</p>
                                        </div>
                                        <div>
                                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#22c55e]">Technikai</h4>
                                            <p className="text-[14px] leading-[23px] text-[#787774]">{result.szinek.technikai}</p>
                                        </div>
                                        {result.szinek.javaslatok && result.szinek.javaslatok.length > 0 && (
                                            <div className="border-t border-[#e5e7eb] pt-5">
                                                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9333ea]">Javaslatok</h4>
                                                <ul className="space-y-2">
                                                    {result.szinek.javaslatok.map((javaslat, index) => (
                                                        <li key={index} className="flex items-start gap-2 text-[14px] leading-[23px] text-[#787774]">
                                                            <span className="mt-1.5 text-[8px] text-[#a78bfa]">●</span>
                                                            {javaslat}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Typography Analysis - blue accent */}
                            {result.tipografia && (
                                <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                                    <div className="mb-5 flex items-center gap-3">
                                        <span className="text-2xl">🔤</span>
                                        <h3 className="text-xl font-semibold text-[#1f2937]">Tipográfia elemzés</h3>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#3b82f6]">Karakter</h4>
                                            <p className="text-[14px] leading-[23px] text-[#787774]">{result.tipografia.karakter}</p>
                                        </div>
                                        <div className="border-t border-[#e5e7eb] pt-5">
                                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#3b82f6]">Olvashatóság</h4>
                                            <p className="text-[14px] leading-[23px] text-[#787774]">{result.tipografia.olvashatosag}</p>
                                        </div>
                                        {result.tipografia.javaslatok && result.tipografia.javaslatok.length > 0 && (
                                            <div className="border-t border-[#e5e7eb] pt-5">
                                                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#3b82f6]">Javaslatok</h4>
                                                <ul className="space-y-2">
                                                    {result.tipografia.javaslatok.map((javaslat, index) => (
                                                        <li key={index} className="flex items-start gap-2 text-[14px] leading-[23px] text-[#787774]">
                                                            <span className="mt-1.5 text-[8px] text-[#93c5fd]">●</span>
                                                            {javaslat}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Visual Language - Full width */}
                        {result.vizualisNyelv && (
                            <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                                <div className="mb-5 flex items-center gap-3">
                                    <span className="text-2xl">🎭</span>
                                    <h3 className="text-xl font-semibold text-[#1f2937]">Vizuális nyelv elemzés</h3>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#14b8a6]">Formák</h4>
                                        <p className="text-[14px] leading-[23px] text-[#787774]">{result.vizualisNyelv.formak}</p>
                                    </div>
                                    <div>
                                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#14b8a6]">Elemek</h4>
                                        <p className="text-[14px] leading-[23px] text-[#787774]">{result.vizualisNyelv.elemek}</p>
                                    </div>
                                    <div>
                                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#14b8a6]">Stílusegység</h4>
                                        <p className="text-[14px] leading-[23px] text-[#787774]">{result.vizualisNyelv.stilusEgyseg}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CTA */}
                        <div className="rounded-lg bg-[#1f2937] p-8 text-center sm:p-10">
                            <span className="mb-4 inline-block rounded-full bg-[#fcd34d] px-4 py-1.5 text-xs font-bold text-[#1f2937]">
                                brandguide/AI
                            </span>
                            <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
                                Szeretnéd továbbfejleszteni a brandedet?
                            </h2>
                            <p className="mx-auto mb-8 max-w-xl text-[#9ca3af]">
                                A brandguide/AI segít kidolgozni a teljes brand alapjaidat – a stratégiától a vizuális rendszerig.
                            </p>
                            <a href="https://ai.brandguide.hu/" target="_blank" rel="noopener noreferrer">
                                <button className="group inline-flex items-center gap-3 rounded-full bg-[#fcd34d] px-8 py-4 font-semibold text-[#1f2937] transition-all hover:bg-[#fbbf24] hover:shadow-lg">
                                    Ismerkedj meg a brandguide/AI-jal
                                    <svg className="size-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </a>
                        </div>
                    </div>

                    {/* Sidebar - 4 cols on desktop */}
                    <div className="mt-8 lg:col-span-4 lg:mt-0">
                        <ResultSidebar
                            logoUrl={logoUrl}
                            score={result.osszpontszam}
                            rating={result.minosites}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
