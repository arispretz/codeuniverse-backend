/**
 * @fileoverview Controller for code generation operations.
 * Sends prompts to FastAPI service, stores usage metrics, and updates user profiles.
 * @module controllers/generateController
 */

import { runFastapiGenerate } from "../services/fastapiModelRunner.js";
import { UserProfile } from "../models/UserProfile.js";

export const generateCode = async (req, res) => {
  const { prompt, language, user_id } = req.body;

  // ✅ Basic validation
  if (!prompt || !language) {
    return res
      .status(400)
      .json({ output: "error: Missing required fields: prompt, language" });
  }

  try {
    // ✅ Call FastAPI generate service
    const response = await runFastapiGenerate({
      prompt,
      language,
      token: req.headers.authorization?.replace("Bearer ", ""),
    });

    // ✅ Update user profile with usage metrics
    if (user_id) {
      await UserProfile.findOneAndUpdate(
        { user_id },
        {
          $set: { preferred_language: language, last_used: new Date() },
          $addToSet: { style_notes: "generated code" },
        },
        { upsert: true }
      );
    }

    // ✅ Return FastAPI response to frontend
    res.json(response.data);
  } catch (error) {
    // ✅ Capture HTTP status from FastAPI or default to 500
    const status = error.response?.status || 500;

    // ✅ Capture response body from FastAPI (could be JSON or HTML)
    const data = error.response?.data || { error: error.message };

    // ✅ Log detailed error for debugging
    console.error("❌ Generate error:", status, data);

    // ✅ Return JSON error to frontend (never raw HTML)
    res.status(status).json({
      output: "error: Code generation service failed",
      detail: data,
    });
  }
};
