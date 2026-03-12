import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthModalProvider } from "@/providers/auth-modal-provider";
import { CookieConsentProvider } from "@/providers/cookie-consent-provider";
import { AuthModal } from "@/components/auth/AuthModal";
import { CookieConsentModal } from "@/components/shared/CookieConsentModal";
import { GoogleTagManager, GoogleTagManagerNoscript } from "@/components/shared/GoogleTagManager";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "LogoLab - brandguide SCORE elemzés",
    description: "Teszteld a logódat a brandguide SCORE rendszerével! AI-alapú elemzés, szakmai visszajelzés 7 szempont szerint.",
};

export const viewport: Viewport = {
    themeColor: "#f59e0b",
    colorScheme: "light",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="hu" suppressHydrationWarning>
            <head>
                <GoogleTagManager />
            </head>
            <body className={cx(inter.variable, "bg-secondary antialiased")}>
                <GoogleTagManagerNoscript />
                <RouteProvider>
                    <CookieConsentProvider>
                        <Theme>
                            <AuthProvider>
                                <AuthModalProvider>
                                    {children}
                                    <AuthModal />
                                    <CookieConsentModal />
                                </AuthModalProvider>
                            </AuthProvider>
                        </Theme>
                    </CookieConsentProvider>
                </RouteProvider>
            </body>
        </html>
    );
}
