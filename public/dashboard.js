// =============================================
// SECTION: DOM Element Selection
// =============================================
const createTaskBtn = document.getElementById('createTaskBtn')
const taskContainer = document.getElementById('tasksContainer')

// =============================================
// SECTION: Timer State Storage
// In-memory object – key = task _id
// Each entry: { seconds, minutes, hours, interval, sessionStart }
// =============================================
let timers = {}

// =============================================================================
// SECTION: API Functions
// =============================================================================

/**
 * fetchTasks – GET /api/tasks
 * Returns an array of task objects or [] on failure.
 *
 * DATA FLOW:
 *   Frontend sends → GET /api/tasks (cookies sent automatically)
 *   Backend returns → JSON array of tasks for logged-in user
 */
async function fetchTasks() {
    try {
        const res = await fetch("/api/tasks")
        if (!res.ok) return []
        return await res.json()
    } catch (err) {
        console.error("fetchTasks:", err)
        return []
    }
}

/**
 * createTask – POST /api/tasks
 * Sends taskName (and optional timeGoal / dailyGoal) to the backend.
 * Returns the created task object (with its real MongoDB _id).
 *
 * DATA FLOW:
 *   Frontend sends → POST /api/tasks  body: { taskName, timeGoal, dailyGoal }
 *   Backend returns → { _id, taskName, completed, timeSpent, timeGoal,
 *                        dailyGoal, sessions, createdAt }
 */
async function createTask(taskName, timeGoal = null, dailyGoal = null) {
    try {
        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskName, timeGoal, dailyGoal })
        })
        if (!res.ok) return null
        return await res.json()
    } catch (err) {
        console.error("createTask:", err)
        return null
    }
}

/**
 * updateTask – PUT /api/tasks/:taskId
 * Sends updated fields. Returns the updated task object (including
 * the current streak if the daily goal was hit).
 *
 * DATA FLOW:
 *   Frontend sends → PUT /api/tasks/<taskId>  body: { ...fields, session? }
 *   Backend returns → updated task with dailyGoal / sessions if applicable
 */
async function updateTask(taskId, data) {
    try {
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        if (!res.ok) return null
        return await res.json()
    } catch (err) {
        console.error("updateTask:", err)
        return null
    }
}

/**
 * deleteTask – DELETE /api/tasks/:taskId
 * Removes a task from the database permanently.
 *
 * DATA FLOW:
 *   Frontend sends → DELETE /api/tasks/<taskId>
 *   Backend returns → { message, task } on success
 */
async function deleteTask(taskId) {
    try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
        if (!res.ok) return null
        return await res.json()
    } catch (err) {
        console.error("deleteTask:", err)
        return null
    }
}

// =============================================================================
// SECTION: Helper / Utility Functions
// =============================================================================

/**
 * formatSeconds – Converts seconds to a human-readable string.
 * Examples: 7200 → "2h 00m",  670 → "11m 10s",  45 → "45s"
 */
