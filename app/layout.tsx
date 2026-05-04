import type { Metadata } from "next";
import { AppTopbar } from "@/components/app-topbar";
import { BackButton } from "@/components/back-button";
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
          <AppTopbar />
          <BackButton />
          {children}
          <footer className="app-footer">{"Developed with \u2764\uFE0F by Mehul"}</footer>
        </div>
      </body>
    </html>
  );
}
