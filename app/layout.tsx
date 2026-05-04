import type { Metadata } from "next";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitSplit",
  description: "Gym membership and workout management for focused fitness teams.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", type: "image/x-icon" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icon-512.png?v=3"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
          <header className="topbar">
            <Link className="brand" href="/">
              <img
                alt="FitSplit"
                className="brand-icon"
                height="36"
                src="/icon-512.png"
                width="36"
              />
              <span>
                <strong>FitSplit</strong>
                <small>Gym operations</small>
              </span>
            </Link>
            <MainNav />
            <ThemeToggle />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
