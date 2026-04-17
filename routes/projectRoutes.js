/**
 * @fileoverview Express routes for project and task management.
 * Defines endpoints for handling projects, local lists, tasks, and Kanban boards.
 * @module routes/projectRoutes
 */

import express from 'express';
import { auth } from '../middleware/authMiddleware.js';
import {
  createProject,
  getProjects,
  getProjectById,
  getProjectsWithTasks,
  createFullProject,
  getProjectsFull,
  getProjectFullById,
  addMemberToProject,
  createLocalList,
  getLocalLists,
  createKanbanList,
  getKanbanLists,
  getKanbanColumns,
  createTaskInList,
  updateTaskInList,
  deleteTaskInList
} from '../controllers/projectController.js';

export const projectRouter = express.Router();

/**
 * POST /projects
 * Creates a new project.
 */
projectRouter.post('/projects', auth, createProject);

/**
 * POST /projects/full
 * Creates a new project with full details (including lists and tasks).
 */
projectRouter.post('/projects/full', auth, createFullProject);

/**
 * GET /projects/full
 * Retrieves all projects with full details.
 */
projectRouter.get('/projects/full', auth, getProjectsFull);

/**
 * GET /projects/with-tasks
 * Retrieves all projects including their associated tasks.
 */
projectRouter.get('/projects/with-tasks', auth, getProjectsWithTasks);

/**
 * GET /projects/:id/full
 * Retrieves a project with full details by its ID.
 */
projectRouter.get('/projects/:id/full', auth, getProjectFullById);

/**
 * GET /projects/:id
 * Retrieves a project by its ID.
 */
projectRouter.get('/projects/:id', auth, getProjectById);

/**
 * GET /projects
 * Retrieves all projects for the authenticated user.
 */
projectRouter.get('/projects', auth, getProjects);

/**
 * POST /projects/:projectId/members
 * Adds a member to a project.
 */
// projectRouter.post('/projects/:projectId/members', auth, addMemberToProject);
// Route with explicit logging
	projectRouter.post("/projects/:projectId/members", (req, res, next) => {
	  console.log("=== Incoming POST /projects/:projectId/members ===");
	  console.log("Authorization header:", req.headers.authorization);
	
	  auth(req, res, (err) => {
	    if (err) {
	      console.error("Auth middleware error:", err);
	      return next(err);
	    }
	    console.log("Auth middleware completed. req.user is:", req.user);
	
	    addMemberToProject(req, res, next);
	  });
	});

/**
 * 📋 Local Lists
 */
projectRouter.post('/lists', auth, createLocalList);
projectRouter.get('/lists', auth, getLocalLists);
projectRouter.post('/lists/:listId/tasks', auth, createTaskInList);
projectRouter.put('/lists/:listId/tasks/:taskId', auth, updateTaskInList);
projectRouter.delete('/lists/:listId/tasks/:taskId', auth, deleteTaskInList);

/**
 * 🧱 Kanban
 */
projectRouter.post('/kanban/lists', auth, createKanbanList);
projectRouter.get('/kanban/lists', auth, getKanbanLists);
projectRouter.get('/kanban/columns', auth, getKanbanColumns);
