"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CRITERIA_META, CriteriaName } from "@/types";
import {
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    TrendUp02,
    TrendDown02,
    Minus,
    RefreshCw05,
    Copy01,
    Check,
    Share07,
    ThumbsUp,
    ThumbsDown,
} from "@untitledui/icons";

interface RebrandingResult {
    id: string;
    type: "rebranding";
    osszefoglalo: string;
    oldLogoAnalysis: {
        osszpontszam: number;
        minosites: string;
        szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>;
        osszegzes: string;
    };
    newLogoAnalysis: {
        osszpontszam: number;
        minosites: string;
        szempontok: Record<string, { pont: number; maxPont: number; indoklas: string }>;
        osszegzes: string;
    };
    comparison: {
        successRate: number;
        criteriaChanges: Record<string, { valtozas: string }>;
        improvements: string[];
        regressions: string[];
        recommendations: string[];
    };
    createdAt: string;
}

type TabType = "comparison" | "new" | "old";

// Radar Chart Component
function RadarChart({
    oldScores,
    newScores,
}: {
    oldScores: Record<string, number>;
    newScores: Record<string, number>;
}) {
    const criteria = [
        { key: "megkulonboztethetoseg", label: "Megkül.", max: 20 },
        { key: "egyszuruseg", label: "Egyszer.", max: 18 },
        { key: "alkalmazhatosag", label: "Alkalmaz.", max: 15 },
        { key: "emlekezetesseg", label: "Emlékez.", max: 15 },
        { key: "idotallosasg", label: "Időtálló", max: 12 },
        { key: "univerzalitas", label: "Univerzál.", max: 10 },
        { key: "lathatosag", label: "Láthat.", max: 10 },
    ];

    const centerX = 150;
    const centerY = 150;
    const maxRadius = 120;

    const getPoint = (index: number, value: number, max: number) => {
        const angle = (Math.PI * 2 * index) / criteria.length - Math.PI / 2;
        const radius = (value / max) * maxRadius;
        return {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        };
    };

    const oldPoints = criteria.map((c, i) => getPoint(i, oldScores[c.key] || 0, c.max));
    const newPoints = criteria.map((c, i) => getPoint(i, newScores[c.key] || 0, c.max));

    const oldPath = oldPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
    const newPath = newPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

    // Grid circles
    const gridCircles = [0.25, 0.5, 0.75, 1].map((scale) => (
        <circle key={scale} cx={centerX} cy={centerY} r={maxRadius * scale} fill="none" stroke="#e5e7eb" strokeWidth="1" />
    ));

    // Axis lines
    const axisLines = criteria.map((_, i) => {
        const angle = (Math.PI * 2 * i) / criteria.length - Math.PI / 2;
        const endX = centerX + maxRadius * Math.cos(angle);
        const endY = centerY + maxRadius * Math.sin(angle);
        return <line key={i} x1={centerX} y1={centerY} x2={endX} y2={endY} stroke="#e5e7eb" strokeWidth="1" />;
    });

    // Labels
    const labels = criteria.map((c, i) => {
        const angle = (Math.PI * 2 * i) / criteria.length - Math.PI / 2;
        const labelRadius = maxRadius + 20;
        const x = centerX + labelRadius * Math.cos(angle);
        const y = centerY + labelRadius * Math.sin(angle);
        return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 text-xs">
                {c.label}
            </text>
        );
    });

    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 300 300" className="w-full max-w-[300px]">
                {gridCircles}
                {axisLines}
                {/* Old logo - gray dashed */}
                <path d={oldPath} fill="rgba(156, 163, 175, 0.2)" stroke="#9ca3af" strokeWidth="2" strokeDasharray="4 4" />
                {/* New logo - yellow solid */}
                <path d={newPath} fill="rgba(255, 240, 18, 0.3)" stroke="#fff012" strokeWidth="2" />
                {labels}
            </svg>
            <div className="mt-4 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="h-0.5 w-6 border-t-2 border-dashed border-gray-400" />
                    <span className="text-gray-500">Régi logó</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-0.5 w-6 bg-[#fff012]" />
                    <span className="text-gray-900">Új logó</span>
                </div>
            </div>
        </div>
    );
}

