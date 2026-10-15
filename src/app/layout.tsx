import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoviSahana — Bridging Rural Farmers with Verified Agricultural Experts",
  description:
    "GoviSahana connects Sri Lankan farmers with verified agricultural experts, enterprises, workers and buyers. Report crop problems, get expert advice, trade crops, and modernise your farm.",
  keywords: ["GoviSahana", "Sri Lanka agriculture", "farmers", "agricultural experts", "crop disease", "agriculture Sri Lanka"],
  authors: [{ name: "GoviSahana" }],
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32.png"],
  },
  openGraph: {
    title: "GoviSahana — Bridging Rural Farmers with Verified Agricultural Experts",
    description: "Connecting Sri Lankan farmers with verified agricultural experts, enterprises, workers and buyers.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GoviSahana" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoviSahana",
    description: "Bridging Rural Farmers with Verified Agricultural Experts",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
