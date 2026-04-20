import { NextResponse } from "next/server.js";
import { reverseGeocode } from "../../utils/geocoding.js";
import { DBConnection } from "../db/db.js";
import AgentModel from "../db/models/agents.models.js";
import cloudinary from "../../lib/cloudinary.js";

export async function POST(req) {
    await DBConnection();
    try {
        const { name, image, location } = await req.json();

        let imageUrl = "";
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image, {
                folder: "bargad_agents",
            });
            imageUrl = uploadResponse.secure_url;
        }

        // Parse coordinates for Reverse Geocoding
        let lat = 0, lng = 0;
        if (location && typeof location === "string") {
            const parts = location.split(",").map(p => parseFloat(p.trim()));
            if (parts.length === 2) { [lat, lng] = parts; }
        }

        const autoAddress = await reverseGeocode(lat, lng);

        const agent = await AgentModel.create({
            name,
            image: imageUrl,
            location,
            address: autoAddress
        });
        return NextResponse.json({ status: 200, msg: "Agent created successfully!", data: agent });
    } catch (error) {
        console.error("POST /api/agent error:", error);
        return NextResponse.json({ status: 500, msg: "Failed to create agent.", error: error.message }, { status: 500 });
    }
}

export async function GET() {
    await DBConnection();
    try {
        const agents = await AgentModel.find();
        return NextResponse.json({ status: 200, msg: "Agents fetched successfully!", data: agents });
    } catch (error) {
        console.error("GET /api/agent error:", error);
        return NextResponse.json({ status: 500, msg: "Failed to fetch agents.", error: error.message }, { status: 500 });
    }
}
