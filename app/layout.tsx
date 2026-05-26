import type { Metadata } from "next";
import { AppTopbar } from "@/components/app-topbar";
import { FcmSetup } from "@/components/fcm-setup";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SessionTimeout } from "@/components/session-timeout";
import { getCurrentUser } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getAdminNotifications, getGymDetail, getMemberNotifications, getOwnerNotifications, getUnreadContactMessageCount, getActiveWorkoutSessions } from "@/lib/firebase/read-models";
import type { Notification } from "@/types/domain";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import "./styles/00-base-shell.css";
import "./styles/01-owner-members.css";
import "./styles/02-shared-components.css";
import "./styles/03-visual-refresh.css";
import "./styles/04-loader-animation.css";
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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

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
  const currentUser = await getCurrentUser();

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
        ? getMemberNotifications(memberId).then((r) => { notifications = r.notifications; })
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
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${dmSans.variable}`}>
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
          dangerouslySetInnerHTML={{
            __html: `
              try {
                document.documentElement.dataset.theme = 'dark';
              } catch (_) {}
            `
          }}
        />
      </head>
      <body>
        <div className="app-shell">
          <ScrollReveal />
          <PwaInstallPrompt />
          <SessionTimeout isAuthenticated={Boolean(currentUser)} />
          <AppTopbar
            gymLogoUrl={gymLogoUrl}
            hasLiveSession={hasLiveSession}
            initials={initials}
            gymName={gymName}
            notifications={notifications}
            role={currentUser?.role}
            staffType={currentUser?.staffType}
            unreadInboxCount={unreadInboxCount}
          />
          {currentUser?.role === "member" && <FcmSetup />}
          {children}
          <MobileBottomNav role={currentUser?.role} />
        </div>
      </body>
    </html>
  );
}