function formatSeconds(total) {
    total = Math.floor(total || 0)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
    if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`
    return `${s}s`
}

/**
 * stateToSeconds – Converts { hours, minutes, seconds } → total seconds.
 */
function stateToSeconds(state) {
    return state.hours * 3600 + state.minutes * 60 + state.seconds
}

/**
 * getTodaySeconds – Sums up the seconds from all sessions that fall on today's
 * calendar date. Used to display daily progress and to update the streak badge
 * after a session is saved.
 *
 * @param {Array} sessions  – the task's sessions array from the DB
 * @returns {number}        – total seconds logged today
 */
function getTodaySeconds(sessions) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    return (sessions || [])
        .filter(s => {
            const d = new Date(s.date)
            return d >= todayStart && d < tomorrowStart
        })
        .reduce((sum, s) => sum + (s.seconds || 0), 0)
}

// =============================================================================
// SECTION: Build Task HTML
// Generates the inner HTML for one task card.
// Used for both newly created tasks AND tasks loaded from the DB.
//
// NEW vs ORIGINAL:
//   - Added a "daily-row" between goal-row and timer-row containing:
//       • A "Daily (hrs)" number input  → lets the user set a per-day goal
//       • A daily progress text          → "45m / 1h today"
//
// =============================================================================

/**
 * buildTaskHTML – Produces the HTML for one task card.
 *
 * @param {Object}  task   – task data (from DB or a temp placeholder)
 * @param {boolean} isNew  – if true, the name input is editable (not readonly)
 */
function buildTaskHTML(task, isNew = false) {
    const timeGoalHrs = task.timeGoal ? (task.timeGoal / 3600).toFixed(1) : ""
    const dailyGoalHrs = task.dailyGoal ? (task.dailyGoal / 3600).toFixed(1) : ""
    const spentFormatted = formatSeconds(task.timeSpent || 0)
    const readonlyAttr = isNew ? "" : "readonly"

    // ── Total goal progress (e.g. "45m / 2.0h") ──────────────────────────
    const progressHTML = task.timeGoal
        ? `<span class="goal-progress-text">${spentFormatted} / ${(task.timeGoal / 3600).toFixed(1)}h</span>`
        : `<span class="goal-progress-text"></span>`

    // ── Daily progress (e.g. "30m / 1.0h today") ─────────────────────────
    // Calculated from sessions so it's accurate on page load too
    const todaySeconds = getTodaySeconds(task.sessions)
    const dailyProgressHTML = task.dailyGoal
        ? `<span class="daily-progress-text">${formatSeconds(todaySeconds)} / ${dailyGoalHrs}h today</span>`
        : `<span class="daily-progress-text"></span>`

    // ── Streak badge (only visible when a daily goal is set) ──────────────
    const streak = task.streak || 0
    const streakHTML = task.dailyGoal
        ? `<span class="streak-badge ${streak > 0 ? 'active' : ''}" title="${streak} day streak">
               <i class="fa-solid fa-fire-flame-curved"></i>
               <span class="streak-count">${streak}</span>
           </span>`
        : `<span class="streak-badge hidden"></span>`



    return `
        <div class="task-top">
            <div class="check-box" onclick="toggleComplete(this)">
                <img src="./img/tick.svg" class="check-icon">
            </div>
            <input class="goal-input"
                   placeholder="Type your goal and press Enter..."
                   value="${task.taskName || ''}"
                   ${readonlyAttr}>
            <div class="task-actions">
                <i class="fa-solid fa-pencil"    onclick="editTaskUI(this)"   title="Edit"></i>
                <i class="fa-solid fa-trash-can" onclick="deleteTaskUI(this)" title="Delete"></i>
            </div>
        </div>

        <div class="goal-row">
            <label class="goal-label">
                <i class="fa-regular fa-clock"></i> Goal (hrs):
            </label>
            <input class="goal-hours-input"
                   type="number" min="0" step="0.5"
                   value="${timeGoalHrs}"
                   placeholder="optional"
                   onchange="saveGoal(this)">
            ${progressHTML}
        </div>

        <div class="daily-row">
            <label class="goal-label">
                <i class="fa-solid fa-fire-flame-curved"></i> Daily (hrs):
            </label>
            <input class="daily-hours-input"
                   type="number" min="0" step="0.5"
                   value="${dailyGoalHrs}"
                   placeholder="optional"
                   onchange="saveDailyGoal(this)">
            ${dailyProgressHTML}
            ${streakHTML}
        </div>


        <div class="timer-row">
            <i class="fa-solid fa-play"              onclick="watchstart(this)" title="Start"></i>
            <i class="fa-solid fa-pause"             onclick="watchstop(this)"  title="Pause"></i>
            <i class="fa-solid fa-arrow-rotate-left" onclick="watchreset(this)" title="Reset"></i>
            <span class="timer-display">00:00:00</span>
            <span class="total-label">Total: <strong>${spentFormatted}</strong></span>
        </div>
    `
}

// =============================================================================
// SECTION: Timer State Management
// =============================================================================

function getState(id) {
    if (!timers[id]) {
        timers[id] = { seconds: 0, minutes: 0, hours: 0, interval: null, sessionStart: 0 }
    }
    return timers[id]
}

function initStateFromSeconds(id, totalSeconds) {
    totalSeconds = Math.floor(totalSeconds || 0)
    const state = getState(id)
    state.hours = Math.floor(totalSeconds / 3600)
    state.minutes = Math.floor((totalSeconds % 3600) / 60)
    state.seconds = totalSeconds % 60
    return state
}

function updateDisplay(taskEl, state) {
    const display = taskEl.querySelector(".timer-display")
    if (!display) return
    display.textContent =
        String(state.hours).padStart(2, "0") + ":" +
        String(state.minutes).padStart(2, "0") + ":" +
        String(state.seconds).padStart(2, "0")
}

// =============================================================================
// SECTION: Timer Tick
// =============================================================================

function tick(taskEl) {
    const id = taskEl.dataset.id
    const state = getState(id)

    state.seconds++
    if (state.seconds === 60) {
        state.seconds = 0
        state.minutes++
        if (state.minutes === 60) {
            state.minutes = 0
            state.hours++
        }
    }

    updateDisplay(taskEl, state)

    // Auto-complete when total goal is reached
    const timeGoal = Number(taskEl.dataset.timeGoal)
    if (timeGoal > 0) {
        const spent = stateToSeconds(state)
        if (spent >= timeGoal) {
            watchstop_save(taskEl)
            markCompleted(taskEl, id)
        }
    }
}

// =============================================================================
// SECTION: Timer Controls
// =============================================================================

function watchstart(el) {
    const taskEl = el.closest(".goal-section")
    const id = taskEl.dataset.id

    if (!id || id.startsWith("temp")) {
        alert("Please type your goal and press Enter to save it first.")
        return
    }

    const state = getState(id)
    if (state.interval) return   // Already running

    state.sessionStart = stateToSeconds(state)
    state.interval = setInterval(() => tick(taskEl), 1000)
}

function watchstop(el) {
    watchstop_save(el.closest(".goal-section"))
}

/**
 * watchstop_save – Pauses the timer AND saves the session to the backend.
 * Now async so it can read the PUT response and update the streak badge
 * immediately without needing a page refresh.
 *
 * DATA FLOW:
 *   1. Stops the setInterval
 *   2. Calculates elapsed seconds for this session
 *   3. Sends PUT /api/tasks/<id> with { timeSpent, session: { date, seconds } }
 *   4. Backend updates the task with the new session
 *   5. Response contains the fresh task
 *   6. Frontend updates the daily progress text from the response
 */
async function watchstop_save(taskEl) {
    const id = taskEl.dataset.id
    if (!id || id.startsWith("temp")) return

    const state = getState(id)
    if (!state.interval) return

    clearInterval(state.interval)
    state.interval = null

    const totalSeconds = stateToSeconds(state)
    const sessionSeconds = totalSeconds - (state.sessionStart || 0)

    // Save to backend
    const updatedTask = await updateTask(id, {
        timeSpent: totalSeconds,
        session: { date: new Date(), seconds: sessionSeconds }
    })

    // ── Update "Total" label ──────────────────────────────────────────────
    const totalLabel = taskEl.querySelector(".total-label")
    if (totalLabel) {
        totalLabel.innerHTML = `Total: <strong>${formatSeconds(totalSeconds)}</strong>`
    }

    // ── Update total-goal progress text ───────────────────────────────────
    const timeGoal = Number(taskEl.dataset.timeGoal)
    if (timeGoal > 0) {
        const progressEl = taskEl.querySelector(".goal-progress-text")
        if (progressEl) {
            progressEl.textContent = `${formatSeconds(totalSeconds)} / ${(timeGoal / 3600).toFixed(1)}h`
        }
    }

    // ── Update daily progress text from server response ──
    if (updatedTask && updatedTask.dailyGoal) {
        const todaySecs = getTodaySeconds(updatedTask.sessions)
        const dailyGoalHrs = (updatedTask.dailyGoal / 3600).toFixed(1)

        const dailyProgressEl = taskEl.querySelector(".daily-progress-text")
        if (dailyProgressEl) {
            dailyProgressEl.textContent = `${formatSeconds(todaySecs)} / ${dailyGoalHrs}h today`
        }

        // ── Update streak badge ───────────────────────────────────────────
        const streakBadge = taskEl.querySelector(".streak-badge")
        if (streakBadge && updatedTask) {
            const streak = updatedTask.streak || 0
            streakBadge.className = `streak-badge ${streak > 0 ? 'active' : ''}`
            streakBadge.title = `${streak} day streak`
            streakBadge.innerHTML = `
                <i class="fa-solid fa-fire-flame-curved"></i>
                <span class="streak-count">${streak}</span>
            `
        }
        // ─────────────────────────────────────────────────────────────────
    }

    renderSummary()
}

/**
 * watchreset – Resets the timer to 00:00:00 and saves timeSpent = 0.
 */
function watchreset(el) {
    const taskEl = el.closest(".goal-section")
    const id = taskEl.dataset.id
    const state = getState(id)

    clearInterval(state.interval)
    state.seconds = 0
    state.minutes = 0
    state.hours = 0
    state.interval = null
    state.sessionStart = 0

    updateDisplay(taskEl, state)

    if (!id.startsWith("temp")) {
        updateTask(id, { timeSpent: 0 })
    }

    const totalLabel = taskEl.querySelector(".total-label")
    if (totalLabel) totalLabel.innerHTML = `Total: <strong>0s</strong>`
}

// =============================================================================
// SECTION: Goal Management
// =============================================================================

/**
 * saveGoal – Saves the TOTAL hour-based goal (Goal hrs input).
 */
function saveGoal(el) {
    const taskEl = el.closest(".goal-section")
    const id = taskEl.dataset.id
    if (!id || id.startsWith("temp")) return

    const hrs = parseFloat(el.value) || null
    const goalSeconds = hrs ? Math.round(hrs * 3600) : null

    taskEl.dataset.timeGoal = goalSeconds || 0
    updateTask(id, { timeGoal: goalSeconds })

    const state = getState(id)
    const spent = stateToSeconds(state)
    const progressEl = taskEl.querySelector(".goal-progress-text")
    if (progressEl) {
        progressEl.textContent = goalSeconds ? `${formatSeconds(spent)} / ${hrs}h` : ""
    }
}

/**
 * saveDailyGoal – Saves the DAILY hour-based goal (Daily hrs input).
 * Resets the daily progress text to reflect the new goal immediately.
 *
 * DATA FLOW:
 *   1. User types a number in the "Daily (hrs)" input
 *   2. Converts hours → seconds (e.g. 1.5h → 5400s)
 *   3. Sends PUT /api/tasks/<id> with { dailyGoal: seconds }
 *   4. Updates the daily progress text in the UI (today starts at 0 against new goal)
 */
function saveDailyGoal(el) {
    const taskEl = el.closest(".goal-section")
    const id = taskEl.dataset.id
    if (!id || id.startsWith("temp")) return

    const hrs = parseFloat(el.value) || null
    const goalSeconds = hrs ? Math.round(hrs * 3600) : null

    taskEl.dataset.dailyGoal = goalSeconds || 0
    updateTask(id, { dailyGoal: goalSeconds })

    // Update the daily progress text immediately
    const dailyProgressEl = taskEl.querySelector(".daily-progress-text")
    const streakBadge = taskEl.querySelector(".streak-badge")
    if (dailyProgressEl) {
        if (goalSeconds) {
            // Re-fetch today's seconds from in-memory sessions is tricky here;
            // show "0s / Xh today" as a safe placeholder — it'll update on next pause
            dailyProgressEl.textContent = `0s / ${hrs}h today`
            // Show the streak badge (streak starts at 0 for a new goal)
            if (streakBadge) {
                streakBadge.className = "streak-badge"
                streakBadge.title = "0 day streak"
                streakBadge.innerHTML = `<i class="fa-solid fa-fire-flame-curved"></i><span class="streak-count">0</span>`
            }
        } else {
            dailyProgressEl.textContent = ""
            // Hide the streak badge when daily goal is removed
            if (streakBadge) {
                streakBadge.className = "streak-badge hidden"
                streakBadge.innerHTML = ""
            }
        }
    }
}

// =============================================================================
// SECTION: Task Completion
// =============================================================================

function markCompleted(taskEl, id) {
    taskEl.classList.add("completed")
    updateTask(id, { completed: true })
}

function toggleComplete(el) {
    const taskEl = el.closest(".goal-section")
    const id = taskEl.dataset.id
    if (!id || id.startsWith("temp")) return

    const isCompleted = taskEl.classList.toggle("completed")
    updateTask(id, { completed: isCompleted })
}

// =============================================================================
// SECTION: Edit & Delete Task UI
// =============================================================================

function editTaskUI(el) {
    const taskEl = el.closest(".goal-section")
    const input = taskEl.querySelector(".goal-input")
    input.removeAttribute("readonly")
    input.focus()
}

async function deleteTaskUI(el) {
    const taskEl = el.closest(".goal-section")
    const id = taskEl.dataset.id

    if (id && !id.startsWith("temp")) {
        await deleteTask(id)
    }

    if (timers[id]) {
        clearInterval(timers[id].interval)
        delete timers[id]
    }

    taskEl.remove()
    renderSummary()
}

// =============================================================================
// SECTION: Save Task Name on Enter Key
// =============================================================================

document.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return

    const active = document.activeElement
    if (!active.classList.contains("goal-input")) return

    e.preventDefault()

    const taskEl = active.closest(".goal-section")
    const id = taskEl.dataset.id
    const name = active.value.trim()

    if (!name) {
        active.placeholder = "Name can't be empty — please type something!"
        return
    }

    if (id.startsWith("temp")) {
        const newTask = await createTask(name)
        if (!newTask || !newTask._id) {
            console.error("Failed to create task in DB")
            return
        }
        taskEl.dataset.id = newTask._id
        taskEl.dataset.timeGoal = newTask.timeGoal || 0
        taskEl.dataset.dailyGoal = newTask.dailyGoal || 0

    } else {
        await updateTask(id, { taskName: name })
    }

    active.setAttribute("readonly", true)
    active.blur()
})

// =============================================================================
// SECTION: Create Task Button
// =============================================================================

createTaskBtn.addEventListener("click", () => {
    const tempId = "temp-" + Date.now()

    const newDiv = document.createElement("div")
    newDiv.classList.add("goal-section")
    newDiv.dataset.id = tempId
    newDiv.dataset.timeGoal = "0"
    newDiv.dataset.dailyGoal = "0"


    newDiv.innerHTML = buildTaskHTML(
        {
            _id: tempId, taskName: "", timeSpent: 0, timeGoal: null,
            dailyGoal: null, sessions: [], completed: false
        },
        true
    )

    taskContainer.prepend(newDiv)
    newDiv.querySelector(".goal-input").focus()
})

// =============================================================================
// SECTION: Summary Stats (Weekly / Monthly / All-Time)
// =============================================================================

async function renderSummary() {
    const tasks = await fetchTasks()

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let weekSecs = 0
    let monthSecs = 0
    let totalSecs = 0

    tasks.forEach(task => {
        totalSecs += task.timeSpent || 0
            ; (task.sessions || []).forEach(s => {
                const d = new Date(s.date)
                if (d >= startOfWeek) weekSecs += s.seconds || 0
                if (d >= startOfMonth) monthSecs += s.seconds || 0
            })
    })

    document.getElementById("summary-week").textContent = formatSeconds(weekSecs) || "0s"
    document.getElementById("summary-month").textContent = formatSeconds(monthSecs) || "0s"
    document.getElementById("summary-total").textContent = formatSeconds(totalSecs) || "0s"
}

// =============================================================================
// SECTION: Page Load – Auth Check & Task Rendering
// =============================================================================

window.addEventListener("load", async () => {
    const res = await fetch("/api/auth/me")
    const data = await res.json()

    if (!data.loggedIn) {
        window.location.href = "/index.html"
        return
    }

    document.getElementById("message").innerText = "Welcome, " + data.username

    const tasks = await fetchTasks()

    tasks.forEach(task => {
        const newDiv = document.createElement("div")
        newDiv.classList.add("goal-section")
        newDiv.dataset.id = task._id
        newDiv.dataset.timeGoal = task.timeGoal || 0
        newDiv.dataset.dailyGoal = task.dailyGoal || 0


        if (task.completed) newDiv.classList.add("completed")

        newDiv.innerHTML = buildTaskHTML(task, false)

        const state = initStateFromSeconds(task._id, task.timeSpent || 0)
        updateDisplay(newDiv, state)

        taskContainer.appendChild(newDiv)
    })

    renderSummary()
})

// =============================================================================
// SECTION: Logout
// =============================================================================

document.querySelector("#logout").addEventListener("click", async () => {
    const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    if (res.ok) window.location.href = "/index.html"
})