import { Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LandingContent } from "@/components/landing/LandingContent";
import { FeaturedAnalyses } from "@/components/landing/FeaturedAnalyses";
import { FeaturedAnalysesSkeleton } from "@/components/landing/FeaturedAnalysesSkeleton";

export default function Home() {
    return (
        <AppLayout hideFooter>
            <LandingContent
                featuredSection={
                    <Suspense fallback={<FeaturedAnalysesSkeleton />}>
                        <FeaturedAnalyses />
                    </Suspense>
                }
            />
        </AppLayout>
    );
}
