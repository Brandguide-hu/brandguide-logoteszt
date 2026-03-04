"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight } from "@untitledui/icons";

interface FeaturedAnalysis {
    id: string;
    logo_name: string;
    logo_url: string;
    total_score: number;
    category: string;
    creator_name: string | null;
}

function getRatingLabel(score: number) {
    if (score >= 90) return { label: 'Kivételes', color: 'text-[#ca8a04]', bg: 'bg-[#fef9c3]' };
    if (score >= 80) return { label: 'Profi', color: 'text-[#9333ea]', bg: 'bg-[#f3e8ff]' };
    if (score >= 70) return { label: 'Jó minőségű', color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]' };
    if (score >= 60) return { label: 'Átlagos', color: 'text-[#2563eb]', bg: 'bg-[#eff6ff]' };
    if (score >= 40) return { label: 'Problémás', color: 'text-[#d97706]', bg: 'bg-[#fffbeb]' };
    return { label: 'Újragondolandó', color: 'text-[#dc2626]', bg: 'bg-[#fef2f2]' };
}

export function FeaturedAnalysesClient({ analyses }: { analyses: FeaturedAnalysis[] }) {
    const [activeCard, setActiveCard] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);

    const handleCarouselScroll = useCallback(() => {
        const el = carouselRef.current;
        if (!el) return;
        const cardWidth = el.scrollWidth / analyses.length;
        const idx = Math.round(el.scrollLeft / cardWidth);
        setActiveCard(Math.min(Math.max(idx, 0), analyses.length - 1));
    }, [analyses.length]);

    const scrollToCard = (idx: number) => {
        const el = carouselRef.current;
        if (!el) return;
        const cardWidth = el.scrollWidth / analyses.length;
        el.scrollTo({ left: cardWidth * idx, behavior: 'smooth' });
    };

    return (
        <section className="py-16 md:py-20 md:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-10 px-4 text-center md:px-0">
                    <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-400">
                        Példák
                    </span>
                    <h2 className="text-3xl font-light text-gray-900 md:text-4xl">
                        Ilyen elemzést kaphatsz
                    </h2>
                    <p className="mt-3 text-gray-500 max-w-lg mx-auto">
                        Nézd meg, milyen részletes értékelést kaptak mások logói
                    </p>
                </div>
                {/* Mobile: horizontal snap carousel | md+: grid */}
                <div
                    ref={carouselRef}
                    onScroll={handleCarouselScroll}
                    className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pl-4 pr-4 md:pl-0 md:pr-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:snap-none"
                >
                    {analyses.map((analysis) => {
                        const rating = getRatingLabel(analysis.total_score);
                        return (
                            <Link
                                key={analysis.id}
                                href={`/eredmeny/${analysis.id}`}
                                className="group shrink-0 w-[80vw] max-w-[320px] snap-start rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-md md:w-auto md:max-w-none md:shrink"
                            >
                                {/* Logo preview */}
                                <div className="mb-4 flex aspect-square items-center justify-center rounded-xl border border-gray-200 bg-white p-6">
                                    {analysis.logo_url ? (
                                        <img
                                            src={analysis.logo_url}
                                            alt={analysis.logo_name}
                                            className="max-h-full max-w-full object-contain"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-xl bg-gray-200" />
                                    )}
                                </div>
                                {/* Info */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-gray-900">{analysis.logo_name}</p>
                                        {analysis.creator_name && (
                                            <p className="truncate text-xs text-gray-400">{analysis.creator_name}</p>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <div className="text-xl font-bold text-gray-900">{analysis.total_score}<span className="text-sm font-normal text-gray-400">/100</span></div>
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${rating.bg} ${rating.color}`}>
                                            {rating.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 transition-colors group-hover:text-gray-600">
                                    Elemzés megtekintése
                                    <ArrowRight className="size-3" />
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Dot indicator – only on mobile */}
                {analyses.length > 1 && (
                    <div className="mt-6 flex justify-center gap-2 md:hidden">
                        {analyses.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => scrollToCard(idx)}
                                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                    idx === activeCard
                                        ? 'w-6 bg-gray-900'
                                        : 'w-2 bg-gray-300'
                                }`}
                                aria-label={`${idx + 1}. kártya`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
