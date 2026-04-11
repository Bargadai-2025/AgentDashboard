import { dbConnect } from "../../db/db";
import Customer from "../../db/models/customer.models";
import { NextResponse } from "next/server";

/**
 * POST /api/customer/reset-verification
 * Resets the verification status of a customer by clearing the verifiedAgentImage.
 * Body: { customerId: string }
 */
export async function POST(req) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    await dbConnect();

    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { $set: { verifiedAgentImage: null } },
      { new: true }
    );

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Verification reset successfully",
      customer 
    });
  } catch (error) {
    console.error("[RESET_VERIFICATION] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
