/**
 * @fileoverview Controller for assistant reply operations.
 * Handles requests to generate replies using the FastAPI model service.
 * @module controllers/assistantController
 */

import { runFastapiReply } from "../services/fastapiModelRunner.js";

export const generateAssistantReply = async (req, res) => {
  const { prompt, language, code, user_id, user_level } = req.body;

  // ✅ Basic validation
  if (!prompt || !language) {
    return res
      .status(400)
      .json({ output: "error: Missing required fields: prompt, language" });
  }

  try {
    // ✅ Call FastAPI service
    const response = await runFastapiReply({
      prompt,
      language,
      code,
      user_id,
      user_level,
      token: req.headers.authorization?.replace("Bearer ", ""),
    });

    // ✅ Return FastAPI response to frontend
    res.json(response.data);
  } catch (error) {
    // ✅ Capture HTTP status from FastAPI or default to 500
    const status = error.response?.status || 500;

    // ✅ Capture response body from FastAPI (could be JSON or HTML)
    const data = error.response?.data || { error: error.message };

    // ✅ Log detailed error for debugging
    console.error("❌ FastAPI error:", status, data);

    // ✅ Return JSON error to frontend (never raw HTML)
    res.status(status).json({
      output: "error: Assistant service failed",
      detail: data,
    });
  }
};
