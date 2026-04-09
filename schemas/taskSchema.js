/**
 * @fileoverview Mongoose schema definition for Tasks.
 * Represents a task entity within a project, including metadata such as status, priority, assignees, comments, and history.
 * @module schemas/taskSchema
 */

import mongoose from "mongoose";

/**
 * History sub-schema.
 * Tracks changes made to a task.
 */
const HistorySchema = new mongoose.Schema(
  {
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    change: { type: String },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * Comment sub-schema.
 */
const CommentSchema = new mongoose.Schema(
  {
    text: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * Task schema.
 */
export const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    status: {
      type: String,
      enum: ["to do", "in progress", "review", "done"],
      default: "to do",
      set: v => {
        if (!v) return "to do";
        const normalized = v.toLowerCase().replace("_", " ").trim();
        if (normalized === "todo") return "to do";
        if (normalized === "inprogress") return "in progress";
        return normalized;
      }
    },

    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
      set: v => {
        if (!v) return "Medium";
        const lower = v.toLowerCase();
        if (lower === "high") return "High";
        if (lower === "medium") return "Medium";
        if (lower === "low") return "Low";
        return v;
      }
    },

    deadline: { type: Date },
    tags: { type: [String], default: [] },

    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    listId: { type: mongoose.Schema.Types.ObjectId, refPath: "listType" },
    listType: { type: String, enum: ["KanbanList", "LocalList"] },

    source: {
      type: String,
      enum: ["clickup", "kanban", "local", "personal"],
      required: true,
    },

    assignees: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    comments: { type: [CommentSchema], default: [] },
    history: { type: [HistorySchema], default: [] },

    syncedAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdByFirebase: { type: String },
  },
  { timestamps: true }
);

/**
 * JSON transformation.
 * Converts ObjectIds to strings when returning JSON responses.
 */
taskSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret._id = ret._id?.toString();
    ret.listId = ret.listId?.toString();
    ret.projectId = ret.projectId?.toString();
    ret.createdBy = ret.createdBy?.toString();
    ret.assignees = (ret.assignees || []).map((a) => a?.toString());

    ret.comments = (ret.comments || []).map((c) => ({
      ...c,
      author: c.author?.toString(),
    }));

    ret.history = (ret.history || []).map((h) => ({
      ...h,
      changedBy: h.changedBy?.toString(),
    }));

    return ret;
  },
});
