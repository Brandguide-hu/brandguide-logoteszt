"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { LinkExternal01, Trash01, Copy01, Check, FileSearch02, Calendar, AlertCircle } from "@untitledui/icons";

interface AnalysisRow {
    id: string;
    created_at: string;
    test_level: string;
    logo_base64: string;
    result: {
        osszpontszam: number;
        minosites: string;
    };
}

export default function AdminPage() {
    const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyJsonLink = async (id: string) => {
        const url = `${window.location.origin}/api/result/${id}`;
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Biztosan törölni szeretnéd ezt az elemzést?")) return;

        setDeleting(id);
        try {
            const { error: dbError } = await supabase.from("analyses").delete().eq("id", id);

            if (dbError) throw dbError;
            setAnalyses((prev) => prev.filter((a) => a.id !== id));
        } catch (err) {
            console.error("Delete error:", err);
            alert("Nem sikerült törölni az elemzést");
        } finally {
            setDeleting(null);
        }
    };

    useEffect(() => {
        async function fetchAnalyses() {
            try {
                const { data, error: dbError } = await supabase
                    .from("analyses")
                    .select("id, created_at, test_level, logo_base64, result")
                    .order("created_at", { ascending: false });

                if (dbError) throw dbError;
                setAnalyses(data || []);
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Nem sikerült betölteni az elemzéseket");
            } finally {
                setLoading(false);
            }
        }

        fetchAnalyses();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("hu-HU", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getScoreStyles = (score: number) => {
        if (score >= 80) return "bg-emerald-50 text-emerald-700";
        if (score >= 60) return "bg-[#fff012]/20 text-gray-900";
        if (score >= 40) return "bg-amber-50 text-amber-700";
        return "bg-red-50 text-red-700";
    };

    const getTestLevelLabel = (level: string) => {
        switch (level) {
            case "professional":
                return { label: "Profi", style: "bg-gray-900 text-white" };
            case "detailed":
                return { label: "Részletes", style: "bg-[#fff012] text-gray-900" };
            default:
                return { label: "Alap", style: "bg-gray-100 text-gray-600" };
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <div className="text-center">
                    <div className="mx-auto mb-6 size-12 animate-spin rounded-full border-2 border-gray-200 border-t-[#fff012]" />
                    <p className="text-gray-500">Elemzések betöltése...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-red-50">
                        <AlertCircle className="size-8 text-red-500" />
                    </div>
                    <h1 className="mb-2 text-2xl font-light text-gray-900">Hiba történt</h1>
                    <p className="mb-8 text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <Link
                        href="/"
                        className="text-sm text-gray-400 transition-colors hover:text-gray-900"
                    >
                        ← Vissza
                    </Link>
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                        Admin
                    </span>
                </div>
            </div>

            <div className="px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    {/* Page header */}
                    <div className="mb-10 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]">
                        <h1 className="mb-2 text-3xl font-light text-gray-900">Összes teszt</h1>
                        <p className="text-gray-500">
                            Összesen <span className="font-medium text-gray-900">{analyses.length}</span> elemzés
                        </p>
                    </div>

                    {/* Empty state */}
                    {analyses.length === 0 ? (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-16 text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_0.1s_forwards]">
                            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gray-100">
                                <FileSearch02 className="size-8 text-gray-400" />
                            </div>
                            <h2 className="mb-2 text-xl font-light text-gray-900">Még nincs elemzés</h2>
                            <p className="mb-8 text-gray-500">Az elemzések itt fognak megjelenni.</p>
                            <Link href="/teszt">
                                <button className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-gray-800">
                                    Új teszt indítása
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {analyses.map((analysis, index) => {
                                const levelInfo = getTestLevelLabel(analysis.test_level);
                                return (
                                    <div
                                        key={analysis.id}
                                        className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-all duration-300 hover:border-gray-200 hover:shadow-sm opacity-0 animate-[fadeSlideUp_0.5s_ease_forwards]"
                                        style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                                    >
                                        {/* Logo thumbnail */}
                                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                                            <img
                                                src={`data:image/png;base64,${analysis.logo_base64}`}
                                                alt="Logo"
                                                className="max-h-full max-w-full object-contain p-2"
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center gap-2">
                                                {/* Score */}
                                                <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${getScoreStyles(analysis.result.osszpontszam)}`}>
                                                    {analysis.result.osszpontszam}/100
                                                </span>
                                                {/* Test level */}
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelInfo.style}`}>
                                                    {levelInfo.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <Calendar className="size-3.5" />
                                                <span>{formatDate(analysis.created_at)}</span>
                                                <span className="text-gray-300">•</span>
                                                <span>{analysis.result.minosites}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex shrink-0 items-center gap-2">
                                            {/* Copy JSON link */}
                                            <button
                                                onClick={() => handleCopyJsonLink(analysis.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-900"
                                            >
                                                {copiedId === analysis.id ? (
                                                    <>
                                                        <Check className="size-4 text-emerald-500" />
                                                        <span className="text-emerald-600">Másolva</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy01 className="size-4" />
                                                        <span>JSON</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Open */}
                                            <Link href={`/eredmeny/${analysis.id}`}>
                                                <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:shadow-sm">
                                                    <LinkExternal01 className="size-4" />
                                                    Megnyitás
                                                </button>
                                            </Link>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDelete(analysis.id)}
                                                disabled={deleting === analysis.id}
                                                className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                            >
                                                <Trash01 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
