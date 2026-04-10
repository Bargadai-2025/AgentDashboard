"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Navbar.jsx — Global Top Navigation Bar
// Present on all pages via layout.js
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  const navLinks = [
    { href: "/",           label: "Map" },
    { href: "/admin",      label: "Assignments" },
    { href: "/superadmin", label: "Super Admin" },
  ];

  return (
    <nav className="w-full flex-shrink-0 h-14 bg-[#0a0a0a] border-b border-white/5 flex items-center px-6 gap-6 z-50 relative">

      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#24aa4d] flex items-center justify-center">
          <span className="text-black font-black text-xs">B</span>
        </div>
        <div className="leading-tight">
          <span className="text-white font-black text-sm tracking-tight">BARGAD</span>
          <span className="text-[#24aa4d] font-black text-sm tracking-tight"> AGENT </span>
          <span className="text-gray-400 font-bold text-xs tracking-widest uppercase">Tracker</span>
        </div>
      </Link>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-1 ml-2">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pathname === href
                ? "bg-[#24aa4d]/10 text-[#24aa4d]"
                : "text-gray-500 hover:text-white hover:bg-white/5"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex-1" />

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-56">
        <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
        </svg>
        <input
          suppressHydrationWarning
          type="text"
          placeholder="Search agents, customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-white text-xs outline-none flex-1 placeholder:text-gray-600"
        />
      </div>

      {/* Notification Bell */}
      <button className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all group">
        <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#24aa4d]" />
      </button>

      {/* User Avatar */}
      <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#24aa4d]/30 to-purple-600/30 border border-white/10 flex items-center justify-center hover:border-[#24aa4d]/50 transition-all">
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>
    </nav>
  );
}
