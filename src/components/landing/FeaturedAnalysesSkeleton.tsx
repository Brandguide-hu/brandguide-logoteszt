export function FeaturedAnalysesSkeleton() {
    return (
        <section className="py-16 md:py-20 md:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-10 px-4 text-center md:px-0">
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
                <div className="flex gap-4 pl-4 pr-4 md:pl-0 md:pr-0 md:grid md:grid-cols-3 md:gap-6">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="shrink-0 w-[80vw] max-w-[320px] rounded-2xl border border-gray-100 bg-white p-6 md:w-auto md:max-w-none md:shrink animate-pulse"
                        >
                            <div className="mb-4 aspect-square rounded-xl bg-gray-100" />
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="h-4 w-24 rounded bg-gray-100 mb-2" />
                                    <div className="h-3 w-16 rounded bg-gray-100" />
                                </div>
                                <div className="text-right">
                                    <div className="h-6 w-14 rounded bg-gray-100 mb-1" />
                                    <div className="h-5 w-16 rounded-full bg-gray-100" />
                                </div>
                            </div>
                            <div className="mt-3 h-3 w-28 rounded bg-gray-100" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
