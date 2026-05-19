import type { Metadata } from "next";
import { AppFooter } from "@/components/app-footer";
import { AppTopbar } from "@/components/app-topbar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SessionTimeout } from "@/components/session-timeout";
import { getCurrentUser } from "@/lib/auth";
import { getAdminNotifications, getGymDetail, getMemberNotifications, getUnreadContactMessageCount } from "@/lib/firebase/read-models";
import type { Notification } from "@/types/domain";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import "./styles/forms.css";
import "./styles/member.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: "FitSplit",
  description: "Workout programming and gym operations for focused fitness teams.",
  manifest: "/manifest.json?v=7",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=7", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=7", sizes: "16x16", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png?v=7"
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

  if (currentUser) {
    initials = currentUser.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const memberId = currentUser.memberId ?? currentUser.uid;
    const [{ gym }] = await Promise.all([
      getGymDetail(currentUser.gymId),
      currentUser.role === "admin"
        ? getUnreadContactMessageCount().then((n) => { unreadInboxCount = n; })
        : Promise.resolve(),
      currentUser.role === "admin"
        ? getAdminNotifications().then((r) => { notifications = r.notifications; })
        : Promise.resolve(),
      currentUser.role === "member"
        ? getMemberNotifications(memberId).then((r) => { notifications = r.notifications; })
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
        <link rel="manifest" href="/manifest.json?v=7" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=7" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=7" />
        <link rel="shortcut icon" href="/favicon-32x32.png?v=7" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=7" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('fitsplit-theme');
                const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.dataset.theme = saved || preferred || 'dark';
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
            initials={initials}
            gymName={gymName}
            notifications={notifications}
            role={currentUser?.role}
            unreadInboxCount={unreadInboxCount}
          />
          {children}
          {currentUser?.role === "member" && <AppFooter />}
          <MobileBottomNav role={currentUser?.role} />
        </div>
      </body>
    </html>
  );
}
