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
 * Calls FastAPI /reply endpoint (mentor mode).
 */
export async function runFastapiReply({ prompt, language, code, user_id, user_level, token }) {
  const { data } = await axios.post(
    `${process.env.ML_SERVICE_URL}/reply`,
    { prompt, language, code, user_id, user_level },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
  );
  return data.reply;
}

/**
 * Calls FastAPI /generate endpoint (code generation).
 */
export async function runFastapiGenerate({ prompt, language, token }) {
  const { data } = await axios.post(
    `${process.env.ML_SERVICE_URL}/generate`,
    { prompt, language },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
  );
  return data.code;
}

/**
 * Calls FastAPI /autocomplete endpoint (code suggestions).
 */
export async function runFastapiAutocomplete({ code, language, token }) {
  const { data } = await axios.post(
    `${process.env.ML_SERVICE_URL}/autocomplete`,
    { code, language },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
  );
  return data.suggestion;
}

export async function runFastapiReplyCodeOnly({ prompt, language, code, user_id, token }) {
  const { data } = await axios.post(
    `${process.env.ML_SERVICE_URL}/reply-code-only`,
    { prompt, language, code, user_id },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
  );
  return data.code;
}
