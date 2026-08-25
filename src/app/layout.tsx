import type { Metadata } from "next";
import { Toaster } from "sonner";
import { headers, cookies } from "next/headers";
import { AppTopbar } from "@/components/app-topbar";
import { TermsConsentGate } from "@/components/terms-consent-gate";
import { FcmSetup } from "@/components/fcm-setup";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SessionTimeout } from "@/components/session-timeout";
import { getCurrentUser } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getGymDetail } from "@/lib/firebase/read-models/gyms";
import {
  getAdminNotifications,
  getMemberNotifications,
  getOwnerNotifications,
  getUnreadContactMessageCount
} from "@/lib/firebase/read-models/notifications";
import { getActiveWorkoutSessions } from "@/lib/firebase/read-models/sessions";
import type { Notification } from "@/types/domain";
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
import "./styles/forms.css";
import "./styles/member.css";
import "./styles/10-pt-training.css";
import "./styles/11-member-tabs.css";
import "./styles/11-bulk-member-list.css";
import "./styles/12-member-dashboard-new.css";
import "./styles/13-skeletons.css";
import "./styles/14-radix-overrides.css";
import "./styles/15-ui-upgrades.css";
import "./styles/16-ux-improvements.css";
import "./styles/17-profile-metrics.css";
import "./styles/18-billing-trainers.css";
import "./styles/19-members-redesign.css";
import "./styles/20-owner-dashboard.css";
import "./styles/21-member-redesign.css";
import "./styles/22-owner-detail-reports.css";
import "./styles/23-member-overview.css";
import "./styles/24-member-workout.css";
import "./styles/25-member-logs.css";
import "./styles/26-member-progress-screen.css";
import "./styles/27-member-macros.css";
import "./styles/28-mobile-foundation.css";
import "./styles/29-mobile-member-shell.css";
import "./styles/30-mobile-workout-logs.css";
import "./styles/31-mobile-macros-coach.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["500", "600", "700"]
});

export const metadata: Metadata = {
  title: "FitSplit",
  description: "Workout programming and gym operations for focused fitness teams.",
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
  // Per-request CSP nonce set by middleware (production only). Inline scripts must
  // carry it to be allowed under the strict nonce CSP.
  const nonce = headerList.get("x-nonce") ?? undefined;
  const isPublicLanding = pathname === "/";
  const currentUser = isPublicLanding ? null : await getCurrentUser();

  // First-login consent gate: show until the user has accepted Terms + Privacy.
  // Real users are remembered via their profile flag; the cookie covers the
  // current session (and mock-mode demo users with no persisted profile).
  const termsAck = (await cookies()).get("fitsplit-terms-ack")?.value === "1";
  const needsConsent = Boolean(currentUser) && !currentUser?.termsAcceptedAt && !termsAck;

  let initials = "";
  let gymName: string | undefined;
  let gymLogoUrl: string | undefined;
  let unreadInboxCount = 0;
  let notifications: Notification[] = [];
  let hasLiveSession = false;

  if (currentUser) {
    initials = currentUser.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const memberId = currentUser.memberId ?? currentUser.uid;
    const [{ gym }] = await Promise.all([
      getGymDetail(currentUser.gymId ?? PRIMARY_GYM_ID),
      currentUser.role === "admin"
        ? getUnreadContactMessageCount().then((n) => { unreadInboxCount = n; })
        : Promise.resolve(),
      currentUser.role === "admin"
        ? getAdminNotifications().then((r) => { notifications = r.notifications; })
        : Promise.resolve(),
      currentUser.role === "member"
        ? getMemberNotifications(memberId, currentUser.gymId).then((r) => { notifications = r.notifications; })
        : Promise.resolve(),
      currentUser.role === "owner"
        ? getOwnerNotifications(currentUser.gymId).then((r) => { notifications = r.notifications; })
        : Promise.resolve(),
      currentUser.role === "member"
        ? getActiveWorkoutSessions(currentUser.gymId).then((r) => {
            hasLiveSession = r.sessions.some((s) => (s as { memberId?: string }).memberId === memberId);
          })
        : Promise.resolve()
    ]);
    gymName = gym?.name;
    gymLogoUrl = gym?.logoUrl;
  }

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${archivo.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111111" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FitSplit" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json?v=11" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=11" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=11" />
        <link rel="shortcut icon" href="/favicon-32x32.png?v=11" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=11" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            /* Resolve the theme before first paint so there is no flash. Stored
               choice wins; otherwise follow the OS. Runs synchronously in <head>. */
            __html: `
              try {
                var stored = localStorage.getItem('fitsplit-theme');
                var theme = stored === 'light' || stored === 'dark'
                  ? stored
                  : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                document.documentElement.dataset.theme = theme;
              } catch (_) {
                document.documentElement.dataset.theme = 'dark';
              }
            `
          }}
        />
      </head>
      <body>
        <div className="app-shell">
          {needsConsent && <TermsConsentGate />}
          <ScrollReveal />
          {!isPublicLanding && <PwaInstallPrompt />}
          <SessionTimeout isAuthenticated={Boolean(currentUser)} />
          <AppTopbar
            gymLogoUrl={gymLogoUrl}
            hasLiveSession={hasLiveSession}
            initials={initials}
            avatarUrl={currentUser?.avatarUrl}
            gymName={gymName}
            notifications={notifications}
            role={currentUser?.role}
            staffType={currentUser?.staffType}
            unreadInboxCount={unreadInboxCount}
          />
          {currentUser?.role === "member" && <FcmSetup />}
          {children}
          <MobileBottomNav role={currentUser?.role} />
          <Toaster
            position="bottom-center"
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
