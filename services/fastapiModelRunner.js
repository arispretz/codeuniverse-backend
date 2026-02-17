/**
 * @fileoverview Service for interacting with the external FastAPI model.
 * Provides functions to send prompts, code, and metadata to the model and receive responses.
 * @module services/fastapiModelRunner
 */

import axios from "axios";

if (!process.env.ML_SERVICE_URL) {
  throw new Error("❌ ML_SERVICE_URL environment variable is not defined. Please set it in your .env file.");
}

/**
 * Helper to log and handle errors
 */
async function callFastAPI(endpoint, payload, token) {
  const url = `${process.env.ML_SERVICE_URL}${endpoint}`;
  console.log("➡️ Calling FastAPI:", url);
  console.log("➡️ Payload:", payload);
  console.log("➡️ Token:", token ? token.substring(0, 20) + "..." : "❌ No token");

  try {
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });
    console.log("✅ FastAPI response:", data);
    return data;
  } catch (error) {
    console.error("❌ FastAPI error:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Calls FastAPI /reply endpoint (mentor mode).
 */
export async function runFastapiReply({ prompt, language, code, user_id, user_level, token }) {
  const data = await callFastAPI("/reply", { prompt, language, code, user_id, user_level }, token);
  return data.reply;
}

/**
 * Calls FastAPI /generate endpoint (code generation).
 */
export async function runFastapiGenerate({ prompt, language, token }) {
  const data = await callFastAPI("/generate", { prompt, language }, token);
  return data.code;
}

/**
 * Calls FastAPI /autocomplete endpoint (code suggestions).
 */
export async function runFastapiAutocomplete({ code, language, token }) {
  const data = await callFastAPI("/autocomplete", { code, language }, token);
  return data.suggestion;
}

/**
 * Calls FastAPI /reply-code-only endpoint (code-only mode).
 */
export async function runFastapiReplyCodeOnly({ prompt, language, code, user_id, token }) {
  const data = await callFastAPI("/reply-code-only", { prompt, language, code, user_id }, token);
  return data.code;
}
