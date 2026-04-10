import L from "leaflet";

export function addCustomerMarkers(layerGroup, customers, onClick) {
  customers.forEach((customer, index) => {
    const icon = L.divIcon({
      html: `<div style="
        background:#10b981;
        color:white;
        width: 200px;
        height: 20px;
        border-radius:20px;
        display:flex;
        padding: 5px 12px;
        align-items:center;
        justify-content:center;
        font-weight:bold;
        white-space: nowrap;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      "> ${customer.name + " " + customer.id} </div>`,
      className: "",
      iconSize: [80, 30],
      iconAnchor: [40, 15]
    });

    L.marker([customer.location.lat, customer.location.lng], { icon })
      .addTo(layerGroup)
      .on("click", () => onClick(customer));
  });
}
