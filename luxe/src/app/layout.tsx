import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "LUXE — Private Car & Chauffeur Service",
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
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#09090b] text-[#f4f4f5]`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f5]">
        <NetworkStatusBanner />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
