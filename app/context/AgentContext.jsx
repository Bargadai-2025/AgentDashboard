"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AgentContext.jsx — Global State (Context API)
//
// WHY CONTEXT:
//   Multiple pages need agents+customers: /, /admin, /verify.
//   Without context each page fetches independently → wasted calls + stale data.
//   Context gives one shared, refreshable source of truth.
//
// USAGE:
//   1. Wrap layout with <AgentProvider>
//   2. In any component: const { agents, loading, refreshAgents } = useAgents();
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useEffect } from "react";

// ── The Context Object ────────────────────────────────────────────────────────
const AgentContext = createContext(null);

// ── Provider Component ────────────────────────────────────────────────────────
export function AgentProvider({ children }) {
  const [agents, setAgents] = useState([]);       // All agents with populated customers
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  // Fetch all agents + their customers from the aggregated endpoint.
  // Wrapped in useCallback so consumers can trigger a refresh (e.g. after assigning a customer).
  const refreshAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/agents/with-customers", { cache: "no-store" });
      const json = await res.json();
      setAgents(json.data || []);
    } catch (err) {
      console.error("[AgentContext] Fetch failed:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => { refreshAgents(); }, [refreshAgents]);

  return (
    <AgentContext.Provider value={{ agents, loading, error, refreshAgents }}>
      {children}
    </AgentContext.Provider>
  );
}

// ── Custom Hook ───────────────────────────────────────────────────────────────
// Throw if used outside the provider so mistakes are caught early.
export function useAgents() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgents must be used inside <AgentProvider>");
  return ctx;
}
