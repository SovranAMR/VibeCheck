import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AnalyticsProvider from '@/components/AnalyticsProvider';
import IOSAudioUnlock from '@/components/IOSAudioUnlock';
// Locale switch removed for auto locale

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frekans Profil Testi",
  description: "Ses titreşimleriyle kişisel rezonans imzanı keşfet. Dakikalar içinde benzersiz frekans profilini ortaya çıkar.",
  manifest: "/manifest.json",
  themeColor: "#8b5cf6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Frekans Test"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnalyticsProvider>
          {children}
          <IOSAudioUnlock />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
