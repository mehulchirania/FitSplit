import type { Metadata } from "next";
import { AppTopbar } from "@/components/app-topbar";
import { BackButton } from "@/components/back-button";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getCurrentUser } from "@/lib/auth";
import { getTitanWorkspace } from "@/lib/firebase/read-models";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitSplit",
  description: "Workout programming and gym operations for focused fitness teams.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", type: "image/x-icon" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icon-512.png?v=3"
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, { gym }] = await Promise.all([
    getCurrentUser(),
    getTitanWorkspace()
  ]);
  
  let initials = "";
  if (currentUser) {
    initials = currentUser.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  const gymName = currentUser ? gym?.name : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111111" />

        {/* Google Fonts: Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

        {/* Points to your manifest file */}
        <link rel="manifest" href="/manifest.json" />

        {/* Uses the cropped icon for the browser tab */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png?v=3" />

        {/* Tells iPhones to use the same image for the home screen */}
        <link rel="apple-touch-icon" href="/icon-512.png?v=3" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('fitsplit-theme');
                const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.dataset.theme = saved || preferred;
              } catch (_) {}
            `
          }}
        />
      </head>
      <body>
        <div className="app-shell">
          <ScrollReveal />
          <AppTopbar initials={initials} gymName={gymName} role={currentUser?.role} />
          <BackButton />
          {children}
          <footer className="app-footer">{"Developed with 💪 by Mehul"}</footer>
        </div>
      </body>
    </html>
  );
}
