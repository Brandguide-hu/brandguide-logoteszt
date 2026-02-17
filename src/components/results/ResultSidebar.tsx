"use client";

import { useState } from "react";
import { Copy01, Check, Share07 } from "@untitledui/icons";
import { CATEGORIES, TIER_INFO } from "@/types";

interface ResultSidebarProps {
    logoUrl: string | null;
    score: number;
    rating: string;
    logoName?: string | null;
    creatorName?: string | null;
    category?: string | null;
    tier?: string | null;
    createdAt?: string | null;
}

export function ResultSidebar({ logoUrl, score, rating, logoName, creatorName, category, tier, createdAt }: ResultSidebarProps) {
    const [copied, setCopied] = useState(false);

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
        <div className="space-y-6">
            <aside className="sticky top-8 space-y-6">
                {/* Share section */}
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

                {/* Logo preview - always visible in sidebar */}
                {logoUrl && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-6">
                        <div className="mb-4 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 aspect-square p-6">
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
                        </div>
                    </div>
                )}
            </aside>

            {/* Info blokk */}
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

            {/* Banner — kívül a sticky sávon, scrollozik az oldallal */}
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
                <div className="flex aspect-[4/3] items-center justify-center text-center">
                    <p className="text-sm text-gray-400">Banner helye<br />(admin-ból tölthető)</p>
                </div>
            </div>
        </div>
    );
}
