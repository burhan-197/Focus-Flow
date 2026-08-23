// =============================================
// SECTION: Task Model (Mongoose Schema)
// Defines the shape of a Task document in the
// "tasks" collection in MongoDB
// =============================================

const mongoose = require("mongoose");

/**
 * TaskScheme – Each task belongs to one user and tracks focused work time.
 *
 *   userId        : ObjectId – references the User who owns this task
 *   taskName      : String   – the name / title of the task
 *   completed     : Boolean  – whether the task is marked done (default: false)
 *   timeGoal      : Number   – total target time in SECONDS (null = no goal set)
 *   dailyGoal     : Number   – daily target time in SECONDS (null = no daily goal)
 *                              If set, the user must hit this many seconds per day
 *   timeSpent     : Number   – cumulative seconds the user has worked on this task
 *   sessions      : Array    – each entry logs one timer session { date, seconds }
 *                              used to calculate weekly / monthly stats AND
 *                              to determine whether the daily goal was hit on a given day
 *   createdAt     : Date     – when the task was first created
 */
const TaskScheme = new mongoose.Schema({
    // References the _id of the User who created this task
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // The task's display name
    taskName: { type: String, required: true, trim: true },

    // Marked true when the user checks off the task (or when timeSpent reaches timeGoal)
    completed: { type: Boolean, default: false },

    // Optional TOTAL time goal in seconds (null means no goal)
    timeGoal: { type: Number, default: null },

    // Optional DAILY time goal in seconds (null means no daily goal)
    // e.g. 7200 = user wants to spend at least 2 hours on this task every day
    dailyGoal: { type: Number, default: null },

    // Running total of seconds the user has spent on this task (across all days)
    timeSpent: { type: Number, default: 0 },

    // Array of individual timer sessions – each time the user pauses, a session is pushed.
    // This lets us calculate "time spent this week", "time spent this month",
    // AND "time spent today".
    sessions: [
        {
            date: { type: Date, default: Date.now },   // When the session was recorded
            seconds: { type: Number, default: 0 }      // Duration of this session in seconds
        }
    ],

    // ── Streak tracking ──────────────────────────────────────────────────────
    // streak        : how many consecutive days the daily goal was met
    // lastStreakDate : the calendar date (midnight) when the streak was last
    //                 incremented – used to detect missed days and prevent
    //                 double-counting the same day
    streak: { type: Number, default: 0 },
    lastStreakDate: { type: Date, default: null },

    // Timestamp of task creation
    createdAt: { type: Date, default: Date.now }
})

// Creates (or reuses) a Mongoose model called "Task"
// Mongoose will use the collection "tasks" (lowercase + plural)
const TaskModel = mongoose.model("Task", TaskScheme)

module.exports = TaskModel