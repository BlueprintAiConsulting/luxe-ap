import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// TODO: replace "Luxe" with client's real business name after discovery
export const metadata: Metadata = {
  title: "Luxe — Private Car & Chauffeur Service",
  description: "Book a private chauffeur in seconds. Luxury sedans, SUVs, and sprinters with a concierge-level ride tailored to your preferences.",
  applicationName: "Luxe",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Luxe" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      {/* impeccable-live-start */}
{/* impeccable-live-end */}
</body>
    </html>
  );
}
