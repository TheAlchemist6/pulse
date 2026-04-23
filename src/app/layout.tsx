import type { Metadata } from "next";
import { Inter, Cormorant_Garamond, DM_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider, ThemeProviderWrapper } from "@/lib/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulse - YouTube Subscription Manager",
  description: "Organize, audit, and monitor your YouTube subscriptions with AI-powered categorization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${cormorant.variable} ${dmMono.variable}`}
    >
      <body className={inter.className}>
        <ThemeProviderWrapper>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
