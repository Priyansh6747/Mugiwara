import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mugiwara — Anime",
  description: "Your personal anime voyage log. Watch, track, and discover anime.",
  icons: {
    icon: "/Icon.webp",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-void text-parchment bg-noise">
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
