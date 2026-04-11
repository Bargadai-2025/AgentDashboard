"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MapDashboard.jsx — Main Map Page Component
//
// UI STATE MACHINE (3 views):
//   VIEW 1 — "overview"  : All agent markers on map. Hover → customer tooltip.
//   VIEW 2 — "agent"     : Clicked an agent. Sidebar = pinned agent header +
//                          scrollable customer cards with distances + cash.
//   VIEW 3 — "customer"  : Clicked a customer card. Sidebar = customer detail
//                          + verification status + action buttons.
//
// LAYOUT: 70/30 grid. Sidebar is flex-col with fixed header + scrollable body.
//         Map never re-zooms on route arrival (polyline runs in separate effect).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MapView from "./MapView";
import { getDistance } from "../utils/routeOptimization";
import { OFFICE } from "../components/staticData";

const VIEW = { OVERVIEW: "overview", AGENT: "agent", CUSTOMER: "customer" };

export default function MapDashboard({ allAgents }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const router = useRouter();
  const searchParams = useSearchParams();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [view, setView] = useState(VIEW.OVERVIEW);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // ── Map State ─────────────────────────────────────────────────────────────
  const [mapPoints, setMapPoints] = useState([]);
  const [routePath, setRoutePath] = useState(null);
  const [optimizedOrder, setOptimizedOrder] = useState([]);
  const [tripSummary, setTripSummary] = useState(null);
  const [customerDistances, setCustomerDistances] = useState({});


  // ── Compute straight-line distances from OFFICE ──────────────────────────

  const computeDistances = useCallback((agent) => {
    if (!agent?.customers?.length) return {};
    return Object.fromEntries(
      agent.customers.map((c) => [
        c._id,
        c.location?.lat ? getDistance(OFFICE, c.location).toFixed(1) : null,
      ])
    );
  }, []);

  // ── Handle agent marker / sidebar click ───────────────────────────────────
  const handleAgentSelect = useCallback(async (agent) => {
    setSelectedAgent(agent);
    setSelectedCustomer(null);
    setView(VIEW.AGENT);
    setCustomerDistances(computeDistances(agent));
    setRoutePath(null);
    setTripSummary(null);
    setOptimizedOrder([]);

    // Build map points: OFFICE first, then customers, then OFFICE again
    const custs = (agent.customers || [])
      .filter((c) => c.location?.lat && c.location?.lng)
      .map((c) => ({ lat: c.location.lat, lng: c.location.lng, data: c }));

    const pts = [
      { lat: OFFICE.lat, lng: OFFICE.lng, name: OFFICE.name, isOffice: true },
      ...custs,
      { lat: OFFICE.lat, lng: OFFICE.lng, name: OFFICE.name, isOffice: true },
    ];

    // Separate array for markers including the agent
    const markers = [
      { lat: agent.location.lat, lng: agent.location.lng, data: agent, isAgent: true },
      { lat: OFFICE.lat, lng: OFFICE.lng, name: OFFICE.name, isOffice: true },
      ...custs
    ];
    setMapPoints(markers);

    // Fetch optimized route for OFFICE -> Customers -> OFFICE
    if (custs.length > 0) {
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points: pts }),
        });
        const data = await res.json();

        if (data.path) {
          const path = data.path.map((c) => ({ lat: c[0], lng: c[1] }));
          console.log(`[MapDashboard] Route received: ${path.length} points.`);
          setRoutePath(path);
        }

        if (data.legs && data.optimizedOrder) {
          const distances = {};
          // Leg 0 goes from points[0] (Office) to points[optimizedOrder[1]]
          // Note: points was [Office, ...custs, Office]
          // optimizedOrder indices refer to this points array.
          data.optimizedOrder.forEach((originalIdx, visitIdx) => {
            if (visitIdx > 0 && visitIdx < data.optimizedOrder.length - 1) {
              const custId = pts[originalIdx].data?._id;
              if (custId) {
                distances[custId] = data.legs[visitIdx - 1]?.distance?.toFixed(1);
              }
            }
          });
          setCustomerDistances(prev => ({ ...prev, ...distances }));
          setTripSummary(data);
        }
        if (data.optimizedOrder) setOptimizedOrder(data.optimizedOrder);
      } catch (err) {
        console.warn("[MapDashboard] Route fetch failed:", err.message);
      }

    }
  }, [computeDistances]);

  // ── Reset to overview ─────────────────────────────────────────────────────
  const handleReset = () => {
    setView(VIEW.OVERVIEW);
    setSelectedAgent(null);
    setSelectedCustomer(null);
    setRoutePath(null);
    setTripSummary(null);
    setOptimizedOrder([]);
    setMapPoints(overviewPoints());
  };

  const overviewPoints = () =>
    (allAgents || [])
      .filter((a) => a.location?.lat && a.location?.lng)
      .map((a) => ({ lat: a.location.lat, lng: a.location.lng, data: a, isAgent: true }));

  // ── Load overview points when allAgents arrives ───────────────────────────
  useEffect(() => {
    if (view === VIEW.OVERVIEW) setMapPoints(overviewPoints());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAgents]);

  // ── Auto-select from ?verified= query param ───────────────────────────────
  useEffect(() => {
    const loan = searchParams?.get("verified");
    if (!loan || !allAgents?.length) return;
    for (const agent of allAgents) {
      const cust = agent.customers?.find((c) => c.loan === loan || c._id === loan);
      if (cust) { handleAgentSelect(agent); setSelectedCustomer(cust); setView(VIEW.CUSTOMER); break; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allAgents]);

  // ── Computed trip stats ───────────────────────────────────────────────────
  const totalKm = tripSummary?.legs ? (tripSummary.legs.reduce((s, l) => s + l.distance, 0)).toFixed(1) : null;
  const totalMin = tripSummary?.legs ? Math.ceil(tripSummary.legs.reduce((s, l) => s + l.duration, 0) / 60) : null;

  if (!mounted) return null;

  // ── Map marker click dispatcher ───────────────────────────────────────────

  const handleMarkerClick = async (pointData) => {
    if (view === VIEW.OVERVIEW && pointData.isAgent) {
      handleAgentSelect(pointData.data);
      return;
    }

    if (view === VIEW.AGENT && !pointData.isAgent && !pointData.isOffice) {
      const customer = pointData.data;
      setSelectedCustomer(customer);
      setView(VIEW.CUSTOMER);

      // 1. Focus markers
      const agentPt = { lat: selectedAgent.location.lat, lng: selectedAgent.location.lng, data: selectedAgent, isAgent: true };
      const customerPt = { lat: customer.location.lat, lng: customer.location.lng, data: customer };
      setMapPoints([agentPt, customerPt]);

      // 2. Fetch specific route for Agent -> Customer
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points: [agentPt, customerPt] }),
        });
        const data = await res.json();
        if (data.path) {
          setRoutePath(data.path.map((c) => ({ lat: c[0], lng: c[1] })));
        }
      } catch (err) {
        console.warn("[MapDashboard] Single route fetch failed:", err);
      }
    }
  };


  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex bg-[#080808] overflow-hidden">

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full relative overflow-hidden">
        <MapView
          points={mapPoints}
          routePath={routePath}
          result={optimizedOrder}
          onMarkerClick={handleMarkerClick}
        />
        {view !== VIEW.OVERVIEW && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleReset}
            className="absolute top-4 left-4 z-10 bg-black/80 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 hover:border-[#24aa4d]/50 transition-all backdrop-blur-sm"
          >
            ← All Agents
          </motion.button>
        )}
      </div>

      {/* ── Right Sidebar ────────────────────────────────────────────────── */}
      {/* Structure: outer = fixed size, non-scrolling.
          Inside each view: header is flex-shrink-0, body is flex-1 overflow-y-auto */}
      <aside className="w-[380px] flex-shrink-0 h-full bg-[#0c0c0c] border-l border-white/5 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── VIEW 1: Overview ────────────────────────────────────────── */}
          {view === VIEW.OVERVIEW && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden">
              {/* Static header */}
              <div className="flex-shrink-0 p-6 pb-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-[#24aa4d]/10 border border-[#24aa4d]/20 flex items-center justify-center mb-3">
                  <div className="w-5 h-5 rounded-full bg-[#24aa4d]/40 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-white">Fleet Overview</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {allAgents?.length || 0} active agents · Click any to see customers
                </p>
              </div>
              {/* Scrollable agent list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(allAgents || []).map((a) => (
                  <button key={a._id} onClick={() => handleAgentSelect(a)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-[#24aa4d]/10 border border-white/5 hover:border-[#24aa4d]/30 transition-all text-left">
                    {a.image
                      ? <img src={a.image} alt={a.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-9 h-9 rounded-full bg-[#24aa4d]/20 flex items-center justify-center font-bold text-[#24aa4d] flex-shrink-0">{a.name?.[0]}</div>
                    }
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-white truncate">{a.name}</p>
                      <p className="text-[10px] text-gray-500">{a.customers?.length || 0} customers</p>
                    </div>
                    <span className="ml-auto text-[#24aa4d] text-lg flex-shrink-0">›</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── VIEW 2: Agent Selected ───────────────────────────────────── */}
          {view === VIEW.AGENT && selectedAgent && (
            <motion.div key="agent" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col overflow-hidden">

              {/* ── PINNED AGENT HEADER (never scrolls) ─────────────────── */}
              <div className="flex-shrink-0 bg-gradient-to-br from-purple-900/20 via-[#0c0c0c] to-[#0c0c0c] border-b border-white/5 p-5">
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {selectedAgent.image
                      ? <img src={selectedAgent.image} alt={selectedAgent.name}
                        className="w-16 h-16 rounded-full object-cover border-[3px] border-[#24aa4d] shadow-[0_0_20px_rgba(36,170,77,0.35)]" />
                      : <div className="w-16 h-16 rounded-full bg-[#24aa4d]/20 flex items-center justify-center text-2xl font-black text-[#24aa4d]">{selectedAgent.name?.[0]}</div>
                    }
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#24aa4d] border-2 border-[#0c0c0c]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-[#24aa4d] uppercase tracking-widest">Agent Profile</p>
                    <h2 className="text-xl font-black text-white truncate">{selectedAgent.name}</h2>
                    <p className="text-[#24aa4d] text-[10px] mt-0.5 line-clamp-2 leading-relaxed">
                      {selectedAgent.address || "Fetching address..."}
                    </p>
                  </div>
                </div>

                {/* Trip summary pills */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="bg-black/40 rounded-xl p-2.5 text-center">
                    <p className="text-[#24aa4d] text-base font-black">{selectedAgent.customers?.length || 0}</p>
                    <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">Stops</p>
                  </div>
                  <div className="bg-black/40 rounded-xl p-2.5 text-center">
                    <p className="text-white text-base font-black">{totalKm ?? "—"}</p>
                    <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">KM</p>
                  </div>
                  <div className="bg-black/40 rounded-xl p-2.5 text-center">
                    <p className="text-amber-400 text-base font-black">{totalMin ?? "—"}</p>
                    <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">Min</p>
                  </div>
                </div>
              </div>

              {/* ── SCROLLABLE CUSTOMER LIST ─────────────────────────────── */}
              <div className="flex-1 overflow-y-auto">
                {/* Section label */}
                <div className="px-4 pt-4 pb-2 flex-shrink-0">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">Customer Details</p>
                </div>

                {(selectedAgent.customers || []).length === 0 ? (
                  <div className="p-6 text-center text-gray-600 text-sm">
                    No customers assigned yet.
                    <br />
                    <a href="/admin" className="text-[#24aa4d] text-xs font-bold mt-2 inline-block hover:underline">Assign via Admin →</a>
                  </div>
                ) : (
                  <div className="px-4 pb-4 space-y-3">
                    {(selectedAgent.customers || []).map((cust, idx) => {
                      const distKm = customerDistances[cust._id];
                      const legDist = tripSummary?.legs?.[idx]
                        ? tripSummary.legs[idx].distance?.toFixed(1)
                        : distKm;

                      return (
                        <motion.div
                          key={cust._id}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setView(VIEW.CUSTOMER);
                            // Update map points to focus on this customer + agent
                            setMapPoints([
                              { lat: selectedAgent.location.lat, lng: selectedAgent.location.lng, data: selectedAgent, isAgent: true },
                              { lat: cust.location.lat, lng: cust.location.lng, data: cust }
                            ]);
                          }}

                          className="group p-4 rounded-2xl bg-white/[0.04] border border-white/5 hover:border-[#24aa4d]/40 hover:bg-[#24aa4d]/5 cursor-pointer transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider font-mono">
                                {cust.loan ? `Loan: ${cust.loan}` : `ID: ${cust._id?.slice(-6)}`}
                              </p>
                              <h3 className="font-black text-white text-sm mt-0.5 truncate">{cust.name}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {legDist && (
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-black text-[#24aa4d] bg-[#24aa4d]/10 px-2 py-0.5 rounded-full">
                                    {legDist} km
                                  </span>
                                  <span className="text-[8px] text-gray-600 font-bold uppercase mt-1">
                                    {idx === 0 ? "From Office" : "Next Stop"}
                                  </span>
                                </div>
                              )}
                              {cust.verifiedAgentImage
                                ? <span className="text-[9px] font-bold text-[#24aa4d]">✓ Verified</span>
                                : <span className="text-[9px] font-bold text-amber-500">⚠ Pending</span>
                              }
                            </div>
                          </div>

                          {/* Cash collected */}
                          {cust.cashCollected && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Cash:</span>
                              <span className="text-[11px] font-black text-[#24aa4d]">₹{cust.cashCollected}</span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-3">
                            {cust.verifiedAgentImage ? (
                              <button
                                disabled
                                className="flex-1 py-1.5 text-[10px] font-black uppercase bg-[#24aa4d]/20 text-[#24aa4d] rounded-lg cursor-default"
                              >
                                Verified
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/verify?loan=${cust.loan || cust._id}&customerId=${cust._id}`); }}
                                className="flex-1 py-1.5 text-[10px] font-black uppercase bg-[#24aa4d]/10 text-[#24aa4d] rounded-lg hover:bg-[#24aa4d] hover:text-black transition-all"
                              >
                                Verify
                              </button>
                            )}

                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 py-1.5 text-[10px] font-black uppercase bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-all"
                            >
                              Navigate
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── VIEW 3: Customer Selected ────────────────────────────────── */}
          {view === VIEW.CUSTOMER && selectedCustomer && selectedAgent && (
            <motion.div key="customer" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col overflow-hidden">

              {/* ── PINNED HEADER ────────────────────────────────────────── */}
          {/* ── VIEW 3: Customer Selected ────────────────────────────────── */}
          {view === VIEW.CUSTOMER && selectedCustomer && selectedAgent && (
            <motion.div key="customer" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col overflow-hidden">

              {/* ── PINNED HEADER ────────────────────────────────────────── */}
              <div className="flex-shrink-0 bg-gradient-to-r from-[#24aa4d]/10 to-transparent border-b border-white/5">
                <button
                  onClick={() => handleAgentSelect(selectedAgent)}
                  className="w-full flex items-center gap-2 px-4 pt-4 pb-2 text-[10px] font-black text-[#24aa4d] uppercase tracking-widest hover:opacity-70 transition-opacity"
                >
                  ← Back to {selectedAgent.name}
                </button>

                <div className="flex items-center gap-3 px-4 pb-4">
                  {selectedAgent.image
                    ? <img src={selectedAgent.image} alt={selectedAgent.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-[#24aa4d]/20 flex items-center justify-center font-bold text-[#24aa4d] flex-shrink-0">{selectedAgent.name?.[0]}</div>
                  }
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-[#24aa4d] uppercase tracking-widest">Agent</p>
                    <p className="font-black text-sm text-white truncate">{selectedAgent.name}</p>
                  </div>
                  <p className="ml-auto text-[9px] text-gray-500 font-bold uppercase flex-shrink-0">Customer Details</p>
                </div>
              </div>

              {/* ── SCROLLABLE BODY ──────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Name + Loan */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider font-mono mb-1">
                    {selectedCustomer.loan ? `Loan: ${selectedCustomer.loan}` : `ID: ${selectedCustomer._id?.slice(-8)}`}
                  </p>
                  <h2 className="text-2xl font-black text-white">{selectedCustomer.name}</h2>
                  <p className="text-xs text-[#24aa4d] font-bold mt-2 leading-relaxed">
                    {selectedCustomer.address || "Fetching address..."}
                  </p>
                  {customerDistances[selectedCustomer._id] && (
                    <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wider">↔ {customerDistances[selectedCustomer._id]} km from agent</p>
                  )}
                  {/* Cash collected */}
                  {selectedCustomer.cashCollected && (
                    <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-[#24aa4d]/10 border border-[#24aa4d]/20">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Cash Collected</span>
                      <span className="text-base font-black text-[#24aa4d] ml-auto">₹{selectedCustomer.cashCollected}</span>
                    </div>
                  )}
                </div>

                {/* Verification status */}
                <div className={`p-4 rounded-2xl border ${selectedCustomer.verifiedAgentImage ? "bg-[#24aa4d]/10 border-[#24aa4d]/30" : "bg-red-500/5 border-red-500/20"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedCustomer.verifiedAgentImage ? "bg-[#24aa4d] shadow-[0_0_8px_#24aa4d]" : "bg-red-500 animate-pulse"}`} />
                      <span className={`text-[11px] font-black uppercase tracking-widest ${selectedCustomer.verifiedAgentImage ? "text-[#24aa4d]" : "text-red-400"}`}>
                        {selectedCustomer.verifiedAgentImage ? "Identity Verified" : "Verification Required"}
                      </span>
                    </div>
                    {/* Delete Icon for verified customers */}
                    {selectedCustomer.verifiedAgentImage && (
                      <button
                        title="Delete Verification & Re-verify"
                        onClick={async () => {
                          if (!confirm("Are you sure you want to delete this verification and retake it?")) return;
                          try {
                            const res = await fetch("/api/customer/reset-verification", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ customerId: selectedCustomer._id }),
                            });
                            if (res.ok) {
                              // Update local state
                              const updated = { ...selectedCustomer, verifiedAgentImage: null };
                              setSelectedCustomer(updated);
                              // Also update it in the selectedAgent's customer list so the sidebar updates
                              const updatedCustomers = selectedAgent.customers.map(c => 
                                c._id === updated._id ? updated : c
                              );
                              setSelectedAgent({ ...selectedAgent, customers: updatedCustomers });
                            }
                          } catch (err) {
                            console.error("Reset failed:", err);
                          }
                        }}
                        className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    )}
                  </div>

                  {selectedCustomer.verifiedAgentImage ? (
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        <img src={selectedCustomer.verifiedAgentImage} alt="Captured"
                          className="w-20 h-20 rounded-xl object-cover border border-[#24aa4d]/40" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center text-xs text-white pointer-events-none">Verified</div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Biometric Captured</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Agent photo on record</p>
                      </div>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => router.push(`/verify?loan=${selectedCustomer.loan || selectedCustomer._id}&customerId=${selectedCustomer._id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-red-600 text-white font-bold text-xs shadow-[0_4px_12px_rgba(220,38,38,0.4)]"
                    >
                      START LIVENESS CAPTURE <span className="text-lg">→</span>
                    </motion.button>
                  )}
                </div>

                {/* Verification timeline */}
                <div>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em] mb-3">Verification Log</p>
                  <div className="relative border-l border-white/10 ml-2 pl-5 space-y-4">
                    {[
                      { label: "Customer Created", done: true },
                      { label: "Agent Assigned", done: !!selectedCustomer.agentId },
                      { label: "Liveness Verified", done: !!selectedCustomer.verifiedAgentImage },
                    ].map((step, i) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-[27px] top-1 w-2 h-2 rounded-full border-2 border-[#0c0c0c] ${step.done ? "bg-[#24aa4d]" : "bg-gray-700 animate-pulse"}`} />
                        <p className={`text-xs font-bold ${step.done ? "text-white" : "text-gray-500"}`}>{step.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </aside>
    </div>
  );
}