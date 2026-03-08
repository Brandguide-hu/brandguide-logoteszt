"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy01, Check, Share07 } from "@untitledui/icons";
import { CATEGORIES, TIER_INFO, CRITERIA_META, CriteriaName } from "@/types";

interface CriteriaScore {
    pont: number;
    maxPont: number;
    indoklas: string;
    javaslatok?: string[];
}

interface ResultSidebarProps {
    logoUrl: string | null;
    score: number;
    rating: string;
    logoName?: string | null;
    creatorName?: string | null;
    category?: string | null;
    tier?: string | null;
    createdAt?: string | null;
    topPercent?: number | null;
    szempontok?: Record<string, CriteriaScore>;
    onCriteriaClick?: (key: string) => void;
}

export function ResultSidebar({ logoUrl, score, rating, logoName, creatorName, category, tier, createdAt, topPercent, szempontok, onCriteriaClick }: ResultSidebarProps) {
    const [copied, setCopied] = useState(false);
    const [showSticky, setShowSticky] = useState(false);
    const [stickyWidth, setStickyWidth] = useState(0);
    const [stickyLeft, setStickyLeft] = useState(0);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Measure container width and position for the fixed sticky card
    const measureContainer = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setStickyWidth(rect.width);
            setStickyLeft(rect.left);
        }
    }, []);

    // Watch when the last sidebar card scrolls out of view (upward)
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Only show sticky when sentinel scrolled ABOVE viewport (not below)
                const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
                setShowSticky(scrolledPast);
            },
            { threshold: 0 }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, []);

    // Measure on mount, resize, and when sticky becomes visible
    useEffect(() => {
        measureContainer();
        window.addEventListener('resize', measureContainer);
        return () => window.removeEventListener('resize', measureContainer);
    }, [measureContainer]);

    useEffect(() => {
        if (showSticky) measureContainer();
    }, [showSticky, measureContainer]);

    const getShareUrl = () => {
        if (typeof window !== "undefined") {
            return window.location.href;
        }
        return "";
    };

    const getShareText = () => {
        return `A logóm ${score}/100 pontot kapott a LogoLab-on!`;
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

    return (
        <div ref={containerRef} className="relative">
            {/* Normal sidebar content - scrolls normally */}
            <div className="space-y-6">
                {/* 1. Logo preview + pontszám */}
                {logoUrl && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-6">
                        <div className="mb-4 flex items-center justify-center rounded-xl border border-gray-200 bg-white aspect-square p-6">
                            <img
                                src={logoUrl}
                                alt="Elemzett logó"
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900">{score}<span className="text-lg font-normal text-gray-400">/100</span></div>
                            <div className="mt-1 inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                                {rating}
                            </div>
                            <p className="mt-2 text-[10px] text-gray-400 tracking-wider uppercase">powered by brandguide SCORE</p>
                        </div>
                    </div>
                )}

                {/* 2. Logo adatok */}
                {(logoName || creatorName || category || tier || createdAt) && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 text-sm space-y-2.5">
                        {logoName && (
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Logo neve</span>
                                <span className="font-medium text-gray-900 text-right truncate">{logoName}</span>
                            </div>
                        )}
                        {creatorName && (
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Készítő</span>
                                <span className="font-medium text-gray-900 text-right truncate">{creatorName}</span>
                            </div>
                        )}
                        {category && (
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Kategória</span>
                                <span className="font-medium text-gray-900 text-right">{CATEGORIES[category as keyof typeof CATEGORIES] || category}</span>
                            </div>
                        )}
                        {tier && TIER_INFO[tier as keyof typeof TIER_INFO] && (
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Csomag</span>
                                <span className="font-medium text-gray-900">{TIER_INFO[tier as keyof typeof TIER_INFO].label}</span>
                            </div>
                        )}
                        {createdAt && (
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Dátum</span>
                                <span className="font-medium text-gray-900">{new Date(createdAt).toLocaleDateString('hu-HU')}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Megosztás */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Share07 className="size-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Megosztás</h3>
                    </div>
                    <div className="space-y-2">
                        <button
                            onClick={handleCopyUrl}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
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
                        <div className="flex gap-2">
                            <button
                                onClick={handleShareFacebook}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#1877F2]/90"
                            >
                                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </button>
                            <button
                                onClick={handleShareLinkedIn}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#0A66C2]/90"
                            >
                                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                            </button>
                            <button
                                onClick={handleShareX}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-gray-800"
                            >
                                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. Banner */}
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
                    <div className="flex aspect-[4/3] items-center justify-center text-center">
                        <p className="text-sm text-gray-400">Banner helye<br />(admin-ból tölthető)</p>
                    </div>
                </div>

                {/* Sentinel - when this scrolls out of view, show sticky card */}
                <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />
            </div>

            {/* Sticky compact logo+score card - fixed to navbar after sidebar scrolls out */}
            {logoUrl && showSticky && stickyWidth > 0 && (
                <div
                    className="fixed z-40 animate-[tooltipFade_150ms_ease-out]"
                    style={{
                        top: 'calc(4rem + 12px)',
                        width: stickyWidth,
                        left: stickyLeft,
                    }}
                >
                    <div className="rounded-2xl border border-gray-100 bg-white/95 backdrop-blur-sm p-4 shadow-lg">
                        {/* Módszertan caption */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                                Brandguide · Paul Rand 7 kritériuma
                            </span>
                            <span className="bg-[#FFF012] text-gray-900 text-[8px] font-bold font-mono uppercase tracking-wide px-1.5 py-px rounded border border-black/8">
                                brandguide SCORE
                            </span>
                        </div>

                        {/* Logo + score sor */}
                        <div className="flex items-center gap-4">
                            <div className="shrink-0 flex items-center justify-center rounded-xl border border-gray-200 bg-white w-16 h-16 p-2">
                                <img
                                    src={logoUrl}
                                    alt="Elemzett logó"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{score}<span className="text-sm font-normal text-gray-400">/100</span></div>
                                {/* Benchmark sor */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-gray-700">
                                        {rating}
                                    </span>
                                    {topPercent !== null && topPercent !== undefined && (
                                        <>
                                            <span className="text-gray-300 text-xs">·</span>
                                            <span className="text-[11px] text-gray-500">
                                                Top <strong className="text-gray-900">{topPercent}%</strong>
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Kritérium dot-pill-ek */}
                        {szempontok && Object.keys(szempontok).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex flex-wrap gap-1">
                                    {(Object.entries(szempontok) as [string, CriteriaScore][]).map(([key, value]) => {
                                        const meta = CRITERIA_META[key as CriteriaName];
                                        if (!meta) return null;
                                        const pct = value.pont / meta.maxScore;
                                        const dotColor = pct >= 0.75 ? 'bg-green-500' : pct >= 0.50 ? 'bg-amber-400' : 'bg-red-500';
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => onCriteriaClick?.(key)}
                                                className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 rounded-full px-2 py-0.5 text-[10px] text-gray-600 font-medium transition-all cursor-pointer"
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                                                {meta.displayName}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
