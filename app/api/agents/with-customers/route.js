import { NextResponse } from "next/server";
import { DBConnection } from "../../db/db.js";
import AgentModel from "../../db/models/agents.models.js";
// ⚠️ MUST import CustomerModel so Mongoose registers the "Customers" schema
// before AgentModel.populate("customers") attempts to resolve the reference.
import CustomerModel from "../../db/models/customer.models.js"; // eslint-disable-line no-unused-vars


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/with-customers
//
// Returns every agent in the DB with their assigned customers fully populated.
// Also normalizes the agent `location` field:
//   - Schema stores it as a String "lat,lng"  (legacy)
//   - This endpoint always returns { lat: Number, lng: Number }
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a location value that may be:
 *   - Already an object:  { lat: 19.07, lng: 72.87 }
 *   - A comma string:     "19.07, 72.87"
 * Returns { lat, lng } or null if unparseable.
 */
function parseLocation(raw) {
  if (!raw) return null;

  // Already a proper object (e.g. customer location)
  if (typeof raw === "object" && raw.lat != null && raw.lng != null) {
    return { lat: Number(raw.lat), lng: Number(raw.lng) };
  }

  // Legacy string format "lat, lng"
  if (typeof raw === "string") {
    const parts = raw.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !parts.some(isNaN)) {
      return { lat: parts[0], lng: parts[1] };
    }
  }

  return null;
}

export async function GET() {
  await DBConnection();

  try {
    // Populate customers so we get the full customer docs (name, location, etc.)
    const rawAgents = await AgentModel.find().populate("customers").lean();

    // Shape each agent into a clean, frontend-ready object
    const agents = rawAgents
      .map((agent) => {
        const location = parseLocation(agent.location);

        // Skip agents without a valid location — they can't be placed on map
        if (!location) {
          console.warn(`[API] Agent "${agent.name}" has no valid location — skipped.`);
          return null;
        }

        // Shape each customer
        const customers = (agent.customers || [])
          .map((c) => {
            const custLocation = parseLocation(c.location);
            if (!custLocation) return null; // skip unplaceable customers too
            return {
              _id: c._id.toString(),
              name: c.name || "Unknown Customer",
              loan: c.loan || "",               // loan ref used by verify page
              location: custLocation,
              address: c.address || "",         // human-readable address from Mappls
              agentId: c.agentId?.toString() || agent._id.toString(),
              verifiedAgentImage: c.verifiedAgentImage || "",
              cashCollected: c.cashCollected || "",
            };
          })
          .filter(Boolean); // remove nulls

        return {
          _id: agent._id.toString(),
          name: agent.name || "Unknown Agent",
          image: agent.image || "",
          location,
          address: agent.address || "",         // human-readable address from Mappls
          customers,
        };
      })
      .filter(Boolean); // remove null agents

    return NextResponse.json({
      status: 200,
      msg: "Agents with customers fetched successfully!",
      data: agents,
    });
  } catch (error) {
    console.error("[GET /api/agents/with-customers] Error:", error);
    return NextResponse.json(
      { status: 500, msg: "Failed to fetch agents.", error: error.message },
      { status: 500 }
    );
  }
}
