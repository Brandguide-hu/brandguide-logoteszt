"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CriteriaName, CriteriaScore, CRITERIA_META } from "@/types";
import {
    Target04, Stars01, Grid01, Lightbulb05, Clock, Globe01, Eye,
    Lightbulb02,
} from "@untitledui/icons";
import { ComponentType, SVGAttributes } from "react";

// Markdown bold (**text**) → <strong> konverzió
function renderWithBold(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold text-gray-700">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
}

const CRITERIA_ICONS: Record<string, ComponentType<SVGAttributes<SVGSVGElement>>> = {
    megkulonboztethetoseg: Target04,
    egyszeruseg: Stars01,
    alkalmazhatosag: Grid01,
    emlekezetesseg: Lightbulb05,
    idotallosag: Clock,
    univerzalitas: Globe01,
    lathatosag: Eye,
};

const CRITERIA_ORDER: CriteriaName[] = [
    'lathatosag', 'megkulonboztethetoseg', 'egyszeruseg',
    'alkalmazhatosag', 'emlekezetesseg', 'idotallosag', 'univerzalitas'
];

function getScoreAccentColor(pont: number, maxPont: number): string {
    const pct = pont / maxPont;
    if (pct >= 0.7) return 'rgb(23 178 106)';   // success-500
    if (pct >= 0.4) return 'rgb(247 144 9)';    // warning-500
    return 'rgb(240 68 56)';                      // error-500
}

function getScoreBadgeClasses(pont: number, maxPont: number): string {
    const pct = pont / maxPont;
    if (pct >= 0.7) return 'bg-emerald-50 text-emerald-700';
    if (pct >= 0.4) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-600';
}

interface MobileCriteriaCarouselProps {
    szempontok: Record<CriteriaName, CriteriaScore>;
    isLight: boolean;
    analysisId: string;
}

export function MobileCriteriaCarousel({ szempontok, isLight, analysisId }: MobileCriteriaCarouselProps) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    // IntersectionObserver for active card detection
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const idx = cardRefs.current.findIndex(r => r === entry.target);
                        if (idx !== -1) setActiveIndex(idx);
                    }
                });
            },
            { threshold: 0.5, root: container }
        );

        cardRefs.current.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, []);

    const setCardRef = useCallback((el: HTMLDivElement | null, idx: number) => {
        cardRefs.current[idx] = el;
    }, []);

    return (
        <div className="block sm:hidden">
            {/* Scroll container */}
            <div
                ref={containerRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 -mx-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ paddingRight: 'calc(15% + 16px)' }}
            >
                {CRITERIA_ORDER.map((key, i) => {
                    const value = szempontok[key];
                    const meta = CRITERIA_META[key];
                    if (!value || !meta) return null;

                    const accentColor = getScoreAccentColor(value.pont, meta.maxScore);
                    const badgeClasses = getScoreBadgeClasses(value.pont, meta.maxScore);
                    const IconComp = CRITERIA_ICONS[key] || Target04;
                    const progressPct = (value.pont / meta.maxScore) * 100;

                    return (
                        <div
                            key={key}
                            ref={(el) => setCardRef(el, i)}
                            className="snap-start min-w-[85vw] flex-shrink-0 rounded-xl border border-[#E5E7EB] bg-white shadow-md overflow-hidden"
                        >
                            {/* 4px color strip */}
                            <div style={{ height: 4, background: accentColor }} />

                            {/* Content */}
                            <div className="p-5">
                                {/* Header: name + score badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <IconComp className="size-4 text-gray-500" />
                                        <h3 className="text-[16px] font-semibold text-gray-900">
                                            {meta.displayName}
                                        </h3>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClasses}`}>
                                        {value.pont}/{meta.maxScore}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ width: `${progressPct}%`, background: accentColor }}
                                    />
                                </div>

                                {/* Content: description + suggestions */}
                                {isLight ? (
                                    <div className="relative">
                                        <div className="blur-sm select-none pointer-events-none opacity-60">
                                            <p className="mb-4 text-[14px] leading-[1.6] text-gray-500">
                                                A részletes szöveges indoklás és a fejlesztési javaslatok a MAX elemzésben érhetők el. Frissíts a teljes csomagra a részletes visszajelzésért.
                                            </p>
                                            <div className="rounded-xl bg-amber-50/60 p-3">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <Lightbulb02 className="size-3.5 text-amber-600" />
                                                    <h4 className="text-sm font-semibold text-amber-700">Javaslatok</h4>
                                                </div>
                                                <ul className="space-y-1.5">
                                                    <li className="flex items-start gap-2 text-[14px] leading-[1.6] text-gray-500">
                                                        <span className="shrink-0 mt-[7px] text-[7px] leading-none text-amber-500">●</span>
                                                        Részletes fejlesztési javaslat
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
                                            <div className="text-center px-4 py-3">
                                                <p className="text-xs text-gray-500 mb-2">Részletes indoklás és javaslatok csak MAX csomagban</p>
                                                <button
                                                    onClick={() => router.push(`/elemzes/uj?upgradeFrom=${analysisId}`)}
                                                    className="px-4 py-2 bg-[#FFF012] hover:bg-[#e6d810] text-gray-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                                >
                                                    Feloldás — 1 990 Ft + ÁFA
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Description */}
                                        <p className="mb-4 text-[14px] leading-[1.6] text-[#374151]">
                                            {renderWithBold(value.indoklas)}
                                        </p>

                                        {/* Suggestions */}
                                        {value.javaslatok && value.javaslatok.length > 0 && (
                                            <div className="rounded-xl bg-amber-50/60 p-3">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <Lightbulb02 className="size-3.5 text-amber-600" />
                                                    <h4 className="text-sm font-semibold text-amber-700">Javaslatok</h4>
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {value.javaslatok.map((javaslat, index) => (
                                                        <li key={index} className="flex items-start gap-2 text-[14px] leading-[1.6] text-gray-500">
                                                            <span className="shrink-0 mt-[7px] text-[7px] leading-none text-amber-500">●</span>
                                                            {javaslat}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination dots */}
            <div className="flex justify-center gap-2 mt-4">
                {CRITERIA_ORDER.map((key, i) => (
                    <div
                        key={key}
                        className={`rounded-full transition-all duration-200 ${
                            i === activeIndex
                                ? 'w-2.5 h-2.5 bg-[#FFF012]'
                                : 'w-2 h-2 bg-[#D1D5DB]'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
