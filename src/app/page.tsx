"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowRight, Upload01, BarChart01, Lightbulb05, CheckCircle, Target04, Stars01, Grid01, Eye, Clock, Globe01 } from "@untitledui/icons";
import { TransparentVideo } from "@/components/TransparentVideo";
import { AppLayout } from "@/components/layout/AppLayout";
import { TIER_INFO } from "@/types";

interface FeaturedAnalysis {
    id: string;
    logo_name: string;
    logo_url: string;
    total_score: number;
    category: string;
    creator_name: string | null;
}

const steps = [
    {
        num: "01",
        icon: Upload01,
        title: "Feltöltés",
        description: "Húzd be a logódat bármilyen formátumban",
    },
    {
        num: "02",
        icon: BarChart01,
        title: "Elemzés",
        description: "AI vizsgálat Paul Rand 7 szempontja szerint",
    },
    {
        num: "03",
        icon: Lightbulb05,
        title: "Javaslatok",
        description: "Konkrét fejlesztési lehetőségek",
    },
];

const criteria = [
    { name: "Megkülönböztethetőség", points: 20, icon: Target04 },
    { name: "Egyszerűség", points: 18, icon: Stars01 },
    { name: "Alkalmazhatóság", points: 15, icon: Grid01 },
    { name: "Emlékezetesség", points: 15, icon: Lightbulb05 },
    { name: "Időtállóság", points: 12, icon: Clock },
    { name: "Univerzalitás", points: 10, icon: Globe01 },
    { name: "Láthatóság", points: 10, icon: Eye },
];

const ratings = [
    { score: "90+", label: "Kiemelkedő" },
    { score: "80-89", label: "Kiforrott" },
    { score: "65-79", label: "Jó" },
    { score: "50-64", label: "Elfogadható" },
    { score: "35-49", label: "Fejlesztendő" },
    { score: "0-34", label: "Újragondolandó" },
];

