"use client";

import { TypeSquare } from "@untitledui/icons";
import { TypographyAnalysis as TypographyAnalysisType } from "@/types";

interface TypographyAnalysisProps {
    analysis: TypographyAnalysisType;
}

export function TypographyAnalysis({ analysis }: TypographyAnalysisProps) {
    return (
        <div className="bg-primary border border-secondary rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                    <TypeSquare className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-xl font-semibold text-primary">Tipográfia elemzés</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="font-medium text-primary mb-1">Karakter</h4>
                    <p className="text-secondary">{analysis.karakter}</p>
                </div>

                <div>
                    <h4 className="font-medium text-primary mb-1">Olvashatóság</h4>
                    <p className="text-secondary">{analysis.olvashatos}</p>
                </div>

                <div>
                    <h4 className="font-medium text-primary mb-1">Brandhez illeszkedés</h4>
                    <p className="text-secondary">{analysis.illeszkedés}</p>
                </div>

                {analysis.javaslatok && analysis.javaslatok.length > 0 && (
                    <div className="bg-brand-50 rounded-lg p-4 mt-4">
                        <h4 className="font-medium text-brand-700 mb-2">Javaslatok</h4>
                        <ul className="space-y-1">
                            {analysis.javaslatok.map((javaslat, index) => (
                                <li key={index} className="text-sm text-primary flex items-start gap-2">
                                    <span className="text-brand-500">•</span>
                                    <span>{javaslat}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
