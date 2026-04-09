/**
 * @fileoverview Mongoose schema definition for Users.
 * Represents a user entity including authentication details, role, profile information, team association, and metadata.
 * @module schemas/userSchema
 */

import mongoose from 'mongoose';

/**
 * User schema.
 * Defines the structure for users in MongoDB.
 *
 * @property {String} firebaseUid - Unique Firebase UID for authentication (required, unique).
 * @property {String} username - Display name of the user (required).
 * @property {String} email - User's email address (required, unique).
 * @property {String} role - Role assigned to the user (enum: 'admin', 'developer', 'manager', 'guest', 'ai_assistant'; default: 'guest').
 * @property {String} team - Optional team name the user belongs to (e.g., "Development Team A").
 * @property {String} avatarUrl - Optional URL to the user's avatar image.
 * @property {String} invitationCode - Optional invitation code used during registration.
 * @property {String} level - Optional user level (e.g., experience or rank).
 * @property {Date} joinedAt - Timestamp when the user joined (default: current date).
 * @property {Date} createdAt - Timestamp when the user document was created (auto-generated).
 * @property {Date} updatedAt - Timestamp when the user document was last updated (auto-generated).
 */
export const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ['admin', 'developer', 'manager', 'guest', 'ai_assistant'],
      default: 'guest',
    },
    team: { type: String, default: null }, 
    avatarUrl: { type: String },
    invitationCode: { type: String },
    level: { type: String },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
