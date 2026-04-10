import L from "leaflet";

export function initMap(id) {
  const map = L.map(id).setView([19.076, 72.8777], 13);

  // Mappls (MapmyIndia) Raster Tile Layer
  // Please replace 'YOUR_MAPPLS_REST_API_KEY' with your actual MapmyIndia Rest API key
  // You can generate one from the Mappls developer console: https://apis.mappls.com/console/
  const MAPPLS_KEY = "c0ae557754e8913f692841c11b9d979c"; 
  
  L.tileLayer(`https://mt1.mapmyindia.com/advancedmaps/v1/${MAPPLS_KEY}/retina_map/{z}/{x}/{y}.png`, {
    maxZoom: 19,
    attribution: 'Map data &copy; <a href="https://www.mappls.com/" target="_blank">Mappls (MapmyIndia)</a>',
  }).addTo(map);

  return map;
}
