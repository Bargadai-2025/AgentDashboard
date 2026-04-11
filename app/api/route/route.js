import { optimizeRoute } from "../../lib/optimized";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/route
//
// Accepts a list of { lat, lng } waypoints and returns an optimized driving
// route using the Mappls Route Advance API.
//
// SENIOR-LEVEL PATTERNS USED:
//   1. Static cache (5-min TTL) — identical payloads skip the API entirely.
//   2. Request coalescing — simultaneous identical requests share ONE API call.
//   3. Payload hashing — requests compared by coordinates, not object identity.
// ─────────────────────────────────────────────────────────────────────────────

// In-memory stores (module-level singleton per server instance)
const sharedRequests = new Map(); // hash → Promise (in-flight deduplication)
const responseCache = new Map();  // hash → { data, timestamp }

const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
let globalHitCount = 0;             // for server-side monitoring logs

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * SHA-256 hash of the waypoint coordinates (6 decimal places).
 * Used as the dedup/cache key.
 */
function generatePayloadHash(points) {
  const simplified = points
    .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)
    .join("|");
  return createHash("sha256").update(simplified).digest("hex");
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req) {
  try {
    const body = await req.json();
    const { points, requestId: clientRequestId } = body;

    // ── Input Validation ────────────────────────────────────────────────────
    if (!points || !Array.isArray(points) || points.length < 2) {
      return NextResponse.json(
        { error: "At least 2 points are required." },
        { status: 400 }
      );
    }

    const payloadHash = generatePayloadHash(points);
    const logId = clientRequestId || `HASH-${payloadHash.substring(0, 8)}`;

    // ── 1. Static Cache Check ───────────────────────────────────────────────
    const cached = responseCache.get(payloadHash);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[ROUTE] [${logId}] ⚡ Cache hit.`);
      return NextResponse.json({ ...cached.data, status: "CACHED" });
    }

    // ── 2. Request Coalescing — Join In-Flight Request ──────────────────────
    // If the exact same route is already being fetched, wait for that result
    // instead of making a second Mappls API call.
    if (sharedRequests.has(payloadHash)) {
      console.log(`[ROUTE] [${logId}] 🤝 Joining in-flight request.`);
      const existingData = await sharedRequests.get(payloadHash);
      return NextResponse.json({ ...existingData, status: "COALESCED" });
    }

    // ── 3. New Atomic Request ───────────────────────────────────────────────
    const executeRequest = (async () => {
      const apiKey =
        process.env.MAPPLS_API_KEY || process.env.NEXT_PUBLIC_MAPPLS_API_KEY || "";

      // LOCAL optimization (zero API hits) — reorder stops for shortest path
      const optimizedOrder = optimizeRoute(points);
      const optimizedPoints = optimizedOrder.map((idx) => points[idx]);

      // Build the Mappls Route Advance URL
      // Format: lng,lat;lng,lat;...
      const optimizedCoords = optimizedPoints
        .map((p) => `${p.lng},${p.lat}`)
        .join(";");

      const routeUrl =
        `https://apis.mappls.com/advancedmaps/v1/${apiKey}/route_adv/driving/${optimizedCoords}` +
        `?geometries=geojson&overview=full`;

      globalHitCount++;
      console.log(
        `[ROUTE] [${logId}] [Hit #${globalHitCount}] 🌍 Fetching Mappls route...`
      );

      const routeRes = await fetch(routeUrl, { cache: "no-store" });

      // ── Parse Response ──────────────────────────────────────────────────
      let routeData;
      const contentType = routeRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        routeData = await routeRes.json();
      } else {
        const text = await routeRes.text();
        throw new Error(`Mappls API returned non-JSON: ${text.substring(0, 100)}`);
      }

      if (!routeRes.ok || !routeData.routes?.[0]) {
        throw new Error(
          `Mappls route failed (HTTP ${routeRes.status}): ${JSON.stringify(routeData)}`
        );
      }

      const route = routeData.routes[0];

      // ── Shape the Result ────────────────────────────────────────────────
      // Convert Mappls [lng, lat] coordinates to Leaflet/Mappls SDK [lat, lng]
      const finalResult = {
        path: route.geometry.coordinates.map((c) => [c[1], c[0]]),
        distance: route.distance / 1000,       // metres → km
        time: route.duration,                  // seconds
        legs: (route.legs || []).map((leg) => ({
          distance: (leg.distance || 0) / 1000, // metres → km
          duration: leg.duration || 0,           // seconds
        })),
        optimizedOrder,
        status: "SUCCESS",
      };

      // Populate cache for future identical requests
      responseCache.set(payloadHash, { data: finalResult, timestamp: Date.now() });

      return finalResult;
    })();

    // Register this promise so concurrent identical requests can join it
    sharedRequests.set(payloadHash, executeRequest);

    try {
      const result = await executeRequest;
      return NextResponse.json(result);
    } finally {
      // Always remove from the coalescing map once settled (success or error)
      sharedRequests.delete(payloadHash);
    }
  } catch (error) {
    console.error("[ROUTE] Unhandled error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