export default function Home() {
    const router = useRouter();
    const [featuredAnalyses, setFeaturedAnalyses] = useState<FeaturedAnalysis[]>([]);

    useEffect(() => {
        fetch('/api/featured-analyses')
            .then(res => res.json())
            .then(data => {
                if (data.analyses && Array.isArray(data.analyses)) {
                    setFeaturedAnalyses(data.analyses.slice(0, 3));
                }
            })
            .catch(() => {});
    }, []);

    const handleLogoElemzes = (tier?: string) => {
        const url = tier ? `/elemzes/uj?tier=${tier}` : '/elemzes/uj';
        router.push(url);
    };

    const getRatingLabel = (score: number) => {
        if (score >= 90) return { label: 'Kivételes', color: 'text-[#ca8a04]', bg: 'bg-[#fef9c3]' };
        if (score >= 80) return { label: 'Profi', color: 'text-[#9333ea]', bg: 'bg-[#f3e8ff]' };
        if (score >= 70) return { label: 'Jó minőségű', color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]' };
        if (score >= 60) return { label: 'Átlagos', color: 'text-[#2563eb]', bg: 'bg-[#eff6ff]' };
        if (score >= 40) return { label: 'Problémás', color: 'text-[#d97706]', bg: 'bg-[#fffbeb]' };
        return { label: 'Újragondolandó', color: 'text-[#dc2626]', bg: 'bg-[#fef2f2]' };
    };

    return (
        <AppLayout hideFooter>
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative px-4 pb-24 pt-12 sm:px-6 md:pb-32 md:pt-16 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    {/* Subtle badge */}
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 px-4 py-2 text-sm text-gray-600 opacity-0 animate-[fadeIn_0.6s_ease_forwards]">
                        <span className="size-1.5 rounded-full bg-[#fff012]" />
                        Azonnali logó elemzés
                    </div>

                    {/* Main headline with stagger animation */}
                    <h1 className="mb-8 text-4xl font-light tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
                        <span className="block opacity-0 animate-[fadeSlideUp_0.8s_ease_0.1s_forwards]">
                            A jó logó nem
                        </span>
                        <span className="block opacity-0 animate-[fadeSlideUp_0.8s_ease_0.2s_forwards]">
                            <em className="relative font-normal not-italic">
                                ízlés
                                <span className="absolute -bottom-1 left-0 h-3 w-full bg-[#fff012]/40" />
                            </em>
                            {" "}kérdése
                        </span>
                    </h1>

                    <p className="mx-auto mb-12 max-w-xl text-lg text-gray-500 opacity-0 animate-[fadeIn_0.8s_ease_0.4s_forwards] md:text-xl">
                        Szigorú szakmai szempontoknak kell megfelelnie. Mi megmutatjuk, miben erős és miben fejleszthető a feltöltött logó. Elemeztesd most!
                    </p>

                    {/* CTA */}
                    <div className="flex flex-col items-center gap-4 opacity-0 animate-[fadeIn_0.8s_ease_0.5s_forwards] sm:flex-row sm:justify-center">
                        <button
                            onClick={() => handleLogoElemzes()}
                            className="group inline-flex items-center gap-3 rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/10 cursor-pointer"
                        >
                            Logo elemzés indítása
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </button>
                        <a
                            href="#hogyan-mukodik"
                            className="inline-flex items-center gap-2 px-6 py-4 text-base text-gray-500 transition-colors hover:text-gray-900"
                        >
                            Hogyan működik?
                        </a>
                    </div>
                </div>

                {/* Floating accent shapes */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute right-[15%] top-[20%] size-2 rounded-full bg-[#fff012] opacity-0 animate-[fadeIn_1s_ease_0.8s_forwards]" />
                    <div className="absolute left-[20%] top-[60%] size-3 rounded-full bg-[#fff012]/60 opacity-0 animate-[fadeIn_1s_ease_1s_forwards]" />
                    <div className="absolute right-[25%] bottom-[30%] size-1.5 rounded-full bg-[#fff012] opacity-0 animate-[fadeIn_1s_ease_1.2s_forwards]" />
                </div>
            </section>

            {/* Minta elemzések - ilyen elemzést kaphatsz */}
            {featuredAnalyses.length > 0 && (
                <section className="px-4 py-16 sm:px-6 md:py-20 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-10 text-center">
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
                        <div className="grid gap-6 md:grid-cols-3">
                            {featuredAnalyses.map((analysis) => {
                                const rating = getRatingLabel(analysis.total_score);
                                return (
                                    <Link
                                        key={analysis.id}
                                        href={`/eredmeny/${analysis.id}`}
                                        className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-md"
                                    >
                                        {/* Logo preview */}
                                        <div className="mb-4 flex aspect-square items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-6">
                                            {analysis.logo_url ? (
                                                <img
                                                    src={analysis.logo_url}
                                                    alt={analysis.logo_name}
                                                    className="max-h-full max-w-full object-contain"
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
                    </div>
                </section>
            )}

            {/* Divider */}
            <div className="mx-auto h-px w-24 bg-gray-200" />

            {/* How it works */}
            <section id="hogyan-mukodik" className="bg-gray-100 px-4 py-24 sm:px-6 md:py-32 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-16 text-center">
                        <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-500">
                            Folyamat
                        </span>
                        <h2 className="text-3xl font-light text-gray-900 md:text-4xl">
                            Három egyszerű lépés
                        </h2>
                    </div>

                    <div className="grid gap-12 md:grid-cols-3 md:gap-8">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className="group text-center opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
                                style={{ animationDelay: `${0.2 + index * 0.15}s` }}
                            >
                                {/* Number */}
                                <div className="mb-6 text-6xl font-extralight text-[#fff012]">
                                    {step.num}
                                </div>

                                {/* Icon */}
                                <div className="mb-4 inline-flex rounded-2xl border border-gray-200 bg-white p-4 transition-all duration-300 group-hover:border-[#fff012]/30 group-hover:bg-[#fff012]/10">
                                    <step.icon className="size-6 text-gray-400 transition-colors duration-300 group-hover:text-gray-900" />
                                </div>

                                <h3 className="mb-2 text-lg font-medium text-gray-900">{step.title}</h3>
                                <p className="text-sm text-gray-500">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* brandguide SCORE Section */}
            <section className="bg-gray-900 px-4 py-32 sm:px-6 md:py-40 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div className="grid items-end gap-16 lg:grid-cols-2">
                        {/* Left content */}
                        <div>
                            {/* SCORE Animation - Centered in left column */}
                            <div className="flex justify-center mb-8">
                                <TransparentVideo
                                    src="/score-animation.webm"
                                    maxSize={450}
                                    threshold={40}
                                />
                            </div>
                            <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-400">
                                Módszertan
                            </span>
                            <h2 className="mb-6 text-3xl font-light text-white md:text-4xl">
                                brandguide <span className="font-bold text-[#fff012]">SCORE</span>
                            </h2>
                            <p className="mb-8 text-gray-400 leading-relaxed">
                                Paul Rand, a 20. század egyik legnagyobb grafikus tervezője 7 szempontot határozott meg egy
                                jó logó értékeléséhez. Mi ezt a rendszert dolgoztuk át 100 pontos, súlyozott skálává: ez a brandguide SCORE objektív értékelési rendszer.
                            </p>

                            {/* Quote */}
                            <blockquote className="relative border-l-2 border-[#fff012] pl-6">
                                <p className="text-gray-300 italic leading-relaxed">
                                    „A logónak önmagában nincs jelentése – a jelentést az idő és a következetes használat adja neki."
                                </p>
                                <footer className="mt-3 text-sm font-medium text-white">
                                    Paul Rand
                                </footer>
                            </blockquote>

                            {/* Rating scale */}
                            <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {ratings.map((rating) => (
                                    <div
                                        key={rating.label}
                                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 transition-all duration-300 hover:border-gray-600 hover:bg-gray-700"
                                    >
                                        <span className="text-sm font-medium text-white">{rating.score}</span>
                                        <span className="ml-2 text-xs text-gray-400">{rating.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right - Criteria list */}
                        <div className="space-y-3">
                            {criteria.map((criterion, index) => (
                                <div
                                    key={criterion.name}
                                    className="group flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4 transition-all duration-300 hover:border-gray-600 hover:bg-gray-700 opacity-0 animate-[fadeSlideUp_0.5s_ease_forwards]"
                                    style={{ animationDelay: `${0.3 + index * 0.08}s` }}
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-700 transition-colors duration-300 group-hover:bg-[#fff012]/20">
                                        <criterion.icon className="size-5 text-gray-400 transition-colors duration-300 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-white">{criterion.name}</span>
                                    </div>
                                    <div className="rounded-full bg-gray-700 px-3 py-1 text-xs font-medium text-gray-300 transition-all duration-300 group-hover:bg-[#fff012] group-hover:text-gray-900">
                                        {criterion.points}
                                    </div>
                                </div>
                            ))}

                            {/* Total */}
                            <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/50 p-4">
                                <span className="text-sm font-medium text-gray-400">Összesen</span>
                                <span className="text-2xl font-light text-white">100</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bento Box - Így működik az elemzés */}
            <section className="px-4 py-24 sm:px-6 md:py-32 lg:px-8 bg-gray-50">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-12 text-center">
                        <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-400">
                            Ízelítő
                        </span>
                        <h2 className="text-3xl font-light text-gray-900 md:text-4xl mb-3">
                            Így működik az elemzés
                        </h2>
                        <p className="text-gray-500 max-w-lg mx-auto">
                            Nézd meg, milyen részletes visszajelzést kapsz a logódról
                        </p>
                    </div>

                    {/* Bento Grid - zárt téglalap layout */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* 1. sor: Összpontszám | Radar | 7 szempont */}
                        {/* Összpontszám */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col items-center justify-center text-center">
                            <span className="text-sm font-medium text-gray-400 mb-2">Összpontszám</span>
                            <div className="text-5xl font-bold text-gray-900">75</div>
                            <div className="text-lg text-gray-400">/100</div>
                        </div>

                        {/* Radar chart - közép, row-span-2 */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:row-span-2 flex flex-col">
                            <span className="text-sm font-medium text-gray-400 block mb-4">Vizuális összefoglaló</span>
                            <div className="flex-1 flex items-center justify-center">
                                <svg viewBox="0 0 200 200" className="w-full max-w-[180px]">
                                    <polygon points="100,20 170,60 170,140 100,180 30,140 30,60" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                                    <polygon points="100,40 150,70 150,130 100,160 50,130 50,70" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                                    <polygon points="100,60 130,80 130,120 100,140 70,120 70,80" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                                    <polygon
                                        points="100,35 155,65 160,125 100,155 45,130 40,70"
                                        fill="rgba(255,240,18,0.2)"
                                        stroke="#FFF012"
                                        strokeWidth="2"
                                    />
                                    <circle cx="100" cy="35" r="4" fill="#FFF012"/>
                                    <circle cx="155" cy="65" r="4" fill="#FFF012"/>
                                    <circle cx="160" cy="125" r="4" fill="#FFF012"/>
                                    <circle cx="100" cy="155" r="4" fill="#FFF012"/>
                                    <circle cx="45" cy="130" r="4" fill="#FFF012"/>
                                    <circle cx="40" cy="70" r="4" fill="#FFF012"/>
                                </svg>
                            </div>
                        </div>

                        {/* 7 szempont */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6">
                            <span className="text-sm font-medium text-gray-400 block mb-4">7 profi szempont</span>
                            <div className="space-y-2">
                                {[
                                    { name: 'Megkülönböztethetőség', score: 78 },
                                    { name: 'Egyszerűség', score: 82 },
                                    { name: 'Alkalmazhatóság', score: 75 },
                                    { name: 'Megjegyezhetőség', score: 70 },
                                    { name: 'Időtlenség', score: 68 },
                                    { name: 'Univerzalitás', score: 72 },
                                    { name: 'Láthatóság', score: 80 },
                                ].map((item) => (
                                    <div key={item.name} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 truncate mr-2">{item.name}</span>
                                        <span className="font-medium text-gray-900">{item.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. sor: Fejlesztési javaslat (col-span-1) | [Radar cont.] | Színelemzés */}
                        {/* Fejlesztési javaslat */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6">
                            <span className="text-sm font-medium text-gray-400 block mb-3">💡 Fejlesztési javaslat</span>
                            <blockquote className="text-gray-700 italic text-sm">
                                &ldquo;A logó kontrasztja fokozható lenne a jobb láthatóság érdekében.&rdquo;
                            </blockquote>
                        </div>

                        {/* Radar a 2. sorban is kitölti a középső oszlopot (row-span miatt) */}

                        {/* Szín elemzés */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6">
                            <span className="text-sm font-medium text-gray-400 block mb-4">🎨 Színelemzés</span>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600 shadow-sm"></div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">#2563EB</div>
                                        <div className="text-xs text-gray-500">Bizalom</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-800 shadow-sm"></div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">#1E40AF</div>
                                        <div className="text-xs text-gray-500">Professzionalizmus</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. sor: Tipográfia | Erősségek | Gyengeségek */}
                        {/* Tipográfia */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6">
                            <span className="text-sm font-medium text-gray-400 block mb-3">✏️ Tipográfia</span>
                            <div className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'system-ui' }}>
                                Aa Bb
                            </div>
                            <p className="text-sm text-gray-600">
                                Modern sans-serif, jól olvasható.
                            </p>
                        </div>

                        {/* Erősségek */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6">
                            <span className="text-sm font-medium text-gray-400 block mb-3">✅ Erősségek</span>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Egyedi formavilág</li>
                                <li>• Jól skálázható</li>
                                <li>• Modern megjelenés</li>
                            </ul>
                        </div>

                        {/* Fejlesztendő */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6">
                            <span className="text-sm font-medium text-gray-400 block mb-3">🔧 Fejlesztendő</span>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Kontraszt növelése</li>
                                <li>• Kis méretű változat</li>
                            </ul>
                        </div>
                    </div>

                    {/* CTA gomb */}
                    <div className="mt-10 text-center">
                        <Link
                            href="/igy-mukodik"
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
                        >
                            Részletes bemutató
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Pricing Tiers */}
            <section className="px-4 py-24 sm:px-6 md:py-32 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-16 text-center">
                        <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-400">
                            Csomagok
                        </span>
                        <h2 className="text-3xl font-light text-gray-900 md:text-4xl">
                            Válaszd ki a neked valót
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Free - Coming Soon */}
                        <div className="relative rounded-2xl border border-gray-100 bg-white p-8 opacity-70">
                            <div className="absolute -top-3 right-6 rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                                Hamarosan
                            </div>
                            <div className="mb-6 inline-flex rounded-xl bg-gray-100 p-3">
                                <BarChart01 className="size-6 text-gray-400" />
                            </div>
                            <h3 className="mb-2 text-xl font-medium text-gray-700">{TIER_INFO.free.label}</h3>
                            <div className="mb-1 text-3xl font-bold text-gray-700">0 <span className="text-base font-normal text-gray-400">Ft</span></div>
                            <p className="mb-6 text-sm text-gray-400">Naponta 1 elemzés</p>
                            <ul className="mb-8 space-y-3">
                                {TIER_INFO.free.features.map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                                        <CheckCircle className="size-4 text-gray-200" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-6 py-3 text-sm font-medium text-gray-400 cursor-not-allowed">
                                Hamarosan elérhető
                            </div>
                        </div>

                        {/* Paid - Highlighted */}
                        <button onClick={() => handleLogoElemzes('paid')} className="group text-left cursor-pointer">
                            <div className="relative h-full rounded-2xl border-2 border-[#fff012]/50 bg-white p-8 transition-all duration-300 hover:border-[#fff012] hover:shadow-lg hover:shadow-[#fff012]/10">
                                <div className="absolute -top-3 right-6 rounded-full bg-[#fff012] px-3 py-1 text-xs font-medium text-gray-900">
                                    Ajánlott
                                </div>
                                <div className="mb-6 inline-flex rounded-xl bg-[#fff012]/20 p-3">
                                    <Stars01 className="size-6 text-gray-700" />
                                </div>
                                <h3 className="mb-2 text-xl font-medium text-gray-900">{TIER_INFO.paid.label}</h3>
                                <div className="mb-1 text-3xl font-bold text-gray-900">1 990 <span className="text-base font-normal text-gray-400">Ft + ÁFA</span></div>
                                <p className="mb-6 text-sm text-gray-500">Bruttó {TIER_INFO.paid.priceBrutto.toLocaleString('hu-HU')} Ft</p>
                                <ul className="mb-8 space-y-3">
                                    {TIER_INFO.paid.features.map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                                            <CheckCircle className="size-4 text-[#fff012]" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-all group-hover:bg-gray-800">
                                    Max csomag — rendelés
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </button>

                        {/* Consultation */}
                        <button onClick={() => handleLogoElemzes('consultation')} className="group text-left cursor-pointer">
                            <div className="h-full rounded-2xl border border-gray-100 bg-white p-8 transition-all duration-300 hover:border-gray-200 hover:shadow-md">
                                <div className="mb-6 inline-flex rounded-xl bg-gray-100 p-3">
                                    <Lightbulb05 className="size-6 text-gray-500" />
                                </div>
                                <h3 className="mb-2 text-xl font-medium text-gray-900">{TIER_INFO.consultation.label}</h3>
                                <div className="mb-1 text-3xl font-bold text-gray-900">24 990 <span className="text-base font-normal text-gray-400">Ft + ÁFA</span></div>
                                <p className="mb-6 text-sm text-gray-500">Bruttó {TIER_INFO.consultation.priceBrutto.toLocaleString('hu-HU')} Ft</p>
                                <ul className="mb-8 space-y-3">
                                    {TIER_INFO.consultation.features.map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                                            <CheckCircle className="size-4 text-gray-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-6 py-3 text-sm font-medium text-gray-700 transition-all group-hover:bg-gray-200">
                                    Ultra csomag — rendelés
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <Link href="/arak" className="text-sm text-gray-500 hover:text-gray-700 transition-colors underline">
                            Részletes összehasonlítás →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="px-4 py-24 sm:px-6 md:py-32 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="mb-6 text-3xl font-light text-gray-900 md:text-4xl">
                        Készen állsz?
                    </h2>
                    <p className="mb-10 text-gray-500">
                        Ingyenes, gyors és szakmailag megalapozott visszajelzés.
                    </p>
                    <button
                        onClick={() => handleLogoElemzes()}
                        className="group inline-flex items-center gap-3 rounded-full bg-[#fff012] px-10 py-5 text-base font-medium text-gray-900 transition-all duration-300 hover:shadow-xl hover:shadow-[#fff012]/30 cursor-pointer"
                    >
                        Logo elemzés indítása
                        <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-100 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl text-center">
                    <p className="text-xs text-gray-400">
                        &copy; 2025 brandguide. Minden jog fenntartva.
                    </p>
                </div>
            </footer>

            {/* Global animations */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
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
        </AppLayout>
    );
}
