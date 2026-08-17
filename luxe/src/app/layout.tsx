import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cinzel, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://luxe-app-1786335311.web.app"),
  title: "LUXE — Private Aviation Livery & Executive Chauffeur",
  description: "24/7 AI Voice Dispatch, Live Flight Radar & Bespoke Executive Chauffeur Services. World-class Mercedes S-Class, Cadillac Escalade ESV, and Sprinter Jet Charters.",
  applicationName: "LUXE",
  authors: [{ name: "LUXE Livery Group" }],
  keywords: ["Luxury Chauffeur", "Private Jet Livery", "Executive Transportation", "FBO Airport Transfer", "AI Voice Dispatch", "LAX VIP Chauffeur"],
  openGraph: {
    title: "LUXE — Private Aviation Livery & Executive Chauffeur",
    description: "24/7 AI Voice Dispatch, Live Flight Radar & Bespoke Executive Chauffeur Services. World-class Mercedes S-Class, Cadillac Escalade ESV, and Sprinter Jet Charters.",
    url: "https://luxe-app-1786335311.web.app",
    siteName: "LUXE Livery Group",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 675,
        alt: "LUXE Executive Livery & Private Aviation Monogram",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LUXE — Private Aviation Livery & Executive Chauffeur",
    description: "24/7 AI Voice Dispatch, Live Flight Radar & Bespoke Executive Chauffeur Services.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/og-image.png",
    apple: "/og-image.png",
  },
  appleWebApp: { 
    capable: true, 
    statusBarStyle: "black-translucent", 
    title: "LUXE" 
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#060608",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${cormorant.variable} h-full antialiased bg-[#060608] text-[#f4f4f6]`}
    >
      <body className="min-h-full flex flex-col bg-[#060608] text-[#f4f4f6]">
        <NetworkStatusBanner />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
