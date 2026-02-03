"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AnalysisResult, CRITERIA_META, CriteriaName } from "@/types";
import {
    RadarChart,
    ResultSkeleton,
    ResultSidebar,
} from "@/components/results";
import {
    ArrowLeft, RefreshCw05, AlertCircle, CheckCircle, AlertTriangle, Lightbulb02,
    Target04, Stars01, Grid01, Lightbulb05, Clock, Globe01, Eye,
    Palette, TypeSquare, LayersThree01,
} from "@untitledui/icons";
import { HeaderAuth } from "@/components/layout/HeaderAuth";
import { ComponentType, SVGAttributes } from "react";

// Criteria line icons
const CRITERIA_ICONS: Record<string, ComponentType<SVGAttributes<SVGSVGElement>>> = {
    megkulonboztethetoseg: Target04,
    egyszeruseg: Stars01,
    alkalmazhatosag: Grid01,
    emlekezetesseg: Lightbulb05,
    idotallosag: Clock,
    univerzalitas: Globe01,
    lathatosag: Eye,
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
    const [displayScore, setDisplayScore] = useState(0);
    const scoreAnimated = useRef(false);
    const heroLogoRef = useRef<HTMLDivElement>(null);
    const [heroLogoVisible, setHeroLogoVisible] = useState(true);

    // Animated count-up for score
    const animateScore = useCallback((target: number) => {
        if (scoreAnimated.current) return;
        scoreAnimated.current = true;
        const duration = 1200;
        const startTime = performance.now();
        const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayScore(Math.round(eased * target));
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }, []);

    useEffect(() => {
        async function fetchResult() {
            try {
                const res = await fetch(`/api/result/${id}`);
                if (!res.ok) throw new Error("Eredmény nem található");
                const data = await res.json();

                // Check if this is a rebranding result and redirect
                const rawResult = data.result as { type?: string };
                if (rawResult?.type === 'rebranding') {
                    router.replace(`/eredmeny/rebranding/${id}`);
                    return;
                }

                const resultData = data.result as unknown as AnalysisResult;
                setResult(resultData);
                setLogoUrl(`data:image/png;base64,${data.logo_base64}`);
                animateScore(resultData.osszpontszam);
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Nem sikerült betölteni az eredményt");
            } finally {
                setLoading(false);
            }
        }

        fetchResult();
    }, [id, router, animateScore]);

    // Track hero logo visibility for sidebar
    useEffect(() => {
        const el = heroLogoRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setHeroLogoVisible(entry.isIntersecting),
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loading]);

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
            <header className="border-b border-gray-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/teszt"
                            className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
                        >
                            <ArrowLeft className="size-4" />
                            Új teszt
                        </Link>
                        <Link href="/">
                            <img src="/logolab-logo-newLL.svg" alt="LogoLab" className="h-10" />
                        </Link>
                        <HeaderAuth />
                    </div>
                </div>
            </header>

            {/* Main content with sidebar */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                    {/* Main content area - 8 cols on desktop */}
                    <div className="lg:col-span-8">
                        {/* Hero section with logo and score - 50/50 split */}
                        <div className="mb-8 flex flex-col sm:flex-row gap-6 sm:gap-8">
                            {/* Logo - large square, ~50% width */}
                            {logoUrl && (
                                <div ref={heroLogoRef} className="shrink-0 flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 w-full sm:w-[48%] aspect-square p-10">
                                    <img
                                        src={logoUrl}
                                        alt="Elemzett logó"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                            )}

                            {/* Score and rating - ~50% width */}
                            <div className="flex-1 flex flex-col justify-center py-4">
                                <div className="flex items-baseline gap-1">
                                    <span
                                        className="font-bold text-[#37352f]"
                                        style={{ fontSize: '96px', lineHeight: '96px' }}
                                    >
                                        {displayScore}
                                    </span>
                                    <span
                                        className="font-normal text-[#9ca3af]"
                                        style={{ fontSize: '30px' }}
                                    >
                                        /100
                                    </span>
                                </div>
                                <div className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${ratingStyle.bg} ${ratingStyle.color}`}>
                                    {result.minosites}
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300">
                            <h2 className="mb-3 text-xl font-light text-gray-900">
                                Összefoglaló
                            </h2>
                            <p className="text-[16px] leading-[26px] text-gray-500">
                                {result.osszegzes}
                            </p>
                        </div>

                        {/* Strengths & Weaknesses - Two column */}
                        <div className="mb-6 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl bg-emerald-50 p-5 transition-all duration-300">
                                <div className="mb-3 flex items-center gap-2">
                                    <CheckCircle className="size-5 text-emerald-600" />
                                    <h3 className="font-semibold text-emerald-800">Erősségek</h3>
                                </div>
                                {result.erossegek && result.erossegek.length > 0 ? (
                                    <ul className="space-y-2">
                                        {result.erossegek.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-emerald-700">
                                                <span className="mt-1.5 text-[8px] text-emerald-500">●</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Nincs kiemelendő erősség</p>
                                )}
                            </div>

                            <div className="rounded-2xl bg-amber-50 p-5 transition-all duration-300">
                                <div className="mb-3 flex items-center gap-2">
                                    <AlertTriangle className="size-5 text-amber-600" />
                                    <h3 className="font-semibold text-amber-800">Fejlesztendő</h3>
                                </div>
                                {result.fejlesztendo && result.fejlesztendo.length > 0 ? (
                                    <ul className="space-y-2">
                                        {result.fejlesztendo.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-amber-700">
                                                <span className="mt-1.5 text-[8px] text-amber-500">●</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Nincs kiemelendő fejlesztendő terület</p>
                                )}
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300">
                            <h2 className="mb-4 text-xl font-light text-gray-900">
                                Szempontok áttekintése
                            </h2>
                            <RadarChart result={result} />
                        </div>

                        {/* Criteria Details - Tabbed layout */}
                        <div className="mb-6">
                            <h2 className="mb-4 text-xl font-light text-gray-900">
                                Részletes értékelés
                            </h2>
                            <div className="flex gap-4">
                                {/* Left side - Tab list */}
                                <div className="w-64 shrink-0 space-y-1">
                                    {Object.entries(result.szempontok).map(([key, value]) => {
                                        const criteriaKey = key as CriteriaName;
                                        const meta = CRITERIA_META[criteriaKey];
                                        if (!meta) return null;

                                        const IconComp = CRITERIA_ICONS[key] || Target04;
                                        const isActive = activeTab === key;
                                        const pct = value.pont / meta.maxScore;
                                        const scoreColor = pct >= 0.7 ? "bg-emerald-50 text-emerald-700" : pct >= 0.4 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600";

                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setActiveTab(criteriaKey)}
                                                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                                                    isActive
                                                        ? "border border-gray-100 bg-white shadow-sm"
                                                        : "hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <IconComp className={`size-4 ${isActive ? "text-gray-900" : "text-gray-400"}`} />
                                                    <span className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-500"}`}>
                                                        {meta.displayName}
                                                    </span>
                                                </div>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor}`}>
                                                    {value.pont}/{meta.maxScore}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Right side - Active tab content */}
                                <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300">
                                    {(() => {
                                        const value = result.szempontok[activeTab];
                                        const meta = CRITERIA_META[activeTab];
                                        if (!value || !meta) return null;

                                        return (
                                            <>
                                                {/* Header with score */}
                                                <div className="mb-4 flex items-start justify-between">
                                                    <h3 className="text-xl font-light text-gray-900">
                                                        {meta.displayName}
                                                    </h3>
                                                    <div className="text-right">
                                                        <span className="text-4xl font-bold text-gray-900">{value.pont}</span>
                                                        <span className="text-xl text-gray-400"> / {meta.maxScore}</span>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                                    <div
                                                        className="h-full rounded-full bg-[#fff012] transition-all duration-300"
                                                        style={{ width: `${(value.pont / meta.maxScore) * 100}%` }}
                                                    />
                                                </div>

                                                {/* Description */}
                                                <p className="mb-6 text-[16px] leading-[26px] text-gray-500">
                                                    {value.indoklas}
                                                </p>

                                                {/* Suggestions */}
                                                {value.javaslatok && value.javaslatok.length > 0 && (
                                                    <div className="rounded-xl bg-amber-50/60 p-4">
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <Lightbulb02 className="size-4 text-amber-600" />
                                                            <h4 className="font-semibold text-amber-700">Javaslatok</h4>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {value.javaslatok.map((javaslat, index) => (
                                                                <li key={index} className="flex items-start gap-2 text-[16px] leading-[26px] text-gray-500">
                                                                    <span className="mt-2 text-[8px] text-amber-500">●</span>
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
                            {/* Color Analysis */}
                            {result.szinek && (
                                <div className="rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300">
                                    <div className="mb-5 flex items-center gap-3">
                                        <Palette className="size-5 text-purple-600" />
                                        <h3 className="text-xl font-light text-gray-900">Színpaletta elemzés</h3>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-purple-600">Harmónia</h4>
                                            <p className="text-sm leading-relaxed text-gray-500">{result.szinek.harmonia}</p>
                                        </div>
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-purple-600">Pszichológia</h4>
                                            <p className="text-sm leading-relaxed text-gray-500">{result.szinek.pszichologia}</p>
                                        </div>
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-emerald-600">Technikai</h4>
                                            <p className="text-sm leading-relaxed text-gray-500">{result.szinek.technikai}</p>
                                        </div>
                                        {result.szinek.javaslatok && result.szinek.javaslatok.length > 0 && (
                                            <div className="border-t border-gray-100 pt-5">
                                                <h4 className="mb-3 text-xs font-medium uppercase tracking-widest text-purple-600">Javaslatok</h4>
                                                <ul className="space-y-2">
                                                    {result.szinek.javaslatok.map((javaslat, index) => (
                                                        <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-gray-500">
                                                            <span className="mt-1.5 text-[8px] text-purple-400">●</span>
                                                            {javaslat}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Typography Analysis */}
                            {result.tipografia && (
                                <div className="rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300">
                                    <div className="mb-5 flex items-center gap-3">
                                        <TypeSquare className="size-5 text-blue-600" />
                                        <h3 className="text-xl font-light text-gray-900">Tipográfia elemzés</h3>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-blue-600">Karakter</h4>
                                            <p className="text-sm leading-relaxed text-gray-500">{result.tipografia.karakter}</p>
                                        </div>
                                        <div className="border-t border-gray-100 pt-5">
                                            <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-blue-600">Olvashatóság</h4>
                                            <p className="text-sm leading-relaxed text-gray-500">{result.tipografia.olvashatosag}</p>
                                        </div>
                                        {result.tipografia.javaslatok && result.tipografia.javaslatok.length > 0 && (
                                            <div className="border-t border-gray-100 pt-5">
                                                <h4 className="mb-3 text-xs font-medium uppercase tracking-widest text-blue-600">Javaslatok</h4>
                                                <ul className="space-y-2">
                                                    {result.tipografia.javaslatok.map((javaslat, index) => (
                                                        <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-gray-500">
                                                            <span className="mt-1.5 text-[8px] text-blue-400">●</span>
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
                            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300">
                                <div className="mb-5 flex items-center gap-3">
                                    <LayersThree01 className="size-5 text-teal-600" />
                                    <h3 className="text-xl font-light text-gray-900">Vizuális nyelv elemzés</h3>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-teal-600">Formák</h4>
                                        <p className="text-sm leading-relaxed text-gray-500">{result.vizualisNyelv.formak}</p>
                                    </div>
                                    <div>
                                        <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-teal-600">Elemek</h4>
                                        <p className="text-sm leading-relaxed text-gray-500">{result.vizualisNyelv.elemek}</p>
                                    </div>
                                    <div>
                                        <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-teal-600">Stílusegység</h4>
                                        <p className="text-sm leading-relaxed text-gray-500">{result.vizualisNyelv.stilusEgyseg}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CTA */}
                        <div className="rounded-2xl bg-gray-900 p-8 text-center sm:p-10">
                            <span className="mb-4 inline-block rounded-full bg-[#fff012] px-4 py-1.5 text-xs font-bold text-gray-900">
                                brandguide/AI
                            </span>
                            <h2 className="mb-3 text-2xl font-light text-white sm:text-3xl">
                                Szeretnéd továbbfejleszteni a brandedet?
                            </h2>
                            <p className="mx-auto mb-8 max-w-xl text-gray-400">
                                A brandguide/AI segít kidolgozni a teljes brand alapjaidat – a stratégiától a vizuális rendszerig.
                            </p>
                            <a href="https://ai.brandguide.hu/" target="_blank" rel="noopener noreferrer">
                                <button className="group inline-flex items-center gap-3 rounded-full bg-[#fff012] px-8 py-4 font-semibold text-gray-900 transition-all hover:brightness-95 hover:shadow-lg">
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
                            showLogo={!heroLogoVisible}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
