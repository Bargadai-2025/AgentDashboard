"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AdminAssignment — /admin page
//
// FLOW:
//   1. Left column: All agents from DB (click to select)
//   2. Right column: All unassigned customers from DB (checkboxes to select)
//   3. Confirm button: PATCH selected customers' agentId + push to agent.customers[]
//
// DATA: Fetches live from /api/agent (agents) and /api/customer (all customers).
//       On save → calls PATCH /api/agent/[id] to bind customer IDs to agent.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

export default function AdminAssignment() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);   // customer _id strings
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [agentRes, custRes] = await Promise.all([
          fetch("/api/agents"),
          fetch("/api/customers"),
        ]);
        const agentJson = await agentRes.json();
        const custJson = await custRes.json();
        setAgents(agentJson.data || []);
        setCustomers(custJson.data || []);
      } catch (err) {
        console.error("[Admin] Data load failed:", err);
        toast.error("Failed to load data from server.", { theme: "dark" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleCustomer = (customerId) => {
    setSelectedIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSaveAssignment = async () => {
    if (!selectedAgent || selectedIds.length === 0) return;
    setSaving(true);
    try {
      // PATCH the agent → merges selectedIds into agent.customers[]
      const res = await fetch(`/api/agents/${selectedAgent._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: selectedIds }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.msg || "Assignment failed");

      // Also update each customer's agentId field so the reverse link is consistent
      await Promise.all(
        selectedIds.map((custId) =>
          fetch(`/api/customers/${custId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId: selectedAgent._id }),
          })
        )
      );

      toast.success(
        `✓ ${selectedIds.length} customer(s) assigned to ${selectedAgent.name}`,
        { theme: "dark" }
      );
      setSelectedIds([]);
      setSelectedAgent(null);
    } catch (err) {
      console.error("[Admin] Save failed:", err);
      toast.error(err.message, { theme: "dark" });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#24aa4d] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#24aa4d] text-xs font-bold tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#000] overflow-y-auto text-white p-8 pb-5 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header>
          <h1 className="text-3xl font-black tracking-tight text-[#24aa4d]">
            AGENT <span className="text-white">ASSIGNMENT</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Select an agent, pick customers, then save to link them.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10">

          {/* ── Column 1: Agents ──────────────────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#24aa4d]">
              01 — Select Agent
            </h2>

            {agents.length === 0 ? (
              <p className="text-gray-600 text-sm">No agents in DB yet. Add via /superadmin.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {agents.map((agent) => (
                  <motion.div
                    key={agent._id}
                    whileHover={{ x: 4 }}
                    onClick={() => { setSelectedAgent(agent); setSelectedIds([]); }}
                    className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-center gap-4 ${selectedAgent?._id === agent._id
                      ? "bg-[#24aa4d] border-[#24aa4d] text-black"
                      : "bg-white/5 border-white/10 text-gray-300 hover:border-white/30"
                      }`}
                  >
                    {agent.image ? (
                      <img
                        src={agent.image}
                        alt={agent.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/20 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {agent.name?.[0] || "A"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold truncate">{agent.name}</p>
                      <p className="text-[10px] uppercase opacity-60 truncate">
                        {agent.location || "No location"}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── Column 2: Customers ───────────────────────────────────────── */}
          <div className="space-y-4 mb-10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#24aa4d]">
              02 — Assign Customers {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
            </h2>

            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] font-black uppercase text-gray-500">
                  <tr>
                    <th className="p-5 w-16">✓</th>
                    <th className="p-5">Customer</th>
                    <th className="p-5">Loan Ref</th>
                    <th className="p-5">Assigned To</th>
                    <th className="p-5">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-600 text-sm">
                        No customers in DB. Add via /superadmin.
                      </td>
                    </tr>
                  ) : (
                    customers.map((cust) => {
                      const isSelected = selectedIds.includes(cust._id);
                      // Find the agent name this customer is already assigned to
                      const assignedAgent = agents.find(
                        (a) => a._id === cust.agentId?.toString?.()
                      );
                      return (
                        <tr
                          key={cust._id}
                          onClick={() => toggleCustomer(cust._id)}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-[#24aa4d]/10" : "hover:bg-white/[0.02]"
                            }`}
                        >
                          <td className="p-5">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                ? "border-[#24aa4d] bg-[#24aa4d]"
                                : "border-white/20"
                                }`}
                            >
                              {isSelected && <div className="w-2 h-2 bg-black rounded-full" />}
                            </div>
                          </td>
                          <td className="p-5">
                            <p className="font-bold">{cust.name}</p>
                            <p className="text-[10px] text-gray-500">
                              {cust.location?.lat?.toFixed(4)}, {cust.location?.lng?.toFixed(4)}
                            </p>
                          </td>
                          <td className="p-5 font-mono text-xs text-gray-400">
                            {cust.loan || "—"}
                          </td>
                          <td className="p-5 text-xs">
                            {assignedAgent ? (
                              <span className="text-[#24aa4d] font-bold">{assignedAgent.name}</span>
                            ) : (
                              <span className="text-gray-600">Unassigned</span>
                            )}
                          </td>
                          <td className="p-5 font-mono text-xs text-gray-400">
                            {cust?.address || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Save Button ─────────────────────────────────────────────── */}
            <AnimatePresence>
              {selectedAgent && selectedIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="p-6 mb-20 bg-[#24aa4d] rounded-2xl flex justify-between items-center shadow-[0_20px_40px_rgba(36,170,77,0.2)]"
                >
                  <div>
                    <p className="text-black text-[10px] font-black uppercase tracking-widest">
                      Ready to Dispatch
                    </p>
                    <p className="text-black font-semibold mt-0.5">
                      Assign {selectedIds.length} customer{selectedIds.length > 1 ? "s" : ""} to{" "}
                      <strong>{selectedAgent.name}</strong>
                    </p>
                  </div>
                  <button
                    onClick={handleSaveAssignment}
                    disabled={saving}
                    className="bg-black text-[#24aa4d] px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Assignment"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}