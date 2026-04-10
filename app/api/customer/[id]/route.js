import { NextResponse } from "next/server";
import CustomerModel from "../../db/models/customer.models.js";
import AgentModel from "../../db/models/agents.models.js";
import { DBConnection } from "../../db/db.js";

// GET /api/customer/[id] — fetch single customer
export async function GET(req, { params }) {
    await DBConnection();
    try {
        const { id } = await params;
        const customer = await CustomerModel.findById(id);
        if (!customer) {
            return NextResponse.json({ status: 404, msg: "Customer not found." }, { status: 404 });
        }
        return NextResponse.json({ status: 200, msg: "Data fetched successfully.", data: customer });
    } catch (error) {
        console.error("GET /api/customer/[id] error:", error);
        return NextResponse.json({ status: 500, msg: "Failed to fetch customer.", error: error.message }, { status: 500 });
    }
}

// PATCH /api/customer/[id] — update customer fields
// Used by:
//   - /verify page → saves verifiedAgentImage (base64 captured photo)
//   - /admin panel  → reassign agentId
export async function PATCH(req, { params }) {
    await DBConnection();
    try {
        const { id } = await params;
        const body = await req.json();

        // Only allow specific fields to be updated (whitelist pattern)
        const allowedUpdates = {};
        if (body.verifiedAgentImage !== undefined) allowedUpdates.verifiedAgentImage = body.verifiedAgentImage;
        if (body.agentId           !== undefined) allowedUpdates.agentId            = body.agentId;
        if (body.loan              !== undefined) allowedUpdates.loan               = body.loan;
        if (body.cashCollected     !== undefined) allowedUpdates.cashCollected      = body.cashCollected;

        const customer = await CustomerModel.findByIdAndUpdate(
            id,
            { $set: allowedUpdates },
            { new: true }
        );

        if (!customer) {
            return NextResponse.json({ status: 404, msg: "Customer not found." }, { status: 404 });
        }

        return NextResponse.json({ status: 200, msg: "Customer updated successfully.", data: customer });
    } catch (error) {
        console.error("PATCH /api/customer/[id] error:", error);
        return NextResponse.json({ status: 500, msg: "Failed to update customer.", error: error.message }, { status: 500 });
    }
}