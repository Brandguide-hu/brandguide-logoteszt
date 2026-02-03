"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb05 } from "@untitledui/icons";
import { CriteriaScore, CriteriaMeta } from "@/types";
import { cx } from "@/utils/cx";

interface CriteriaCardProps {
    criteria: CriteriaMeta;
    score: CriteriaScore;
}

export function CriteriaCard({ criteria, score }: CriteriaCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const percentage = (score.pont / score.maxPont) * 100;

    const getBarColor = () => {
        if (percentage >= 80) return "bg-success-500";
        if (percentage >= 60) return "bg-blue-500";
        if (percentage >= 40) return "bg-warning-500";
        return "bg-error-500";
    };

    return (
        <div className="bg-primary border border-secondary rounded-xl overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center gap-4 hover:bg-secondary transition-colors cursor-pointer"
            >
                <span className="text-2xl">{criteria.icon}</span>
                <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-primary">{criteria.displayName}</h3>
                        <span className="font-bold text-primary">
                            {score.pont}/{score.maxPont}
                        </span>
                    </div>
                    <div className="h-2 bg-tertiary rounded-full overflow-hidden">
                        <div
                            className={cx("h-full rounded-full transition-all duration-500", getBarColor())}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-quaternary" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-quaternary" />
                )}
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-secondary">
                    <p className="text-sm text-tertiary mb-3">{criteria.description}</p>
                    <p className="text-secondary mb-4">{score.indoklas}</p>

                    {score.javaslatok && score.javaslatok.length > 0 && (
                        <div className="bg-brand-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb05 className="w-4 h-4 text-brand-600" />
                                <span className="font-medium text-sm text-brand-700">Javaslatok</span>
                            </div>
                            <ul className="space-y-1">
                                {score.javaslatok.map((javaslat, index) => (
                                    <li key={index} className="text-sm text-primary flex items-start gap-2">
                                        <span className="text-brand-500">•</span>
                                        <span>{javaslat}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
