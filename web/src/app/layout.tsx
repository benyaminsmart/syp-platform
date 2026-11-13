import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SYP — Rule Your Reach. | Global Creator Marketplace",
  description: "Show Your Profile. Discover, compare, and book verified Instagram & YouTube creators worldwide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${jakarta.variable} ${inter.variable} font-sans antialiased`}>
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060D1A]/85 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <img src="/logo.jpg" alt="SYP Logo" className="w-10 h-10 rounded-xl object-cover border border-cyan-400/30 shadow-lg shadow-blue-500/20" />
              <div>
                <span className="font-extrabold text-xl tracking-wider text-white">SYP</span>
                <span className="hidden sm:inline-block text-xs text-cyan-400 ml-2 font-medium">Show Your Profile</span>
              </div>
            </a>
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-xs text-slate-400 mr-2">Rule Your Reach.</span>
              <a href="#creators" className="px-3.5 py-1.5 text-xs font-bold rounded-lg cyber-gradient text-slate-950 shadow-lg shadow-cyan-500/25">
                Explore Creators
              </a>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
