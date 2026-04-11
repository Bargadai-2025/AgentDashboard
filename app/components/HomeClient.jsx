// "use client";
// ─────────────────────────────────────────────────────────────────────────────
// HomeClient.jsx — Client Component
//
// Owns the `dynamic` import with ssr:false (required by Next.js App Router
// — dynamic ssr:false is only allowed in Client Components, not Server ones).
// Receives pre-fetched `allAgents` data as a prop from the Server Component.
// ─────────────────────────────────────────────────────────────────────────────

// "use client";

// import { Suspense } from "react";

// import dynamic from "next/dynamic";

// const MapDashboard = dynamic(
//   () => import("./MapDashboard"),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="h-full w-full flex items-center justify-center bg-black">
//         <div className="flex flex-col items-center gap-4">
//           <div className="w-8 h-8 border-2 border-[#24aa4d] border-t-transparent rounded-full animate-spin" />
//           <p className="text-[#24aa4d] text-xs font-bold tracking-widest uppercase">
//             Loading Intelligence Platform...
//           </p>
//         </div>
//       </div>
//     ),
//   }
// );

// export default function HomeClient({ allAgents }) {
//   return (
//     <div className="w-full h-full bg-black font-sans">
//       <Suspense fallback={
//         <div className="h-full w-full flex items-center justify-center bg-black">
//           <div className="w-8 h-8 border-2 border-[#24aa4d] border-t-transparent rounded-full animate-spin" />
//         </div>
//       }>
//         <MapDashboard allAgents={allAgents} />
//       </Suspense>
//     </div>
//   );
// }

"use client";

import MapDashboard from "./MapDashboard";  // direct import
import { Suspense } from "react";

export default function HomeClient({ allAgents }) {
  return (
    <div className="w-full h-full bg-black font-sans">
      <Suspense fallback={<div className="...loading..." />}>
        <MapDashboard allAgents={allAgents} />
      </Suspense>
    </div>
  );
}