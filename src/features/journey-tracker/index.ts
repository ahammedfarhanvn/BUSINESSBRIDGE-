/**
 * Feature Module: Business Journey Tracker (Module B)
 *
 * Responsibilities:
 * - Startup project creation, tracking, and progress metrics
 * - Chronological milestones and task management
 * - AI roadmap generation with Gemini
 * - Board mentor feedback on milestones and tasks
 */

export * from "@/types/journey-tracker";
export {
  verifyProjectAccess,
  createStartupProject,
  getStartupProjects,
  getStartupProjectById,
  updateStartupProject,
  deleteStartupProject,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getMilestones,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getMilestoneTasks,
  getProjectProgress,
} from "./services/project.service";
export * from "./services/feedback.service";
