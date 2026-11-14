import type { Metadata } from "next";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import { AppTopbar } from "@/components/app-topbar";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getCurrentUser } from "@/lib/auth";
import { Inter, Archivo } from "next/font/google";
import "./globals.css";
import "./styles/00-base-shell.css";
import "./styles/02-shared-components.css";
import "./styles/03-visual-refresh.css";
import "./styles/05-theme-polish.css";
import "./styles/06-programs-mobile-legacy-landing.css";
import "./styles/07-member-dashboard-legacy.css";
import "./styles/08-admin-catalog-media.css";
import "./styles/09-profile-history-notices-loader.css";
import "./styles/10-pt-training.css";
import "./styles/forms.css";
import "./styles/member.css";
import "./styles/13-skeletons.css";
import "./styles/14-radix-overrides.css";
import "./styles/15-ui-upgrades.css";
import "./styles/16-ux-improvements.css";
import "./styles/17-profile-metrics.css";
import "./styles/18-billing-trainers.css";
import "./styles/22-owner-detail-reports.css";
import "./styles/28-mobile-foundation.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["500", "600", "700"]
});

export const metadata: Metadata = {
  title: "FitSplit",
  description: "Free workout plans, an exercise library and a set-by-set training log.",
  manifest: "/manifest.json?v=11",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=11", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=11", sizes: "16x16", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png?v=11"
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isPublicLanding = pathname === "/";
  const currentUser = isPublicLanding ? null : await getCurrentUser();

  const initials = currentUser
    ? currentUser.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  // Dark-only: data-theme="dark" is a fixed marker for the few selectors that still key off it.
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${archivo.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="color-scheme" content="dark" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FitSplit" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json?v=11" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=11" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=11" />
        <link rel="shortcut icon" href="/favicon-32x32.png?v=11" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=11" />
      </head>
      <body>
        <div className="app-shell">
          <ScrollReveal />
          {!isPublicLanding && <PwaInstallPrompt />}
          {currentUser && <AppTopbar initials={initials} avatarUrl={currentUser.avatarUrl} />}
          {children}
          <Toaster
            position="bottom-center"
            offset={{ bottom: "calc(var(--tabbar-height) + 16px + env(safe-area-inset-bottom, 0px))" }}
            mobileOffset={{ bottom: "calc(var(--tabbar-height) + 16px + env(safe-area-inset-bottom, 0px))" }}
            toastOptions={{
              style: {
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "10px",
                fontSize: "0.875rem"
              }
            }}
          />
        </div>
      </body>
    </html>
  );
}
