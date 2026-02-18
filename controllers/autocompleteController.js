/**
 * @fileoverview Controller for code autocomplete operations.
 * Calls FastAPI autocomplete endpoint, stores usage metrics, and updates user profile.
 * @module controllers/autocompleteController
 */

import { runFastapiAutocomplete } from "../services/fastapiModelRunner.js";
import { UserProfile } from "../models/UserProfile.js";

export const generateAutocomplete = async (req, res) => {
  const { code, language, user_id } = req.body;

  // ✅ Basic validation
  if (!code || !language) {
    return res
      .status(400)
      .json({ output: "error: Missing required fields: code, language" });
  }

  try {
    // ✅ Call FastAPI autocomplete service
    const response = await runFastapiAutocomplete({
      code,
      language,
      token: req.headers.authorization?.replace("Bearer ", ""),
    });

    // ✅ Update user profile with usage metrics
    if (user_id) {
      await UserProfile.findOneAndUpdate(
        { user_id },
        {
          $set: { preferred_language: language, last_used: new Date() },
          $addToSet: { style_notes: "used autocomplete" },
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
    console.error("❌ Autocomplete error:", status, data);

    // ✅ Return JSON error to frontend (never raw HTML)
    res.status(status).json({
      output: "error: Autocomplete service failed",
      detail: data,
    });
  }
};
