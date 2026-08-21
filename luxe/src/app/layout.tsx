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
  title: "KLS Luxe — Executive Black Car & Luxury Chauffeur Service",
  description: "Premier executive black car, luxury airport transfers (LAX, JFK, LGA, FBOs), and 24/7 AI-powered precision chauffeur service. Pristine Cadillac Escalade ESV, Mercedes-Benz S-Class, and Executive Sprinter charters.",
  applicationName: "KLS Luxe",
  authors: [{ name: "KLS Luxe Livery Group" }],
  keywords: [
    "KLS Luxe",
    "Luxury Chauffeur",
    "Executive Black Car",
    "Airport Transfer",
    "LAX VIP Chauffeur",
    "Private Aviation Livery",
    "AI Voice Dispatch",
    "Cadillac Escalade ESV",
    "Mercedes S-Class"
  ],
  openGraph: {
    title: "KLS Luxe — Executive Black Car & Luxury Chauffeur Service",
    description: "Premier executive black car, luxury airport transfers (LAX, JFK, LGA, FBOs), and 24/7 AI-powered precision chauffeur service.",
    url: "https://luxe-app-1786335311.web.app",
    siteName: "KLS Luxe",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 675,
        alt: "KLS Luxe Premier Executive Chauffeur & Livery",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KLS Luxe — Executive Black Car & Luxury Chauffeur Service",
    description: "Premier executive black car, luxury airport transfers, and 24/7 AI-powered chauffeur service.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: { 
    capable: true, 
    statusBarStyle: "black-translucent", 
    title: "KLS Luxe" 
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
