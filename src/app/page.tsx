"use client";

import Link from "next/link";
import { ArrowRight, Upload01, BarChart01, Lightbulb05, CheckCircle, Target04, Stars01, Grid01, Eye, Clock, Globe01 } from "@untitledui/icons";

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
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative px-4 pb-24 pt-20 sm:px-6 md:pb-32 md:pt-28 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    {/* Subtle badge */}
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 px-4 py-2 text-sm text-gray-600 opacity-0 animate-[fadeIn_0.6s_ease_forwards]">
                        <span className="size-1.5 rounded-full bg-[#fff012]" />
                        AI-alapú elemzés
                    </div>

                    {/* Main headline with stagger animation */}
                    <h1 className="mb-8 text-4xl font-light tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
                        <span className="block opacity-0 animate-[fadeSlideUp_0.8s_ease_0.1s_forwards]">
                            A logó nem
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
                        Szigorú szakmai szempontoknak kell megfelelnie. Mi megmutatjuk, miben erős és miben fejleszthető.
                    </p>

                    {/* CTA */}
                    <div className="flex flex-col items-center gap-4 opacity-0 animate-[fadeIn_0.8s_ease_0.5s_forwards] sm:flex-row sm:justify-center">
                        <Link href="/teszt">
                            <button className="group inline-flex items-center gap-3 rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/10">
                                Teszt indítása
                                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </button>
                        </Link>
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

            {/* Divider */}
            <div className="mx-auto h-px w-24 bg-gray-200" />

            {/* How it works */}
            <section id="hogyan-mukodik" className="px-4 py-24 sm:px-6 md:py-32 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-16 text-center">
                        <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-400">
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
                                <div className="mb-6 text-6xl font-extralight text-gray-200 transition-colors duration-500 group-hover:text-[#fff012]">
                                    {step.num}
                                </div>

                                {/* Icon */}
                                <div className="mb-4 inline-flex rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all duration-300 group-hover:border-[#fff012]/30 group-hover:bg-[#fff012]/10">
                                    <step.icon className="size-6 text-gray-400 transition-colors duration-300 group-hover:text-gray-900" />
                                </div>

                                <h3 className="mb-2 text-lg font-medium text-gray-900">{step.title}</h3>
                                <p className="text-sm text-gray-500">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Brandguide 100 Section */}
            <section className="bg-gray-50/50 px-4 py-24 sm:px-6 md:py-32 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div className="grid items-start gap-16 lg:grid-cols-2">
                        {/* Left content */}
                        <div>
                            <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-400">
                                Módszertan
                            </span>
                            <h2 className="mb-6 text-3xl font-light text-gray-900 md:text-4xl">
                                Brandguide 100
                            </h2>
                            <p className="mb-8 text-gray-500 leading-relaxed">
                                Paul Rand, a 20. század egyik legnagyobb grafikus tervezője 7 szempontot határozott meg egy
                                jó logó értékeléséhez. Mi ezt a rendszert dolgoztuk át 100 pontos, súlyozott skálává.
                            </p>

                            {/* Quote */}
                            <blockquote className="relative border-l-2 border-[#fff012] pl-6">
                                <p className="text-gray-600 italic leading-relaxed">
                                    „A logónak önmagában nincs jelentése – a jelentést az idő és a következetes használat adja neki."
                                </p>
                                <footer className="mt-3 text-sm font-medium text-gray-900">
                                    Paul Rand
                                </footer>
                            </blockquote>

                            {/* Rating scale */}
                            <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {ratings.map((rating, index) => (
                                    <div
                                        key={rating.label}
                                        className="rounded-lg border border-gray-100 bg-white px-3 py-2 transition-all duration-300 hover:border-gray-200 hover:shadow-sm"
                                    >
                                        <span className="text-sm font-medium text-gray-900">{rating.score}</span>
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
                                    className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-all duration-300 hover:border-gray-200 hover:shadow-sm opacity-0 animate-[fadeSlideUp_0.5s_ease_forwards]"
                                    style={{ animationDelay: `${0.3 + index * 0.08}s` }}
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 transition-colors duration-300 group-hover:bg-[#fff012]/20">
                                        <criterion.icon className="size-5 text-gray-400 transition-colors duration-300 group-hover:text-gray-700" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900">{criterion.name}</span>
                                    </div>
                                    <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 transition-all duration-300 group-hover:bg-[#fff012] group-hover:text-gray-900">
                                        {criterion.points}
                                    </div>
                                </div>
                            ))}

                            {/* Total */}
                            <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-dashed border-gray-200 bg-white/50 p-4">
                                <span className="text-sm font-medium text-gray-500">Összesen</span>
                                <span className="text-2xl font-light text-gray-900">100</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Test Levels */}
            <section className="px-4 py-24 sm:px-6 md:py-32 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-16 text-center">
                        <span className="mb-4 inline-block text-xs font-medium uppercase tracking-widest text-gray-400">
                            Teszt szintek
                        </span>
                        <h2 className="text-3xl font-light text-gray-900 md:text-4xl">
                            Válaszd ki a szintet
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Basic Test */}
                        <div className="group rounded-2xl border border-gray-100 bg-white p-8 transition-all duration-300 hover:border-gray-200 hover:shadow-md">
                            <div className="mb-6 inline-flex rounded-xl bg-gray-50 p-3">
                                <BarChart01 className="size-6 text-gray-400" />
                            </div>
                            <h3 className="mb-2 text-xl font-medium text-gray-900">Alap teszt</h3>
                            <p className="mb-6 text-sm text-gray-500">
                                Gyors elemzés a 7 szempont szerint. Ideális első visszajelzéshez.
                            </p>
                            <ul className="mb-8 space-y-3">
                                {["Logó feltöltése", "7 szempont értékelés", "Összpontszám + javaslatok"].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                                        <CheckCircle className="size-4 text-gray-300" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <span className="text-xs text-gray-400">~30 másodperc</span>
                        </div>

                        {/* Detailed Test */}
                        <div className="group relative rounded-2xl border-2 border-[#fff012]/50 bg-white p-8 transition-all duration-300 hover:border-[#fff012] hover:shadow-lg hover:shadow-[#fff012]/10">
                            {/* Recommended */}
                            <div className="absolute -top-3 right-6 rounded-full bg-[#fff012] px-3 py-1 text-xs font-medium text-gray-900">
                                Ajánlott
                            </div>

                            <div className="mb-6 inline-flex rounded-xl bg-[#fff012]/20 p-3">
                                <Stars01 className="size-6 text-gray-700" />
                            </div>
                            <h3 className="mb-2 text-xl font-medium text-gray-900">Részletes teszt</h3>
                            <p className="mb-6 text-sm text-gray-500">
                                A logón túl a színpalettát és tipográfiát is elemezzük.
                            </p>
                            <ul className="mb-8 space-y-3">
                                {["Minden az alap tesztből", "Színpaletta elemzés", "Tipográfia értékelés", "Radar chart vizualizáció"].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                                        <CheckCircle className="size-4 text-[#fff012]" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <span className="text-xs text-gray-400">~1-2 perc</span>
                        </div>
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
                    <Link href="/teszt">
                        <button className="group inline-flex items-center gap-3 rounded-full bg-[#fff012] px-10 py-5 text-base font-medium text-gray-900 transition-all duration-300 hover:shadow-xl hover:shadow-[#fff012]/30">
                            Teszt indítása
                            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                        </button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-100 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl text-center">
                    <p className="text-xs text-gray-400">
                        © 2025 Brandguide. Minden jog fenntartva.
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
    );
}
