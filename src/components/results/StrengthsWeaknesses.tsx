"use client";

import { CheckCircle, AlertCircle } from "@untitledui/icons";

interface StrengthsWeaknessesProps {
    strengths: string[];
    weaknesses: string[];
}

export function StrengthsWeaknesses({ strengths, weaknesses }: StrengthsWeaknessesProps) {
    return (
        <div className="grid md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-success-50 border border-success-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-success-600" />
                    </div>
                    <h3 className="font-semibold text-success-800">Erősségek</h3>
                </div>
                <ul className="space-y-2">
                    {strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-success-700">
                            <span className="text-success-500 mt-1">✓</span>
                            <span>{strength}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-warning-50 border border-warning-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-warning-600" />
                    </div>
                    <h3 className="font-semibold text-warning-800">Fejlesztendő</h3>
                </div>
                <ul className="space-y-2">
                    {weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-start gap-2 text-warning-700">
                            <span className="text-warning-500 mt-1">→</span>
                            <span>{weakness}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
