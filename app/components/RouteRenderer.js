// ─────────────────────────────────────────────────────────────────────────────
// RouteRenderer.js
//
// Calls our internal Mappls routing endpoint (POST /api/route).
// The backend handles optimization, caching, and the Mappls API call.
//
// INPUT:  coordinatesArr — ["lng,lat", "lng,lat", ...]  (same as before)
// OUTPUT: A route object with { geometry, legs, distance, duration }
//         — identical shape to what OSRM returned, so MapDashboard is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert ["lng,lat", ...] strings to [{ lat, lng }, ...] objects
 * so the backend can run optimization and call Mappls.
 */
function coordStringsToPoints(coordinatesArr) {
  return coordinatesArr.map((coord) => {
    const [lng, lat] = coord.split(",").map(Number);
    return { lat, lng };
  });
}

export async function drawRoute(coordinatesArr) {
  if (!coordinatesArr || coordinatesArr.length < 2) return null;

  try {
    const points = coordStringsToPoints(coordinatesArr);

    const res = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    });

    if (!res.ok) throw new Error(`Route API responded with status ${res.status}`);

    const data = await res.json();

    if (!data.path || !data.legs) {
      console.warn("[RouteRenderer] Mappls returned incomplete data:", data);
      return null;
    }

    // Re-shape to match the OSRM response shape MapDashboard already reads:
    // { geometry: { coordinates: [[lng, lat], ...] }, legs: [...], distance, duration }
    return {
      geometry: {
        coordinates: data.path.map(([lat, lng]) => [lng, lat]),
      },
      legs: data.legs.map((leg) => ({
        distance: leg.distance * 1000, // km → metres (MapDashboard divides by 1000 again)
        duration: leg.duration,
      })),
      distance: data.distance * 1000,
      duration: data.time,
    };
  } catch (err) {
    console.error("[RouteRenderer] Mappls Route Error:", err.message);
    return null;
  }
}
