"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CRITERIA_META, CriteriaName } from "@/types";
import { ArrowRight, ArrowLeft, AlertCircle, TrendUp02, TrendDown02, Minus, RefreshCw05, Copy01, Check } from "@untitledui/icons";

interface RebrandingResult {
    id: string;
    type: 'rebranding';
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
        improvements: string[];
        regressions: string[];
        recommendations: string[];
    };
    createdAt: string;
}

type TabType = 'comparison' | 'new' | 'old';

export default function RebrandingResultPage() {
    const params = useParams();
    const id = params.id as string;

    const [result, setResult] = useState<RebrandingResult | null>(null);
    const [oldLogoUrl, setOldLogoUrl] = useState<string | null>(null);
    const [newLogoUrl, setNewLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('comparison');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchResult() {
            try {
                const { data, error: dbError } = await supabase
                    .from("analyses")
                    .select("*")
                    .eq("id", id)
                    .single();

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

    const handleCopyUrl = async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                    <h1 className="mb-2 text-2xl font-light text-gray-900">Hiba történt</h1>
                    <p className="mb-8 text-gray-500">{error}</p>
                    <Link href="/">
                        <button className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-white hover:bg-gray-800">
                            <ArrowLeft className="size-4" />
                            Vissza a főoldalra
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    const { oldLogoAnalysis, newLogoAnalysis, comparison } = result;
    const scoreDiff = newLogoAnalysis.osszpontszam - oldLogoAnalysis.osszpontszam;
    const isImproved = scoreDiff > 0;
    const isWorsened = scoreDiff < 0;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-900"
                    >
                        <ArrowLeft className="size-4" />
                        Vissza
                    </Link>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCopyUrl}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-all hover:border-gray-300 hover:text-gray-900"
                        >
                            {copied ? <Check className="size-4 text-emerald-500" /> : <Copy01 className="size-4" />}
                            {copied ? "Másolva!" : "Link másolása"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    {/* Hero section with logo comparison */}
                    <div className="mb-12 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]">
                        <div className="mx-auto mb-8 flex items-center justify-center gap-6">
                            {/* Old Logo */}
                            {oldLogoUrl && (
                                <div className="text-center">
                                    <div className="mb-2 inline-flex size-24 items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <img src={oldLogoUrl} alt="Régi logó" className="max-h-full max-w-full object-contain opacity-60" />
                                    </div>
                                    <div className="text-sm text-gray-400">Régi</div>
                                    <div className="text-2xl font-light text-gray-500">{oldLogoAnalysis.osszpontszam}</div>
                                </div>
                            )}

                            {/* Arrow with score change */}
                            <div className="flex flex-col items-center gap-2">
                                <div className={`flex size-12 items-center justify-center rounded-full ${
                                    isImproved ? "bg-emerald-50" : isWorsened ? "bg-red-50" : "bg-gray-50"
                                }`}>
                                    <ArrowRight className={`size-6 ${
                                        isImproved ? "text-emerald-500" : isWorsened ? "text-red-500" : "text-gray-400"
                                    }`} />
                                </div>
                                <span className={`text-sm font-medium ${
                                    isImproved ? "text-emerald-600" : isWorsened ? "text-red-600" : "text-gray-500"
                                }`}>
                                    {isImproved ? "+" : ""}{scoreDiff} pont
                                </span>
                            </div>

                            {/* New Logo */}
                            {newLogoUrl && (
                                <div className="text-center">
                                    <div className="mb-2 inline-flex size-24 items-center justify-center rounded-xl border-2 border-[#fff012] bg-white p-4 shadow-lg shadow-[#fff012]/20">
                                        <img src={newLogoUrl} alt="Új logó" className="max-h-full max-w-full object-contain" />
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">Új</div>
                                    <div className="text-2xl font-light text-gray-900">{newLogoAnalysis.osszpontszam}</div>
                                </div>
                            )}
                        </div>

                        {/* Success rate badge */}
                        <div className={`inline-flex items-center gap-2 rounded-full px-6 py-3 ${
                            isImproved
                                ? "bg-emerald-50 text-emerald-700"
                                : isWorsened
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-50 text-gray-700"
                        }`}>
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

                    {/* Tabs */}
                    <div className="mb-8 flex justify-center gap-2 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]" style={{ animationDelay: "0.1s" }}>
                        {[
                            { id: 'comparison' as TabType, label: 'Összehasonlítás' },
                            { id: 'new' as TabType, label: 'Új logó' },
                            { id: 'old' as TabType, label: 'Régi logó' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? "bg-gray-900 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]" style={{ animationDelay: "0.2s" }}>
                        {activeTab === 'comparison' && (
                            <div className="space-y-8">
                                {/* Criteria comparison table */}
                                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                                    <h2 className="mb-6 text-lg font-medium text-gray-900">Kritériumonkénti változás</h2>
                                    <div className="space-y-4">
                                        {Object.entries(newLogoAnalysis.szempontok).map(([key, newValue]) => {
                                            const criteriaKey = key as CriteriaName;
                                            const meta = CRITERIA_META[criteriaKey];
                                            const oldValue = oldLogoAnalysis.szempontok[key];
                                            if (!meta || !oldValue) return null;

                                            const change = newValue.pont - oldValue.pont;
                                            const isUp = change > 0;
                                            const isDown = change < 0;

                                            return (
                                                <div key={key} className="flex items-center gap-4 rounded-xl border border-gray-100 p-4">
                                                    <div className="flex-1">
                                                        <span className="font-medium text-gray-900">{meta.displayName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-sm">
                                                        <span className="w-16 text-center text-gray-400">{oldValue.pont}/{meta.maxScore}</span>
                                                        <ArrowRight className="size-4 text-gray-300" />
                                                        <span className="w-16 text-center font-medium text-gray-900">{newValue.pont}/{meta.maxScore}</span>
                                                        <div className={`flex w-20 items-center justify-end gap-1 ${
                                                            isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-gray-400"
                                                        }`}>
                                                            {isUp ? <TrendUp02 className="size-4" /> : isDown ? <TrendDown02 className="size-4" /> : <Minus className="size-4" />}
                                                            <span>{isUp ? "+" : ""}{change}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Improvements & Regressions */}
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Improvements */}
                                    {comparison.improvements.length > 0 && (
                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
                                            <div className="mb-4 flex items-center gap-2">
                                                <TrendUp02 className="size-5 text-emerald-600" />
                                                <h3 className="font-medium text-emerald-900">Javulások</h3>
                                            </div>
                                            <ul className="space-y-3">
                                                {comparison.improvements.map((item, idx) => (
                                                    <li key={idx} className="text-sm text-emerald-800">{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Regressions */}
                                    {comparison.regressions.length > 0 && (
                                        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6">
                                            <div className="mb-4 flex items-center gap-2">
                                                <TrendDown02 className="size-5 text-amber-600" />
                                                <h3 className="font-medium text-amber-900">Visszalépések</h3>
                                            </div>
                                            <ul className="space-y-3">
                                                {comparison.regressions.map((item, idx) => (
                                                    <li key={idx} className="text-sm text-amber-800">{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Recommendations */}
                                {comparison.recommendations.length > 0 && (
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
                                        <div className="mb-4 flex items-center gap-2">
                                            <RefreshCw05 className="size-5 text-gray-600" />
                                            <h3 className="font-medium text-gray-900">Javaslatok a továbbfejlesztéshez</h3>
                                        </div>
                                        <ul className="space-y-3">
                                            {comparison.recommendations.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                                                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#fff012]" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'new' && (
                            <LogoAnalysisView
                                analysis={newLogoAnalysis}
                                logoUrl={newLogoUrl}
                                title="Új logó elemzése"
                                accent={true}
                            />
                        )}

                        {activeTab === 'old' && (
                            <LogoAnalysisView
                                analysis={oldLogoAnalysis}
                                logoUrl={oldLogoUrl}
                                title="Régi logó elemzése"
                                accent={false}
                            />
                        )}
                    </div>

                    {/* CTA */}
                    <div className="mt-12 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]" style={{ animationDelay: "0.3s" }}>
                        <Link href="/teszt">
                            <button className="group inline-flex items-center gap-3 rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white transition-all hover:bg-gray-800 hover:shadow-lg">
                                Új elemzés indítása
                                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                            </button>
                        </Link>
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
    accent
}: {
    analysis: RebrandingResult['oldLogoAnalysis'];
    logoUrl: string | null;
    title: string;
    accent: boolean;
}) {
    return (
        <div className="space-y-8">
            {/* Score header */}
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
                {logoUrl && (
                    <div className={`mx-auto mb-6 inline-flex size-24 items-center justify-center rounded-xl border-2 ${
                        accent ? "border-[#fff012] bg-[#fff012]/10" : "border-gray-200 bg-gray-50"
                    } p-4`}>
                        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                )}
                <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-gray-400">{title}</h2>
                <div className="mb-2 text-6xl font-extralight text-gray-900">{analysis.osszpontszam}</div>
                <div className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${
                    accent ? "bg-[#fff012] text-gray-900" : "bg-gray-100 text-gray-700"
                }`}>
                    {analysis.minosites}
                </div>
                <p className="mt-6 text-gray-500">{analysis.osszegzes}</p>
            </div>

            {/* Criteria breakdown */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="mb-6 text-lg font-medium text-gray-900">Kritériumok</h3>
                <div className="space-y-4">
                    {Object.entries(analysis.szempontok).map(([key, value]) => {
                        const criteriaKey = key as CriteriaName;
                        const meta = CRITERIA_META[criteriaKey];
                        if (!meta) return null;

                        const percentage = (value.pont / meta.maxScore) * 100;

                        return (
                            <div key={key} className="rounded-xl border border-gray-100 p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <h4 className="font-medium text-gray-900">{meta.displayName}</h4>
                                    <span className="text-sm text-gray-400">{value.pont}/{meta.maxScore}</span>
                                </div>
                                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className={`h-full rounded-full ${
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
