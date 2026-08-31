# Focus-Flow

Focus-Flow is a productivity-focused web app that helps users manage their daily tasks, track time spent, and stay consistent with personal goals. It combines secure authentication, session-based login, and a clean dashboard for task tracking.

## Features

- User registration and login
- Secure password hashing with bcrypt
- Session-based authentication using Express Session
- Task creation, editing, deletion, and completion tracking
- Time goal and daily goal tracking
- Streak-based progress tracking for consistent productivity
- Responsive dashboard UI for daily workflow management
- MongoDB-backed persistence for users and tasks

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- HTML, CSS, JavaScript
- Express Session
- Connect Mongo
- bcryptjs

## Project Structure

```bash
.
├── config/
│   └── connectDB.js
├── models/
│   ├── tasks.js
│   └── user.js
├── public/
│   ├── dashboard.html
│   ├── dashboard.js
│   ├── index.html
│   ├── index.js
│   ├── style.css
│   └── style2.css
├── routes/
│   ├── auth.js
│   └── task.js
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- MongoDB running locally or a MongoDB Atlas connection string

### Installation

1. Clone the repository:

```bash
git clone <your-repository-url>
cd auth-app
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add the following variables:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/focus-flow
SESSION_SECRET=your_session_secret_here
```

4. Start the application:

```bash
npm start
```

5. Open your browser and go to:

```bash
http://localhost:3000
```

## Usage

- Sign up for a new account
- Log in with your credentials
- Create and manage tasks from the dashboard
- Track progress against your daily goals
- Mark tasks complete as you work
- Review your productivity streaks over time

## API Overview

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Log in an existing user
- `POST /api/auth/logout` - Log out the current user
- `GET /api/auth/me` - Get current session user info

### Tasks

- `GET /api/tasks` - Fetch tasks for the logged-in user
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:taskId` - Update a task
- `DELETE /api/tasks/:taskId` - Delete a task

## Screenshots
Login Page:
<img width="1331" height="684" alt="image" src="https://github.com/user-attachments/assets/6bbfa9dc-a008-4b36-8977-009b74163436" />
Registration Page:
<img width="1332" height="683" alt="image" src="https://github.com/user-attachments/assets/51bb74e3-5edd-4164-b20f-bccc1ad2cbf5" />
Home Page:
<img width="1328" height="680" alt="image" src="https://github.com/user-attachments/assets/1304b3d1-307c-4cbc-8310-376cbf2e4d01" />
Task Creation:
<img width="587" height="564" alt="image" src="https://github.com/user-attachments/assets/816b6bb6-0c91-4677-9d65-7b227fd96273" />

