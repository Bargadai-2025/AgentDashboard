// ─────────────────────────────────────────────────────────────────────────────
// Route Optimization Helpers
// Used by: app/api/route/route.js (Mappls routing endpoint)
//
// Algorithm: Nearest-Neighbour permutation TSP.
// Keeps the first point (index 0) fixed as the start, then finds the
// shortest permutation of the remaining stops using Haversine distance.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haversine distance in km between two {lat, lng} points.
 */
function haversineDistance(a, b) {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const aVal =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

/**
 * Generate all permutations of an array.
 * NOTE: Only viable for small arrays (≤8 stops). For larger sets,
 *       swap this for a greedy nearest-neighbour algorithm.
 */
function permute(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permute(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/**
 * optimizeRoute(points)
 *
 * Returns an array of indices representing the shortest visit order.
 * Index 0 (start point) is always kept first.
 *
 * @param {Array<{ lat: number, lng: number }>} points
 * @returns {number[]} e.g. [0, 2, 1, 3]
 */
// export function optimizeRoute(points) {
//   // Trivial cases — nothing to optimize
//   if (!points || points.length <= 3) {
//     return points.map((_, i) => i);
//   }

//   const startIdx = 0;
//   const endIdx = points.length - 1;

//   // Flexible indices are everything between start and end
//   const flexibleIndices = Array.from({ length: points.length - 2 }, (_, i) => i + 1);

//   let bestRoute = [startIdx, ...flexibleIndices, endIdx];
//   let minDistance = Infinity;

//   // For very small sets (<= 8 stops), we can use brute force permutations
//   // For larger sets, this will be slow, but for 5-6 customers it's perfect.
//   for (const perm of permute(flexibleIndices)) {

//     const currentRoute = [startIdx, ...perm, endIdx];
//     let totalDistance = 0;

//     // Calculate distance between each sequential stop including the return leg
//     for (let i = 0; i < currentRoute.length - 1; i++) {
//       totalDistance += haversineDistance(points[currentRoute[i]], points[currentRoute[i + 1]]);
//     }

//     if (totalDistance < minDistance) {
//       minDistance = totalDistance;
//       bestRoute = currentRoute;
//     }
//   }

//   return bestRoute;
// }

export function optimizeRoute(points) {
  if (!points || points.length <= 3) {
    return points.map((_, i) => i);
  }

  const start = 0;
  const end = points.length - 1;

  const visited = new Set([start]);
  const route = [start];

  let current = start;

  while (visited.size < points.length - 1) {
    let nearest = null;
    let minDist = Infinity;

    for (let i = 1; i < points.length - 1; i++) {
      if (!visited.has(i)) {
        const dist = haversineDistance(points[current], points[i]);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
    }

    route.push(nearest);
    visited.add(nearest);
    current = nearest;
  }

  route.push(end);

  return route;
}

