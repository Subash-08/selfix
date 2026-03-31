import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client safely wrapping environment bounds
// Note: Requires GEMINI_API_KEY inside your .env.local file
const apiKey = process.env.GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(apiKey);

export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
