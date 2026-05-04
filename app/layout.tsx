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

import { cookies } from "next/headers";

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const username = cookieStore.get("fitsplit-username")?.value;
  
  let initials = "";
  if (username) {
    if (username === "mehulchirania" || username === "+91 9688227039") initials = "MC";
    else if (username.includes("owner")) initials = "OW";
    else if (username === "admin") initials = "AD";
    else initials = "AA"; // aarav
  }

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
          <AppTopbar initials={initials} />
          <BackButton />
          {children}
          <footer className="app-footer">{"Developed with 💪 by Mehul"}</footer>
        </div>
      </body>
    </html>
  );
}
