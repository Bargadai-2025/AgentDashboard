import { NextResponse } from "next/server";
import { DBConnection } from "../db/db.js";
import cloudinary from "../../lib/cloudinary.js";
import CustomerModel from "../db/models/customer.models.js";

/**
 * POST /api/agent-verification
 * 
 * Receives verification results from the VerifyClient page.
 * Processes:
 *  1. Uploads the captured base64 image to Cloudinary (optional but recommended for DB health).
 *  2. Updates the Customer document with the verifiedAgentImage URL.
 */
export async function POST(req) {
    await DBConnection();
    
    try {
        const body = await req.json();
        const { 
            customerId, 
            capturedImage, 
            isVerified,
            finalScore 
        } = body;

        if (!customerId) {
            return NextResponse.json({ status: 400, msg: "Missing customerId" }, { status: 400 });
        }

        if (!isVerified) {
            return NextResponse.json({ 
                status: 200, 
                msg: "Verification failed session logged (no DB update made).",
                data: { score: finalScore } 
            });
        }

        let imageUrl = capturedImage;

        // If the image is a base64 string, upload it to Cloudinary
        if (capturedImage && capturedImage.startsWith("data:image")) {
            try {
                const uploadRes = await cloudinary.uploader.upload(capturedImage, {
                    folder: "agent_verifications",
                });
                imageUrl = uploadRes.secure_url;
                console.log("✅ Liveness selfie uploaded to Cloudinary:", imageUrl);
            } catch (cloudErr) {
                console.error("❌ Cloudinary upload failed, falling back to base64:", cloudErr);
                // We'll keep the base64 if upload fails, though it's not ideal
            }
        }

        // Update the customer record
        const customer = await CustomerModel.findByIdAndUpdate(
            customerId,
            { 
                $set: { 
                    verifiedAgentImage: imageUrl 
                } 
            },
            { new: true }
        );

        if (!customer) {
            return NextResponse.json({ status: 404, msg: "Customer not found." }, { status: 404 });
        }

        return NextResponse.json({ 
            status: 200, 
            msg: "Verification successful and saved to database!", 
            data: {
                customerId: customer._id,
                imageUrl: imageUrl,
                score: finalScore
            } 
        });

    } catch (error) {
        console.error("POST /api/agent-verification error:", error);
        return NextResponse.json({ 
            status: 500, 
            msg: "Internal server error during verification save.", 
            error: error.message 
        }, { status: 500 });
    }
}
