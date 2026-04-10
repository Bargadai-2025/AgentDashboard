export function getDistance(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const lat1 = a.lat * (Math.PI / 180);
  const lat2 = b.lat * (Math.PI / 180);
  const aVal =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

export function permute(arr) {
  if (arr.length === 0) return [[]];
  if (arr.length === 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    const perms = permute(rest);
    for (const p of perms) {
      result.push([arr[i], ...p]);
    }
  }
  return result;
}

export function optimizeRoute(points) {
  if (points.length <= 2) return points.map((_, i) => i);
  const start = 0;
  const flexible = [];
  for (let i = 1; i < points.length; i++) flexible.push(i);
  const permutations = permute(flexible);
  let bestRoute = [];
  let minDistance = Infinity;
  
  for (const perm of permutations) {
    const route = [start, ...perm];
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += getDistance(points[route[i]], points[route[i + 1]]);
    }
    if (total < minDistance) {
      minDistance = total;
      bestRoute = route;
    }
  }
  return bestRoute;
}
