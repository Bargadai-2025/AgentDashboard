import { NextResponse } from "next/server.js";
import { reverseGeocode } from "../../utils/geocoding.js";
import { DBConnection } from "../db/db.js";
import AgentModel from "../db/models/agents.models.js";
import CustomerModel from "../db/models/customer.models.js";

export async function POST(req) {
    await DBConnection();
    try {
        const { name, location, agentId, loan, cashCollected } = await req.json();

        if (!name || !location) {
            return NextResponse.json(
                { status: 400, msg: "Name and location are required." },
                { status: 400 }
            );
        }

        // Parse "lat, lng" string → { lat, lng }
        let parsedLocation = location;
        if (typeof location === "string") {
            const parts = location.split(",").map((s) => parseFloat(s.trim()));
            if (parts.length !== 2 || parts.some(isNaN)) {
                return NextResponse.json(
                    { status: 400, msg: "Location must be 'lat, lng' e.g. 19.076, 72.877" },
                    { status: 400 }
                );
            }
            parsedLocation = { lat: parts[0], lng: parts[1] };
        }

        // Fetch Address automatically via Reverse Geocoding
        const autoAddress = await reverseGeocode(parsedLocation.lat, parsedLocation.lng);

        // Step 1: Create the customer document
        const customer = await CustomerModel.create({
            name,
            loan: loan || "",
            location: parsedLocation,
            address: autoAddress, // Storing the formatted address from Mappls
            cashCollected: cashCollected || "",
            ...(agentId && { agentId }),
        });

        // Step 2: Push customer._id into the agent's customers[] array
        // $addToSet prevents duplicates if somehow called twice
        if (agentId) {
            await AgentModel.findByIdAndUpdate(
                agentId,
                { $addToSet: { customers: customer._id } }
            );
        }

        return NextResponse.json({
            status: 200,
            msg: "Customer created and linked to agent successfully!",
            data: customer,
        });
    } catch (error) {
        console.error("POST /api/customer error:", error);
        return NextResponse.json(
            { status: 500, msg: "Failed to create customer.", error: error.message },
            { status: 500 }
        );
    }
}


// GET /api/customer — fetch all customers
export async function GET() {
    await DBConnection();
    try {
        const customers = await CustomerModel.find();
        return NextResponse.json({ status: 200, msg: "Customers fetched successfully!", data: customers });
    } catch (error) {
        console.error("GET /api/customer error:", error);
        return NextResponse.json(
            { status: 500, msg: "Failed to fetch customers.", error: error.message },
            { status: 500 }
        );
    }
}

