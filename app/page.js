// ─────────────────────────────────────────────────────────────────────────────
// app/page.js — Root Page (Server Component)
//
// Responsibility: fetch live agent data from MongoDB, pass to HomeClient.
// Dynamic import with ssr:false lives in HomeClient (Client Component only).
// ─────────────────────────────────────────────────────────────────────────────

import HomeClient from "./components/HomeClient";

/**
 * Fetch all agents with populated customers from MongoDB.
 * Returns [] on error so the map still renders empty rather than crashing.
 */
async function fetchAgentsWithCustomers() {
  try {
    const res = await fetch(
      `${process.env.BASE_URL || "http://localhost:3000"}/api/agents/with-customers`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error(`[Page] /api/agents/with-customers → HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("[Page] Failed to fetch agents:", err.message);
    return [];
  }
}

export default async function Home() {
  const allAgents = await fetchAgentsWithCustomers();
  return <HomeClient allAgents={allAgents} />;
}