// =============================================
// SECTION: DOM Element Selection
// Grab references to HTML elements we need
// =============================================
const login = document.querySelector(".login");         // The login form section
const register = document.querySelector(".register");   // The register form section
const switchBtn = document.querySelector(".switch");    // The "Don't have an account? / Already have..." toggle text
const loginForm = document.getElementById("loginForm")  // The <form> inside the login section
const regForm = document.getElementById("regForm")      // The <form> inside the register section

// =============================================
// SECTION: Password Visibility Toggle
// Clicking the eye icon switches the password
// input between type="password" and type="text"
// =============================================
const eyeIcons = document.querySelectorAll(".eye-icons")

/**
 * For each eye icon, add a click listener that:
 *   1. Finds the <input> inside the same .password-container
 *   2. Toggles the input type between "password" (hidden) and "text" (visible)
 *   3. Swaps the icon image accordingly
 */
eyeIcons.forEach((icon) => {
    icon.addEventListener("click", () => {
        const input = icon.parentElement.querySelector("input");

        if (input.type === "password") {
            input.type = "text";                       // Show password
            icon.src = "./eye-icons/eye-open.png";     // Open eye icon
        } else {
            input.type = "password";                   // Hide password
            icon.src = "./eye-icons/eye-close.png";    // Closed eye icon
        }
    });
});

// =============================================
// SECTION: Login ↔ Register Form Switch
// Toggles visibility between the login and
// register sections when the user clicks the link
// =============================================

/**
 * switchBtn click handler:
 *   - If register is hidden → show register, hide login, update text to "Already Have an Account?"
 *   - If register is visible → show login, hide register, update text to "Don't have an account?"
 */
switchBtn.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn")) {
        if (register.style.display === "none" || register.style.display === "") {
            register.style.display = "block";
            login.style.display = "none";
            switchBtn.innerHTML = "Already Have an Account? <span class='btn'>Login Now</span>";
        } else {
            register.style.display = "none";
            login.style.display = "block";
            switchBtn.innerHTML = "Don't have an account? <span class='btn'>Register Now</span>";
        }
    }
})

// =============================================
// SECTION: Login Form Submission
// Sends email & password to the backend login API
// =============================================

/**
 * Login form submit handler:
 *
 * DATA FLOW (Frontend → Backend → Frontend):
 *   1. User fills in email and password, clicks "Login"
 *   2. e.preventDefault() stops the page from reloading
 *   3. Sends POST /api/auth/login with JSON body { email, password }
 *   4. Backend checks credentials (see routes/auth.js)
 *   5. If 200 OK → redirect to dashboard.html
 *   6. If error → show the error message in the #message div
 */
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    // Send login request to backend
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),     // Frontend sends email & password as JSON
    })
    const data = await res.json()   // Parse the JSON response from backend

    if (res.ok) {
        // Login successful → go to dashboard
        window.location.href = "/dashboard.html"
    } else {
        // Login failed → show error message from backend (e.g. "Email not found")
        document.getElementById("message").innerText = data.message
    }
})

// =============================================
// SECTION: Register Form Submission
// Sends username, email & password to the
// backend register API
// =============================================

/**
 * Register form submit handler:
 *
 * DATA FLOW (Frontend → Backend → Frontend):
 *   1. User fills in username, email, password, clicks "Register"
 *   2. e.preventDefault() stops the page from reloading
 *   3. Sends POST /api/auth/register with JSON body { username, email, password }
 *   4. Backend creates user, hashes password, starts session (see routes/auth.js)
 *   5. If 201 Created → redirect to dashboard.html
 *   6. If error → show the error message in the #message2 div
 */
regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.querySelector("#username").value;
    const email = document.querySelector("#regEmail").value;
    const password = document.querySelector("#regPassword").value;

    // Send register request to backend
    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),  // Frontend sends all 3 fields as JSON
    })
    const data = await res.json()   // Parse the JSON response from backend

    if (res.ok) {
        // Registration successful → go to dashboard (user is auto-logged in)
        window.location.href = "/dashboard.html"
    } else {
        // Registration failed → show error message from backend
        document.getElementById("message2").innerText = data.message
    }
})

// =============================================
// SECTION: Auto-Redirect on Page Load
// If the user is already logged in (has a valid
// session), skip the login page and go straight
// to the dashboard
// =============================================

/**
 * Page load handler:
 *   1. Sends GET /api/auth/me (browser sends session cookie automatically)
 *   2. Backend checks the session and returns { loggedIn: true/false }
 *   3. If already logged in → redirect to dashboard.html immediately
 */
window.addEventListener("load", async () => {
    const res = await fetch("/api/auth/me")
    const data = await res.json()
    if (data.loggedIn) {
        window.location.href = "/dashboard.html"
    }
})