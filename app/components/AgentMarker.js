import L from "leaflet";

export function addAgentMarker(layerGroup, agent, onClick) {
  const agentIcon = L.divIcon({
    html: `<div style="
        background:#2563eb;
        color:white;
        width:220px;
        height:20px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:bold;
        overflow: hidden;
        border: 2px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      ">
      ${agent.image ? `<img src="${agent.image}" style="width:100%; height:100%; object-fit:cover;" />` : 'A'}
      </div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  const marker = L.marker([agent.lat || agent.location.lat, agent.lng || agent.location.lng], {
    icon: agentIcon,
  })
    .addTo(layerGroup);

  if (agent.customers) {
    marker.bindTooltip(`Agent: ${agent.name}<br/>${agent.customers.length} Customers under this agent`);
  }

  if (onClick) {
    marker.on("click", () => onClick(agent));
  }
}
