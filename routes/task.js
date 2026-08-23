// =============================================
// SECTION: Task Routes (Task CRUD API)
// Handles creating, reading, updating, and
// deleting tasks for the logged-in user.
// All routes are prefixed with /api/tasks
// (set in server.js)
// =============================================

const express = require("express")
const router = express.Router()
const taskModel = require("../models/tasks")   // Mongoose Task model


// ─────────────────────────────────────────────
// API: GET /api/tasks
// PURPOSE: Fetches ALL tasks that belong to the logged-in user
//
// FRONTEND SENDS: nothing (GET request; session
//   cookie is sent automatically by the browser)
//
// BACKEND RETURNS:
//   200 → [ array of task objects ]       (each has _id, taskName, completed, timeGoal,
//                                          dailyGoal, timeSpent,
//                                          sessions, etc.)
//   500 → { message }                     (server error)
// ─────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        // ── Streak miss detection ─────────────────────────────────────────────
        // Any task whose lastStreakDate is BEFORE yesterday midnight has missed
        // at least one full day → its streak resets to 0.
        const todayStart = new Date()
        todayStart.setUTCHours(0, 0, 0, 0)
        const yesterdayStart = new Date(todayStart)
        yesterdayStart.setDate(yesterdayStart.getDate() - 1)

        await taskModel.updateMany(
            {
                userId: req.session.userId,
                streak: { $gt: 0 },
                dailyGoal: { $ne: null },
                lastStreakDate: { $lt: yesterdayStart }   // older than yesterday = missed day(s)
            },
            { $set: { streak: 0 } }
        )
        // ─────────────────────────────────────────────────────────────────────

        const tasks = await taskModel.find({ userId: req.session.userId })
        res.status(200).json(tasks)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
})

// ─────────────────────────────────────────────
// API: POST /api/tasks
// PURPOSE: Creates a new task for the logged-in user
//
// FRONTEND SENDS (JSON body):
//   { taskName: "Read", timeGoal: 180000, dailyGoal: 3600 }
//   (timeGoal and dailyGoal are optional, in seconds)
//
// BACKEND RETURNS:
//   201 → { the newly created task object }
//   400 → { message }     (task name is empty)
//   500 → { message }     (server error)
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const { taskName, timeGoal, dailyGoal } = req.body

        if (!taskName || taskName.trim() === "") {
            return res.status(400).json({ message: "Task name cannot be empty" })
        }

        const task = await taskModel.create({
            userId: req.session.userId,
            taskName: taskName.trim(),
            completed: false,
            timeGoal: timeGoal || null,
            dailyGoal: dailyGoal || null,   // NEW: optional daily goal
            timeSpent: 0,
            sessions: [],
            createdAt: Date.now()
        })

        res.status(201).json(task)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
})

// ─────────────────────────────────────────────
// API: PUT /api/tasks/:taskId
// PURPOSE: Updates an existing task (name, completed, timeSpent,
//          timeGoal, dailyGoal, or adds a timer session).

//
// FRONTEND SENDS (JSON body) – any combination of:
//   { taskName: "New Name" }
//   { completed: true }
//   { timeSpent: 1234, session: { date, seconds } }
//   { timeGoal: 7200 }
//   { dailyGoal: 3600 }
//
// BACKEND RETURNS:
//   200 → { the updated task object }
//   404 → { message }    (task not found or doesn't belong to user)
//   500 → { message }    (server error)
//

// ─────────────────────────────────────────────
router.put("/:taskId", async (req, res) => {
    try {
        const taskId = req.params.taskId

        // Separate "session" (which needs $push) from other fields (which need $set)
        const { session, ...updateFields } = req.body

        const updateOp = {}

        if (Object.keys(updateFields).length > 0) {
            updateOp.$set = updateFields
        }

        if (session) {
            updateOp.$push = { sessions: session }
        }

        // Apply the main update (timeSpent, taskName, session push, etc.)
        let updatedTask = await taskModel.findOneAndUpdate(
            { _id: taskId, userId: req.session.userId },
            updateOp,
            { returnDocument: 'after' }
        )

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" })
        }

        // ── Streak increment logic ────────────────────────────────────────────
        // Only runs when a timer session was saved AND the task has a daily goal.
        // We sum today's sessions; if the total meets/exceeds dailyGoal and we
        // haven't already credited today, we increment (or start) the streak.
        if (session && updatedTask.dailyGoal) {
            const todayStart = new Date()
            todayStart.setUTCHours(0, 0, 0, 0)
            const tomorrowStart = new Date(todayStart)
            tomorrowStart.setDate(tomorrowStart.getDate() + 1)

            // Sum seconds logged today across all sessions
            const todaySeconds = updatedTask.sessions
                .filter(s => {
                    const d = new Date(s.date)
                    return d >= todayStart && d < tomorrowStart
                })
                .reduce((sum, s) => sum + (s.seconds || 0), 0)

            if (todaySeconds >= updatedTask.dailyGoal) {
                const lastDate = updatedTask.lastStreakDate
                    ? new Date(updatedTask.lastStreakDate)
                    : null

                // Only credit the streak once per calendar day
                const alreadyCreditedToday =
                    lastDate && lastDate.toDateString() === todayStart.toDateString()

                if (!alreadyCreditedToday) {
                    // Check if the last credited day was yesterday (consecutive)
                    const yesterday = new Date(todayStart)
                    yesterday.setDate(yesterday.getDate() - 1)
                    const isConsecutive =
                        lastDate && lastDate.toDateString() === yesterday.toDateString()

                    const newStreak = isConsecutive ? (updatedTask.streak || 0) + 1 : 1

                    updatedTask = await taskModel.findOneAndUpdate(
                        { _id: taskId, userId: req.session.userId },
                        { $set: { streak: newStreak, lastStreakDate: new Date() } },
                        { returnDocument: 'after' }
                    )
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        res.status(200).json(updatedTask)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
})

// ─────────────────────────────────────────────
// API: DELETE /api/tasks/:taskId
// PURPOSE: Permanently deletes a task from the database
//
// FRONTEND SENDS: nothing (the taskId is in the URL)
//
// BACKEND RETURNS:
//   200 → { message, task }    (deleted successfully)
//   404 → { message }          (task not found or not owned by user)
//   500 → { message }          (server error)
// ─────────────────────────────────────────────
router.delete("/:taskId", async (req, res) => {
    try {
        const taskId = req.params.taskId

        const deletedTask = await taskModel.findOneAndDelete({
            _id: taskId,
            userId: req.session.userId
        })

        if (!deletedTask) {
            return res.status(404).json({ message: "Task not found" })
        }

        res.status(200).json({ message: "Task deleted", task: deletedTask })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
})

module.exports = router