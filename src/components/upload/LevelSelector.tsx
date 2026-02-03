"use client";

import { TestLevel } from "@/types";
import { cx } from "@/utils/cx";
import { CheckCircle } from "@untitledui/icons";

interface LevelSelectorProps {
    selected: TestLevel;
    onChange: (level: TestLevel) => void;
}

const levels = [
    {
        id: "basic" as TestLevel,
        name: "Alap teszt",
        icon: "🔍",
        description: "Gyors elemzés a 7 szempont szerint",
        features: ["Logó értékelés", "7 szempont", "Összpontszám"],
        time: "~30 mp",
    },
    {
        id: "detailed" as TestLevel,
        name: "Részletes teszt",
        icon: "🎨",
        description: "Logó + színpaletta + tipográfia",
        features: ["Minden az alapból", "Színelemzés", "Tipográfia", "Radar chart"],
        time: "~1-2 perc",
        recommended: true,
    },
];

export function LevelSelector({ selected, onChange }: LevelSelectorProps) {
    return (
        <div className="grid md:grid-cols-2 gap-4">
            {levels.map((level) => (
                <button
                    key={level.id}
                    onClick={() => onChange(level.id)}
                    className={cx(
                        "relative text-left p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-md cursor-pointer",
                        selected === level.id
                            ? "border-brand-500 bg-brand-50"
                            : "border-secondary bg-primary hover:border-tertiary"
                    )}
                >
                    {level.recommended && (
                        <div className="absolute -top-3 right-4 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded">
                            AJÁNLOTT
                        </div>
                    )}

                    <div className="flex items-start gap-4">
                        <div className="text-3xl">{level.icon}</div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-primary">{level.name}</h3>
                                {selected === level.id && <CheckCircle className="w-5 h-5 text-brand-500" />}
                            </div>
                            <p className="text-sm text-secondary mt-1">{level.description}</p>

                            <div className="flex flex-wrap gap-2 mt-3">
                                {level.features.map((feature) => (
                                    <span key={feature} className="text-xs bg-secondary px-2 py-1 rounded text-secondary">
                                        {feature}
                                    </span>
                                ))}
                            </div>

                            <p className="text-xs text-tertiary mt-3">{level.time}</p>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
