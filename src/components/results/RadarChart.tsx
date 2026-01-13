"use client";

import {
    Radar,
    RadarChart as RechartsRadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { AnalysisResult, CRITERIA_META } from "@/types";

interface RadarChartProps {
    result: AnalysisResult;
}

export function RadarChart({ result }: RadarChartProps) {
    const data = Object.entries(result.szempontok).map(([key, value]) => {
        const meta = CRITERIA_META[key as keyof typeof CRITERIA_META];
        const percentage = (value.pont / value.maxPont) * 100;
        return {
            criteria: meta?.displayName || key,
            score: percentage,
            actualScore: value.pont,
            maxScore: value.maxPont,
            fullMark: 100,
        };
    });

    return (
        <div className="w-full h-80 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="var(--color-gray-200)" />
                    <PolarAngleAxis
                        dataKey="criteria"
                        tick={{ fill: "var(--color-gray-600)", fontSize: 11 }}
                        tickLine={false}
                    />
                    <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: "var(--color-gray-400)", fontSize: 10 }}
                        tickCount={5}
                        axisLine={false}
                    />
                    <Radar
                        name="Pontszám"
                        dataKey="score"
                        stroke="var(--color-brand-500)"
                        fill="var(--color-brand-500)"
                        fillOpacity={0.3}
                        strokeWidth={2}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-primary border border-secondary rounded-lg p-3 shadow-lg">
                                        <p className="font-semibold text-primary">{data.criteria}</p>
                                        <p className="text-sm text-secondary">
                                            {data.actualScore} / {data.maxScore} pont
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </RechartsRadarChart>
            </ResponsiveContainer>
        </div>
    );
}
