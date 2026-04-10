import { NextResponse } from "next/server";
import { DBConnection } from "../../db/db.js";
import AgentModel from "../../db/models/agents.models.js";
import CustomerModel from "../../db/models/customer.models.js";

// PATCH /api/agent/[id] — update agent fields and/or append customers
//
// SAFE UPDATE PATTERN:
//   - Only provided fields are updated ($set with whitelist)
//   - customerIds are ADDED to the existing array ($addToSet prevents duplicates)
//   - Missing fields (e.g. when admin only sends customerIds) don't wipe agent data
export async function PATCH(req, { params }) {
    await DBConnection();
    try {
        const { id } = await params;
        const { name, image, location, customerIds } = await req.json();

        // Build update object — only add fields that were actually sent
        const setFields = {};
        if (name     !== undefined) setFields.name     = name;
        if (image    !== undefined) setFields.image    = image;
        if (location !== undefined) setFields.location = location;

        // Build the MongoDB update operation
        const updateOp = {};
        if (Object.keys(setFields).length)  updateOp.$set      = setFields;
        if (customerIds?.length)             updateOp.$addToSet = { customers: { $each: customerIds } };

        if (!Object.keys(updateOp).length) {
            return NextResponse.json({ status: 400, msg: "No fields to update." }, { status: 400 });
        }

        const agent = await AgentModel.findByIdAndUpdate(id, updateOp, { new: true })
            .populate("customers");

        if (!agent) {
            return NextResponse.json({ status: 404, msg: "Agent not found." }, { status: 404 });
        }

        return NextResponse.json({ status: 200, msg: "Agent updated successfully!", data: agent });
    } catch (error) {
        console.error("PATCH /api/agent/[id] error:", error);
        return NextResponse.json({ status: 500, msg: "Failed to update agent.", error: error.message }, { status: 500 });
    }
}


// GET /api/agent/[id] — fetch single agent with populated customers
export async function GET(req, { params }) {
    await DBConnection();
    try {
        const { id } = params;
        const agent = await AgentModel.findById(id).populate("customers");
        if (!agent) {
            return NextResponse.json({ status: 404, msg: "Agent not found." }, { status: 404 });
        }
        return NextResponse.json({ status: 200, msg: "Agent fetched!", data: agent });
    } catch (error) {
        console.error("GET /api/agent/[id] error:", error);
        return NextResponse.json({ status: 500, msg: "Failed to fetch agent.", error: error.message }, { status: 500 });
    }
}