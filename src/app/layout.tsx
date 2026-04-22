import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider, ThemeProviderWrapper } from "@/lib/providers";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProviderWrapper>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
