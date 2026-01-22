"use client";

// Skeleton loader component that mimics the result page layout
// Shows animated placeholders while content is loading

export function ResultSkeleton() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header skeleton */}
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-5xl grid-cols-3 items-center">
                    <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                    <div className="justify-self-center">
                        <div className="h-12 w-24 animate-pulse rounded bg-gray-100" />
                    </div>
                    <div />
                </div>
            </div>

            <div className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    {/* Hero section skeleton */}
                    <div className="mb-16 text-center">
                        <div className="mx-auto mb-4 h-4 w-24 animate-pulse rounded bg-gray-100" />
                        <div className="mx-auto mb-8 h-8 w-48 animate-pulse rounded bg-gray-100" />

                        {/* Score and logo skeleton */}
                        <div className="flex flex-col items-center gap-12 md:flex-row md:justify-center">
                            {/* Logo placeholder */}
                            <div className="h-48 w-48 animate-pulse rounded-2xl bg-gray-100" />

                            {/* Score placeholder */}
                            <div className="text-center">
                                <div className="mx-auto mb-2 h-32 w-40 animate-pulse rounded-xl bg-gray-100" />
                                <div className="mx-auto mb-4 h-4 w-16 animate-pulse rounded bg-gray-100" />
                                <div className="mx-auto h-8 w-28 animate-pulse rounded-full bg-gray-100" />
                            </div>
                        </div>
                    </div>

                    {/* Summary skeleton */}
                    <div className="mb-12">
                        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-gray-100" />
                        <div className="space-y-2">
                            <div className="h-5 w-full animate-pulse rounded bg-gray-100" />
                            <div className="h-5 w-11/12 animate-pulse rounded bg-gray-100" />
                            <div className="h-5 w-4/5 animate-pulse rounded bg-gray-100" />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-auto mb-12 h-px w-16 bg-gray-100" />

                    {/* Strengths & Weaknesses skeleton */}
                    <div className="mb-12 grid gap-6 md:grid-cols-2">
                        {/* Strengths */}
                        <div className="rounded-xl border border-gray-100 bg-white p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="h-8 w-8 animate-pulse rounded-lg bg-emerald-50" />
                                <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                            </div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-200" />
                                        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weaknesses */}
                        <div className="rounded-xl border border-gray-100 bg-white p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="h-8 w-8 animate-pulse rounded-lg bg-amber-50" />
                                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                            </div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-200" />
                                        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart skeleton */}
                    <div className="mb-12 rounded-xl border border-gray-100 bg-white p-6">
                        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-gray-100" />
                        <div className="mx-auto flex h-64 w-64 items-center justify-center">
                            <div className="h-48 w-48 animate-pulse rounded-full bg-gray-100" />
                        </div>
                    </div>

                    {/* Criteria Details skeleton */}
                    <div className="mb-12">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
                            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100" />
                        </div>
                        <div className="space-y-3">
                            {/* Fixed widths to avoid hydration mismatch - no Math.random() */}
                            {[55, 72, 60, 68, 50, 65, 58].map((width, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-gray-100 bg-white p-5"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-12 animate-pulse rounded bg-gray-100" />
                                            <div className="h-5 w-10 animate-pulse rounded-full bg-gray-100" />
                                        </div>
                                    </div>
                                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className="h-full animate-pulse rounded-full bg-gray-200"
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Color Analysis skeleton */}
                    <div className="mb-12 rounded-xl border border-gray-100 bg-white p-6">
                        <div className="mb-6 flex items-center gap-2">
                            <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
                            <div className="h-5 w-32 animate-pulse rounded bg-gray-100" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                                    <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Typography Analysis skeleton */}
                    <div className="mb-12 rounded-xl border border-gray-100 bg-white p-6">
                        <div className="mb-6 flex items-center gap-2">
                            <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
                            <div className="h-5 w-28 animate-pulse rounded bg-gray-100" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Visual Language Analysis skeleton */}
                    <div className="mb-12 rounded-xl border border-gray-100 bg-white p-6">
                        <div className="mb-6 flex items-center gap-2">
                            <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
                            <div className="h-5 w-32 animate-pulse rounded bg-gray-100" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                                    <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
