import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Script from "next/script";
import { ToastContainer } from "react-toastify";
import NavbarWrapper from "./components/NavbarWrapper";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Bargad Agent Tracker",
  description: "Real-time field agent monitoring, customer assignment, and liveness verification platform.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://apis.mappls.com/advancedmaps/api/c0ae557754e8913f692841c11b9d979c/map_sdk_css?v=3.0"
        />
      </head>
      <body className="h-full flex flex-col bg-black overflow-hidden">
        {/*
          Mappls SDK — loaded before page is interactive so the map is ready.
          Next.js injects beforeInteractive scripts into <head> automatically.
        */}
        <Script
          src="https://apis.mappls.com/advancedmaps/api/c0ae557754e8913f692841c11b9d979c/map_sdk?v=3.0&layer=vector"
          strategy="beforeInteractive"
        />

        {/* Global Navbar */}
        <NavbarWrapper />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        <ToastContainer
          position="bottom-right"
          theme="dark"
          toastStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
        />
      </body>
    </html>
  );
}
