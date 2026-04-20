import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

export async function DBConnection() {
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_DB_URL;

    if (!uri) {
        console.error("❌ MongoDB URI is undefined. Please check your environment variables in your Production (Vercel) settings.");
        throw new Error("Mongoose Error: The uri parameter must be a string. Check that MONGODB_URI is set in your environment.");
    }

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
        };

        cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
            console.log("✅ DB Connected successfully");
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error("❌ DB Connection Error:", e);
        throw e;
    }

    return cached.conn;
}