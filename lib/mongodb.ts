import mongoose from 'mongoose'

declare global {
  var mongoose: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  }
}

let cached = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

// Export a native MongoClient promise for NextAuth MongoDBAdapter
// We wrap it securely so it doesn't crash the server before evaluating if env is missing
export const clientPromise: Promise<any> = process.env.MONGODB_URI
  ? connectDB().then((m) => m.connection.getClient() as any)
  : Promise.reject(new Error("Missing MONGODB_URI in .env.local"));