export default function RebrandingResultPage() {
    const params = useParams();
    const id = params.id as string;

    const [result, setResult] = useState<RebrandingResult | null>(null);
    const [oldLogoUrl, setOldLogoUrl] = useState<string | null>(null);
    const [newLogoUrl, setNewLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>("comparison");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchResult() {
            try {
                const { data, error: dbError } = await supabase.from("analyses").select("*").eq("id", id).single();

                if (dbError) throw dbError;
                if (!data) throw new Error("Eredmény nem található");

                setResult(data.result as unknown as RebrandingResult);
                setNewLogoUrl(`data:image/png;base64,${data.logo_base64}`);
                if (data.old_logo_base64) {
                    setOldLogoUrl(`data:image/png;base64,${data.old_logo_base64}`);
                }
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
        if (!result) return "";
        const scoreDiff = result.newLogoAnalysis.osszpontszam - result.oldLogoAnalysis.osszpontszam;
        return scoreDiff > 0
            ? `A rebrandelés sikeres! Az új logóm ${scoreDiff} ponttal jobb lett a Brandguide Logóteszten!`
            : `Összehasonlítottam a régi és új logómat a Brandguide Logóteszten!`;
    };

    const handleCopyUrl = async () => {
        await navigator.clipboard.writeText(getShareUrl());
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
                    <p className="mb-8 text-gray-500">Lehet, hogy az elemzés már nem elérhető, vagy hibás a link.</p>
                    <Link href="/teszt/rebranding">
                        <button className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white transition-all hover:bg-gray-800">
                            <RefreshCw05 className="size-4" />
                            Új teszt indítása
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    const { oldLogoAnalysis, newLogoAnalysis, comparison, osszefoglalo } = result;
    const scoreDiff = newLogoAnalysis.osszpontszam - oldLogoAnalysis.osszpontszam;
    const isImproved = scoreDiff > 0;
    const isWorsened = scoreDiff < 0;

    // Prepare scores for radar chart
    const oldScores: Record<string, number> = {};
    const newScores: Record<string, number> = {};
    Object.entries(oldLogoAnalysis.szempontok).forEach(([key, value]) => {
        oldScores[key] = value.pont;
    });
    Object.entries(newLogoAnalysis.szempontok).forEach(([key, value]) => {
        newScores[key] = value.pont;
    });

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-600";
        if (score >= 60) return "text-[#d4c800]";
        if (score >= 40) return "text-amber-500";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-5xl grid-cols-3 items-center">
                    <Link
                        href="/teszt"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-900"
                    >
                        <ArrowLeft className="size-4" />
                        Új teszt
                    </Link>
                    <Link href="/" className="justify-self-center">
                        <img src="/logolab-logo-new.svg" alt="LogoLab" className="h-12" />
                    </Link>
                    <div></div>
                </div>
            </div>

            <div className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    {/* Hero section - Logo comparison with scores */}
                    <div className="mb-16 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]">
                        <p className="mb-4 text-sm text-gray-500">Elemzés kész</p>
                        <h1 className="mb-8 text-3xl font-light text-gray-900 md:text-4xl">Rebranding összehasonlítás</h1>

                        {/* Logos side by side with scores */}
                        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center md:gap-12">
                            {/* Old Logo */}
                            {oldLogoUrl && (
                                <div className="text-center">
                                    <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-8">
                                        <img
                                            src={oldLogoUrl}
                                            alt="Régi logó"
                                            className="max-h-32 max-w-[200px] object-contain opacity-60"
                                        />
                                    </div>
                                    <div className="text-sm text-gray-400">Régi logó</div>
                                    <div className={`text-5xl font-extralight ${getScoreColor(oldLogoAnalysis.osszpontszam)} md:text-6xl`}>
                                        {oldLogoAnalysis.osszpontszam}
                                    </div>
                                    <div className="mt-1 text-sm text-gray-400">/ 100 pont</div>
                                    <div className="mt-3 inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                                        {oldLogoAnalysis.minosites}
                                    </div>
                                </div>
                            )}

                            {/* Arrow with score change */}
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className={`flex size-16 items-center justify-center rounded-full ${
                                        isImproved ? "bg-emerald-50" : isWorsened ? "bg-red-50" : "bg-gray-50"
                                    }`}
                                >
                                    <ArrowRight
                                        className={`size-8 ${isImproved ? "text-emerald-500" : isWorsened ? "text-red-500" : "text-gray-400"}`}
                                    />
                                </div>
                                <span
                                    className={`text-xl font-semibold ${
                                        isImproved ? "text-emerald-600" : isWorsened ? "text-red-600" : "text-gray-500"
                                    }`}
                                >
                                    {isImproved ? "+" : ""}
                                    {scoreDiff} pont
                                </span>
                            </div>

                            {/* New Logo */}
                            {newLogoUrl && (
                                <div className="text-center">
                                    <div className="mb-4 rounded-2xl border-2 border-[#fff012] bg-white p-8 shadow-lg shadow-[#fff012]/20">
                                        <img src={newLogoUrl} alt="Új logó" className="max-h-32 max-w-[200px] object-contain" />
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">Új logó</div>
                                    <div className={`text-5xl font-extralight ${getScoreColor(newLogoAnalysis.osszpontszam)} md:text-6xl`}>
                                        {newLogoAnalysis.osszpontszam}
                                    </div>
                                    <div className="mt-1 text-sm text-gray-400">/ 100 pont</div>
                                    <div className="mt-3 inline-block rounded-full bg-[#fff012] px-3 py-1 text-sm font-medium text-gray-900">
                                        {newLogoAnalysis.minosites}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Success rate badge */}
                        <div
                            className={`mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 ${
                                isImproved ? "bg-emerald-50 text-emerald-700" : isWorsened ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"
                            }`}
                        >
                            {isImproved ? (
                                <TrendUp02 className="size-5" />
                            ) : isWorsened ? (
                                <TrendDown02 className="size-5" />
                            ) : (
                                <Minus className="size-5" />
                            )}
                            <span className="font-medium">
                                {isImproved
                                    ? `Az új logó ${Math.abs(comparison.successRate).toFixed(0)}%-kal erősebb`
                                    : isWorsened
                                      ? `Az új logó ${Math.abs(comparison.successRate).toFixed(0)}%-kal gyengébb`
                                      : "A két logó közel azonos erősségű"}
                            </span>
                        </div>
                    </div>

                    {/* Summary section */}
                    {osszefoglalo && (
                        <div className="mb-12 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]" style={{ animationDelay: "0.1s" }}>
                            <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-400">Összefoglaló</h2>
                            <p className="text-lg leading-relaxed text-gray-600">{osszefoglalo}</p>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="mx-auto mb-12 h-px w-16 bg-gray-100" />

                    {/* Tabs */}
                    <div
                        className="mb-8 flex justify-center gap-2 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                        style={{ animationDelay: "0.2s" }}
                    >
                        {[
                            { id: "comparison" as TabType, label: "Összehasonlítás" },
                            { id: "new" as TabType, label: "Új logó" },
                            { id: "old" as TabType, label: "Régi logó" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                                    activeTab === tab.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="mb-12 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]" style={{ animationDelay: "0.3s" }}>
                        {activeTab === "comparison" && (
                            <div className="space-y-8">
                                {/* Improvements & Regressions - side by side */}
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Improvements */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <div className="mb-4 flex items-center gap-2">
                                            <div className="rounded-lg bg-emerald-50 p-1.5">
                                                <ThumbsUp className="size-4 text-emerald-600" />
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-900">Javulások</h3>
                                        </div>
                                        {comparison.improvements.length > 0 ? (
                                            <ul className="space-y-3">
                                                {comparison.improvements.map((item, index) => (
                                                    <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                                                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-400">Nincs jelentős javulás</p>
                                        )}
                                    </div>

                                    {/* Regressions */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-6">
                                        <div className="mb-4 flex items-center gap-2">
                                            <div className="rounded-lg bg-amber-50 p-1.5">
                                                <ThumbsDown className="size-4 text-amber-600" />
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-900">Visszalépések</h3>
                                        </div>
                                        {comparison.regressions.length > 0 ? (
                                            <ul className="space-y-3">
                                                {comparison.regressions.map((item, index) => (
                                                    <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                                                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-400">Nincs visszalépés</p>
                                        )}
                                    </div>
                                </div>

                                {/* Radar Chart */}
                                <div className="rounded-xl border border-gray-100 bg-white p-6">
                                    <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-gray-400">Szempontok áttekintése</h2>
                                    <RadarChart oldScores={oldScores} newScores={newScores} />
                                </div>

                                {/* Criteria comparison */}
                                <div>
                                    <div className="mb-6 flex items-center gap-3">
                                        <h2 className="text-sm font-medium uppercase tracking-widest text-gray-400">Kritériumonkénti változás</h2>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">7 szempont</span>
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(newLogoAnalysis.szempontok).map(([key, newValue]) => {
                                            const criteriaKey = key as CriteriaName;
                                            const meta = CRITERIA_META[criteriaKey];
                                            const oldValue = oldLogoAnalysis.szempontok[key];
                                            const changeExplanation = comparison.criteriaChanges?.[key]?.valtozas;
                                            if (!meta || !oldValue) return null;

                                            const change = newValue.pont - oldValue.pont;
                                            const isUp = change > 0;
                                            const isDown = change < 0;
                                            const newPercentage = (newValue.pont / meta.maxScore) * 100;

                                            return (
                                                <div
                                                    key={key}
                                                    className="group rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:border-gray-200 hover:shadow-sm"
                                                >
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <h3 className="font-medium text-gray-900">{meta.displayName}</h3>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm text-gray-400">
                                                                {oldValue.pont} → {newValue.pont}/{meta.maxScore}
                                                            </span>
                                                            <div
                                                                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                    isUp
                                                                        ? "bg-emerald-50 text-emerald-700"
                                                                        : isDown
                                                                          ? "bg-red-50 text-red-700"
                                                                          : "bg-gray-50 text-gray-500"
                                                                }`}
                                                            >
                                                                {isUp ? <TrendUp02 className="size-3" /> : isDown ? <TrendDown02 className="size-3" /> : null}
                                                                {isUp ? "+" : ""}
                                                                {change}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                newPercentage >= 70 ? "bg-emerald-500" : newPercentage >= 50 ? "bg-[#fff012]" : "bg-amber-500"
                                                            }`}
                                                            style={{ width: `${newPercentage}%` }}
                                                        />
                                                    </div>
                                                    {changeExplanation && <p className="text-sm text-gray-500">{changeExplanation}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "new" && (
                            <LogoAnalysisView analysis={newLogoAnalysis} logoUrl={newLogoUrl} title="Új logó elemzése" accent={true} />
                        )}

                        {activeTab === "old" && (
                            <LogoAnalysisView analysis={oldLogoAnalysis} logoUrl={oldLogoUrl} title="Régi logó elemzése" accent={false} />
                        )}
                    </div>

                    {/* Recommendations */}
                    {comparison.recommendations.length > 0 && (
                        <div
                            className="mb-12 rounded-xl border border-gray-100 bg-gray-50/50 p-6 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                            style={{ animationDelay: "0.6s" }}
                        >
                            <div className="mb-4 flex items-center gap-2">
                                <RefreshCw05 className="size-4 text-gray-400" />
                                <h3 className="text-sm font-medium text-gray-900">Javaslatok a továbbfejlesztéshez</h3>
                            </div>
                            <ul className="space-y-3">
                                {comparison.recommendations.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#fff012]" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
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
                        <Link href="/teszt/rebranding">
                            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:shadow-sm">
                                <RefreshCw05 className="size-4" />
                                Új rebranding teszt
                            </button>
                        </Link>
                        <Link href="/teszt">
                            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:shadow-sm">
                                Egyedi logó tesztelése
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
                        <h2 className="mb-3 text-2xl font-light text-white md:text-3xl">Szeretnéd továbbfejleszteni a brandedet?</h2>
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

// Sub-component for individual logo analysis view
function LogoAnalysisView({
    analysis,
    logoUrl,
    title,
    accent,
}: {
    analysis: RebrandingResult["oldLogoAnalysis"];
    logoUrl: string | null;
    title: string;
    accent: boolean;
}) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-600";
        if (score >= 60) return "text-[#d4c800]";
        if (score >= 40) return "text-amber-500";
        return "text-red-500";
    };

    return (
        <div className="space-y-6">
            {/* Score header */}
            <div className="text-center">
                {logoUrl && (
                    <div
                        className={`mx-auto mb-6 inline-block rounded-2xl border ${accent ? "border-[#fff012] shadow-lg shadow-[#fff012]/20" : "border-gray-100"} bg-white p-8`}
                    >
                        <img src={logoUrl} alt="Logo" className="max-h-32 max-w-[200px] object-contain" />
                    </div>
                )}
                <div className={`text-8xl font-extralight ${getScoreColor(analysis.osszpontszam)} md:text-9xl`}>{analysis.osszpontszam}</div>
                <div className="mt-2 text-sm text-gray-400">/ 100 pont</div>
                <div
                    className={`mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-medium ${accent ? "bg-[#fff012] text-gray-900" : "bg-gray-100 text-gray-700"}`}
                >
                    {analysis.minosites}
                </div>
            </div>

            {/* Summary */}
            <div>
                <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-400">{title}</h2>
                <p className="text-lg leading-relaxed text-gray-600">{analysis.osszegzes}</p>
            </div>

            {/* Divider */}
            <div className="mx-auto h-px w-16 bg-gray-100" />

            {/* Criteria breakdown */}
            <div>
                <div className="mb-6 flex items-center gap-3">
                    <h2 className="text-sm font-medium uppercase tracking-widest text-gray-400">Részletes értékelés</h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">7 szempont</span>
                </div>
                <div className="space-y-3">
                    {Object.entries(analysis.szempontok).map(([key, value]) => {
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
                                        <span className="text-sm text-gray-400">
                                            {value.pont}/{meta.maxScore}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-300 ${
                                                percentage >= 70
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : percentage >= 50
                                                      ? "bg-[#fff012]/20 text-gray-700"
                                                      : "bg-amber-50 text-amber-700"
                                            }`}
                                        >
                                            {Math.round(percentage)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            percentage >= 70 ? "bg-emerald-500" : percentage >= 50 ? "bg-[#fff012]" : "bg-amber-500"
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
        </div>
    );
}
