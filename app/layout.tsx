import type { Metadata } from "next";
import { AppTopbar } from "@/components/app-topbar";
import { BackButton } from "@/components/back-button";
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

import { cookies } from "next/headers";

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const username = cookieStore.get("fitsplit-username")?.value;
  const { gym } = await getTitanWorkspace();
  
  let initials = "";
  if (username) {
    if (username === "mehulchirania" || username === "+91 9688227039") initials = "MC";
    else if (username.includes("owner")) initials = "OW";
    else if (username === "admin") initials = "AD";
    else initials = "AA"; // aarav
  }
  const gymName = username ? gym?.name : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#178a4a" />

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
          <AppTopbar initials={initials} gymName={gymName} />
          <BackButton />
          {children}
          <footer className="app-footer">{"Developed with 💪 by Mehul"}</footer>
        </div>
      </body>
    </html>
  );
}
