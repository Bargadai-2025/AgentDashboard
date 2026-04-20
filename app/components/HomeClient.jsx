"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const MapDashboard = dynamic(
  () => import("./MapDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#1a0540]" style={{ fontFamily: "'Century Gothic', sans-serif" }}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-[3px] border-[#24aa4d] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#24aa4d] text-[11px] font-bold tracking-[0.2em] uppercase">
            Loading Platform...
          </p>
        </div>
      </div>
    ),
  }
);

export default function HomeClient({ allAgents }) {
  return (
    <div className="w-full h-full bg-[#1a0540]">
      <Suspense fallback={
        <div className="h-full w-full flex items-center justify-center bg-[#1a0540]" style={{ fontFamily: "'Century Gothic', sans-serif" }}>
           <div className="w-10 h-10 border-[3px] border-[#24aa4d] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <MapDashboard allAgents={allAgents} />
      </Suspense>
    </div>
  );
}