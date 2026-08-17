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
  title: "LUXE — Private Aviation Livery & Chauffeur Sanctuary",
  description: "Book an executive private chauffeur in seconds. Luxury sedans, SUVs, and sprinters with concierge-level flight tracking tailored to your exact preferences.",
  applicationName: "LUXE",
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
