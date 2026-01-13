"use client";

import { useState, useEffect } from "react";
import { Loading02, CheckCircle, Stars01, Database01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

interface StreamingLoaderProps {
    status: string;
    phase: "start" | "analyzing" | "processing" | "saving" | "complete";
    streamingText?: string;
}

const designPhrases = [
    "Vizuális egyensúly elemzése",
    "Színharmónia vizsgálata",
    "Tipográfiai hierarchia",
    "Negatív tér használata",
    "Formai egyszerűség",
    "Méretarányok ellenőrzése",
    "Kontrasztok értékelése",
    "Márkaidentitás",
    "Felismerhetőség",
    "Időtálló design",
    "Skálázhatóság",
    "Alkalmazhatóság",
    "Egyediség vizsgálata",
    "Releváns szimbólumok",
    "Célcsoport illeszkedés",
    "Professzionális megjelenés",
    "Vizuális konzisztencia",
    "Olvashatóság",
    "Memorizálhatóság",
    "Márkaértékek tükrözése",
    "Geometriai pontosság",
    "Optikai korrekciók",
    "Karakteres vonalvezetés",
    "Harmonikus kompozíció",
];

const phases = [
    { id: "start", label: "Elemzés indítása", icon: Stars01 },
    { id: "analyzing", label: "Brandguide elemzi a logót", icon: Loading02 },
    { id: "processing", label: "Eredmények feldolgozása", icon: Loading02 },
    { id: "saving", label: "Mentés adatbázisba", icon: Database01 },
    { id: "complete", label: "Kész!", icon: CheckCircle },
];

export function StreamingLoader({ status, phase }: StreamingLoaderProps) {
    const [dots, setDots] = useState("");
    const [currentPhrase, setCurrentPhrase] = useState(designPhrases[0]);
    const [phraseIndex, setPhraseIndex] = useState(0);

    useEffect(() => {
        if (phase === "complete") return;
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);
        return () => clearInterval(interval);
    }, [phase]);

    useEffect(() => {
        if (phase !== "analyzing") return;
        const interval = setInterval(() => {
            setPhraseIndex((prev) => {
                const next = (prev + 1) % designPhrases.length;
                setCurrentPhrase(designPhrases[next]);
                return next;
            });
        }, 1800);
        return () => clearInterval(interval);
    }, [phase]);

    const currentPhaseIndex = phases.findIndex((p) => p.id === phase);

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Progress steps */}
            <div className="flex items-center justify-between mb-8">
                {phases.slice(0, -1).map((p, index) => {
                    const isActive = index === currentPhaseIndex;
                    const isComplete = index < currentPhaseIndex;
                    const Icon = p.icon;

                    return (
                        <div key={p.id} className="flex flex-col items-center flex-1">
                            <div
                                className={cx(
                                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                                    isComplete
                                        ? "bg-success-500 text-white"
                                        : isActive
                                          ? "bg-brand-500 text-white"
                                          : "bg-tertiary text-quaternary"
                                )}
                            >
                                {isComplete ? (
                                    <CheckCircle className="w-6 h-6" />
                                ) : isActive ? (
                                    <Icon className="w-6 h-6 animate-pulse" />
                                ) : (
                                    <Icon className="w-6 h-6" />
                                )}
                            </div>
                            <span
                                className={cx(
                                    "text-xs mt-2 text-center",
                                    isActive ? "text-brand-600 font-medium" : "text-tertiary"
                                )}
                            >
                                {p.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Main status display */}
            <div className="bg-primary rounded-2xl border border-secondary p-8 text-center shadow-sm">
                <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    {phase === "complete" ? (
                        <CheckCircle className="w-10 h-10 text-success-500" />
                    ) : (
                        <Loading02 className="w-10 h-10 text-brand-500 animate-spin" />
                    )}
                </div>

                <h3 className="text-xl font-semibold text-primary mb-2">
                    {status}
                    {phase !== "complete" && <span className="text-brand-500">{dots}</span>}
                </h3>

                <p className="text-secondary text-sm mb-6">
                    {phase === "analyzing"
                        ? "A mesterséges intelligencia elemzi a logódat a 7 szempont szerint."
                        : phase === "processing"
                          ? "Az elemzés feldolgozása és pontszámok számítása."
                          : phase === "saving"
                            ? "Az eredmények mentése, hogy később is elérd."
                            : "Kérlek várj..."}
                </p>

                {/* Design phrases animation */}
                {phase === "analyzing" && (
                    <div className="bg-secondary rounded-lg p-6">
                        <div className="flex items-center justify-center gap-3">
                            <Stars01 className="w-5 h-5 text-brand-500 animate-pulse" />
                            <span key={phraseIndex} className="text-lg font-medium text-primary">
                                {currentPhrase}
                            </span>
                            <span className="inline-block w-2 h-5 bg-brand-500 animate-pulse rounded-sm" />
                        </div>
                    </div>
                )}

                {/* Tips while waiting */}
                {phase === "start" && (
                    <div className="bg-brand-50 rounded-lg p-4 text-left">
                        <p className="text-sm text-primary">
                            <strong>Tudtad?</strong> A Brandguide 100 pontos rendszere Paul Rand, a 20. század egyik
                            legnevesebb grafikus tervezőjének 7 szempontját alapul véve készült.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
