/**
 * @fileoverview Controller for code-only reply operations.
 * Calls FastAPI reply-code-only endpoint and returns generated code.
 * @module controllers/replyCodeOnlyController
 */

import { runFastapiReplyCodeOnly } from "../services/fastapiModelRunner.js";

export const generateCodeReplyOnly = async (req, res) => {
  const { prompt, language, code, user_id } = req.body;

  try {
    // ✅ Extract token from Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");

    // ✅ Call FastAPI reply-code-only service
    const response = await runFastapiReplyCodeOnly({
      prompt,
      language,
      code,
      user_id,
      token,
    });

    // ✅ Return FastAPI response to frontend
    res.json(response.data);
  } catch (error) {
    // ✅ Capture HTTP status from FastAPI or default to 500
    const status = error.response?.status || 500;

    // ✅ Capture response body from FastAPI (could be JSON or HTML)
    const data = error.response?.data || { error: error.message };

    // ✅ Log detailed error for debugging
    console.error("❌ Reply-code-only error:", status, data);

    // ✅ Return JSON error to frontend (never raw HTML)
    res.status(status).json({
      output: "error: Reply-code-only service failed",
      detail: data,
    });
  }
};
