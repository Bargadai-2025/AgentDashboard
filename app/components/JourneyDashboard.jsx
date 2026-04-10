"use client";

import { useState } from "react";
import MapDashboard from "./MapDashboard";
import { agents } from "./staticData";
import CustomerPanel from "./CustomerPanel";

export default function JourneyDashboard() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  return (
    <div className="flex gap-4">

      <div className="w-1/4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="p-3 border cursor-pointer"
            onClick={() => setSelectedAgent(agent)}
          >
            {agent.name}
          </div>
        ))}
      </div>

      <div className="w-2/4">
        {selectedAgent && (
          <MapDashboard
            agent={selectedAgent.location}
            customers={selectedAgent.customers}
            onCustomerClick={setSelectedCustomer}
          />
        )}
      </div>

      <div className="w-1/4">
        {selectedCustomer && (
          <CustomerPanel customer={selectedCustomer} />
        )}
      </div>

    </div>
  );
}