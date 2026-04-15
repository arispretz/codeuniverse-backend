/**
 * @fileoverview Controller for project, list, and task operations.
 * Provides endpoints to create, retrieve, update, and delete projects, local lists, kanban lists, and tasks.
 * Includes support for sprints, progress tracking, and enriched project data.
 * @module controllers/projectController
 */

import { Project } from '../models/Project.js';
import { LocalList } from '../models/LocalList.js';
import { KanbanList } from '../models/KanbanList.js';
import { Task } from '../models/Task.js';
import { backendStatus, normalizeStatus } from '../utils/utils.js';

/* ------------------------- PROJECT CONTROLLERS ------------------------- */

/**
 * Creates a simple project.
 *
 * @async
 * @function createProject
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const project = await Project.create({
      name,
      description,
      ownerId: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Error creating project', details: error.message });
  }
};

/**
 * Retrieves projects for the authenticated user.
 *
 * @async
 * @function getProjects
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const getProjects = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query || {};
    const userId = req.user._id;
    const userRole = req.user.role; 

    let query = {};

    if (userRole === "admin") {
      query = {};
    } else {
      query = { $or: [{ ownerId: userId }, { members: userId }] };
    }

    if (search) query.name = { $regex: search, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const projects = await Project.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("ownerId", "username email")
      .populate("members", "username email")
      .populate("tasks")
      .populate({
        path: "localLists",
        populate: { path: "tasks" },
      })
      .populate({
        path: "kanbanLists",
        populate: { path: "tasks" },
      })
      .lean();

    const totalProjects = await Project.countDocuments(query);

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      totalProjects,
      totalPages: Math.ceil(totalProjects / limit),
      projects,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error retrieving projects",
      details: error.message,
    });
  }
};

/**
 * Retrieves a project by ID with its tasks.
 *
 * @async
 * @function getProjectById
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = await Task.find({ projectId: project._id }).lean() || [];
    res.json({ ...project, tasks });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving project', details: error.message });
  }
};

/**
 * Retrieves all projects with their tasks.
 *
 * @async
 * @function getProjectsWithTasks
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const getProjectsWithTasks = async (req, res) => {
  try {
    const projects = await Project.find().lean();
    const enriched = await Promise.all(
      projects.map(async (p) => {
        const tasks = await Task.find({ projectId: p._id }).lean() || [];
        return { ...p, tasks };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving projects with tasks', details: error.message });
  }
};

/**
 * Creates a full project with sprint and initial tasks.
 *
 * @async
 * @function createFullProject
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const createFullProject = async (req, res) => {
  try {
    const { name, description, sprintName, sprintDueDate, tasks = [] } = req.body;
    if (!name || !description || !sprintName || !sprintDueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const project = await Project.create({
      name,
      description,
      ownerId: req.user._id,
      members: [req.user._id],
      sprint: { name: sprintName, dueDate: new Date(sprintDueDate) },
    });

    const createdTasks = [];
    const failedTasks = [];

    for (const [index, task] of tasks.entries()) {
      try {
        const taskDoc = await Task.create({
          projectId: project._id,
          listId: task.listId,
          title: task.title,
          description: task.description,
          status: backendStatus(task?.status || "to do"),
          deadline: task.deadline ? new Date(task.deadline) : null,
          source: 'local',
          assignees: (task.assignees || []).map((a) =>
            typeof a === 'string' ? { _id: a } : { _id: a._id }
          ),
          assignedTo: task.assignees?.[0],
          createdBy: req.user._id,
          history: [
            {
              changedBy: req.user._id,
              change: 'Task created in full project',
              changedAt: new Date(),
            },
          ],
        });
        createdTasks.push(taskDoc);
      } catch (err) {
        failedTasks.push({ index, reason: err.message });
      }
    }

    await Project.findByIdAndUpdate(project._id, {
      $push: {
        audit: {
          action: 'created',
          by: req.user._id,
          at: new Date(),
          details: `Attempted to create ${tasks.length} tasks. Success: ${createdTasks.length}, Failures: ${failedTasks.length}`,
        },
      },
    });

    res.status(201).json({ project, createdTasks, failedTasks });
  } catch (error) {
    res.status(500).json({ error: 'Error creating full project', details: error.message });
  }
};

/**
 * Retrieves full projects including local lists, kanban lists, and progress.
 *
 * @async
 * @function getProjectsFull
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const getProjectsFull = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query || {};
    const userId = req.user?._id;
    const userRole = req.user?.role; 
    console.log("Auth user:", req.user);
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (userRole === "admin") {
      query = {};
    } else if (userRole === "manager") {
      query = { ownerId: userId };
    } else if (userRole === "developer") {
      const userTasks = await Task.find({ assignees: userId }).select("projectId").lean();
      console.log("Tareas del usuario developer:", userTasks);

      const projectIds = [...new Set(userTasks.map(t => mongoose.Types.ObjectId(t.projectId)))];
      console.log("Project IDs para query:", projectIds);

      query = { _id: { $in: projectIds } };
    } else {
      query = { members: userId };
    }

    const projects = await Project.find(query)
      .skip(skip)
      .limit(limitNum)
      .populate("ownerId", "username email")
      .populate("members", "username email avatar")
      .lean();

    const enriched = await Promise.all(
      projects.map(async (project) => {
        try {
          // Local lists
          const localLists = await LocalList.find({ projectId: project._id }).lean();
          const localEnriched = await Promise.all(
            (localLists || []).map(async (list) => {
              const tasks = await Task.find({ source: "local", listId: list._id }).lean() || [];
              return { ...list, tasks: tasks.map(t => ({ ...t, status: normalizeStatus(t.status) })) };
            })
          );

          // Kanban lists
          const kanbanLists = await KanbanList.find({ projectId: project._id }).lean();
          const kanbanEnriched = await Promise.all(
            (kanbanLists || []).map(async (list) => {
              const tasks = await Task.find({ source: "kanban", listId: list._id }).lean() || [];

              const normalizedTasks = tasks.map((task) => {
                const s = normalizeStatus(task?.status || "to do");
                return { ...task, status: s };
              });

              return { ...list, tasks: normalizedTasks };
            })
          );

          // Overall progress
          const allTasks = await Task.find({
            projectId: project._id,
            source: { $ne: "personal" },
          }).lean() || [];

          const progress = allTasks.length
            ? (allTasks.filter((t) => normalizeStatus(t?.status || "to do") === "done").length / allTasks.length) * 100
            : 0;

          return { ...project, localLists: localEnriched, kanbanLists: kanbanEnriched, progress };
        } catch (error) {
          return { ...project, error: "Error enriching project", details: error.message };
        }
      })
    );

    const totalProjects = await Project.countDocuments(query);

    res.json({
      page: pageNum,
      limit: limitNum,
      totalProjects,
      totalPages: Math.ceil(totalProjects / limitNum),
      projects: enriched,
    });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving full projects", details: error.message });
  }
};

/**
 * Retrieves a full project by ID with populated lists and history.
 *
 * @async
 * @function getProjectFullById
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const getProjectFullById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate({
        path: "localLists",
        populate: { path: "tasks", model: "Task" },
      })
      .populate({
        path: "kanbanLists",
        populate: { path: "tasks", model: "Task" },
      })
      .populate("members", "username email")
      .populate("ownerId", "username email")
      .lean(); 

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project); 
  } catch (error) {
    console.error("❌ Error retrieving full project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Creates a local list within a project.
 *
 * @async
 * @function createLocalList
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const createLocalList = async (req, res) => {
  try {
    const { name, dueDate, projectId } = req.body;
    if (!name || !projectId) {
      return res.status(400).json({ error: "Name and projectId are required" });
    }
    const list = await LocalList.create({
      name,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId,
      createdBy: req.user._id,
    });
    res.status(201).json({ list });
  } catch (error) {
    res.status(500).json({ error: "Error creating local list", details: error.message });
  }
};

/**
 * Retrieves local lists for a given project.
 *
 * @async
 * @function getLocalLists
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const getLocalLists = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: "Missing projectId in query" });
    }
    const lists = await LocalList.find({ projectId }).lean();
    res.json(lists || []);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving local lists", details: error.message });
  }
};

/**
 * Creates a kanban list within a project.
 *
 * @async
 * @function createKanbanList
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const createKanbanList = async (req, res) => {
  try {
    const { name, projectId } = req.body;
    if (!name || !projectId) {
      return res.status(400).json({ error: "Name and projectId are required" });
    }
    const list = await KanbanList.create({
      name,
      projectId,
      createdBy: req.user._id,
    });
    res.status(201).json({ list });
  } catch (error) {
    res.status(500).json({ error: "Error creating kanban list", details: error.message });
  }
};

/**
 * Retrieves kanban lists for a given project.
 *
 * @async
 * @function getKanbanLists
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const getKanbanLists = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: "Missing projectId in query" });
    }
    const lists = await KanbanList.find({ projectId }).lean();
    res.json(lists || []);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving kanban lists", details: error.message });
  }
};

/**
 * Retrieves kanban columns grouped by task status.
 *
 * @async
 * @function getKanbanColumns
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const getKanbanColumns = async (req, res) => {
  try {
    const filter = { source: "kanban" };
    if (req.query.listId) filter.listId = req.query.listId;
    if (req.query.projectId) filter.projectId = req.query.projectId;

    const tasks = await Task.find(filter).lean() || [];

    const grouped = (tasks || []).reduce((acc, task) => {
      if (!task) return acc;
      const status = normalizeStatus(task?.status || "to do");
      (acc[status] ||= []).push({ ...task, status });
      return acc;
    }, { todo: [], inprogress: [], review: [], done: [] });

    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving kanban columns", details: error.message });
  }
};

/**
 * Creates a task within a list (local or kanban).
 *
 * @async
 * @function createTaskInList
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const createTaskInList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { projectId, title, description, status, deadline, assignees = [] } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: "projectId and title are required" });
    }

    const [kanbanList, localList] = await Promise.all([
      KanbanList.findById(listId).lean(),
      LocalList.findById(listId).lean(),
    ]);

    if (!kanbanList && !localList) {
      return res.status(404).json({ error: "List not found" });
    }

    const source = kanbanList ? "kanban" : "local";
    const normalizedAssignees = assignees.map(a =>
      typeof a === "string" ? { _id: a } : { _id: a._id }
    );

    const task = await Task.create({
      projectId,
      listId,
      title,
      description,
      status: backendStatus(status || "to do"),
      deadline: deadline ? new Date(deadline) : null,
      source,
      assignees: normalizedAssignees,
      createdBy: req.user._id,
      history: [
        {
          changedBy: req.user._id,
          change: "Task created in list",
          changedAt: new Date(),
        },
      ],
    });

    res.status(201).json({ ...task.toObject(), status: normalizeStatus(task.status) });
  } catch (error) {
    res.status(500).json({ error: "Error creating task in list", details: error.message });
  }
};

/**
 * Updates a task within a list.
 *
 * @async
 * @function updateTaskInList
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const updateTaskInList = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, deadline, assignees = [] } = req.body;

    const normalizedAssignees = assignees.map(a =>
      typeof a === "string" ? { _id: a } : { _id: a._id }
    );

    const updated = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          title,
          description,
          status: status ? backendStatus(status) : undefined,
          deadline: deadline ? new Date(deadline) : null,
          assignees: normalizedAssignees,
        },
        $push: {
          history: {
            changedBy: req.user._id,
            change: "Task updated",
            changedAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ ...updated, status: normalizeStatus(updated.status) });
  } catch (error) {
    res.status(500).json({ error: "Error updating task in list", details: error.message });
  }
};

/**
 * Deletes a task within a list.
 *
 * @async
 * @function deleteTaskInList
 * @param {Request} req - Express request object containing UID in params.
 * @param {Response} res - Express response object used to send results.
 * @returns {Promise<void>} Sends JSON response with success message or error message.
 */
export const deleteTaskInList = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (!task.history) task.history = [];
    task.history.push({
      changedBy: req.user._id,
      change: "Task deleted",
      changedAt: new Date(),
    });

    await task.save();
    await Task.findByIdAndDelete(taskId);

    res.json({ message: "Task deleted successfully", deletedTaskId: taskId });
  } catch (error) {
    res.status(500).json({ error: "Error deleting task in list", details: error.message });
  }
};
