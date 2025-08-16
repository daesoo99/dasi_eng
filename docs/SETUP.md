# Development Environment Setup

This document provides instructions on how to set up the development environment for the DASI English project.

## 1. Prerequisites

Ensure you have the following software installed on your system:

*   **Node.js:** (v18.x or later recommended) - [Download Node.js](https://nodejs.org/)
*   **npm:** (Comes with Node.js)
*   **Git:** - [Download Git](https://git-scm.com/)

## 2. Project Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd DaSi_eng
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd ../web_app
    npm install
    ```

## 3. Environment Variables

Both the backend and frontend require environment variables to function correctly.

### Backend (`/backend/.env`)

Create a `.env` file in the `backend` directory by copying the example file:

```bash
cp .env.example .env
```

Then, fill in the required API keys and configurations:

```
# Server Configuration
PORT=8081

# Google Gemini API Key
# You can obtain a key from Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Redis Configuration (Optional, but recommended)
# If you are not using Redis, the app will use an in-memory store.
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
# REDIS_PASSWORD="your_redis_password" # Uncomment if your Redis server requires a password

# Fallback OpenAI API Key (Optional)
# Used only if the Gemini API fails.
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
```

### Frontend (`/web_app/.env`)

Create a `.env` file in the `web_app` directory. This is used to specify the backend API server address.

```
REACT_APP_API_URL=http://localhost:8081/api
```

## 4. Running the Application

You need to run both the backend and frontend servers simultaneously in separate terminals.

*   **To start the Backend Server:**
    ```bash
    cd backend
    npm start
    ```
    The backend server will be running at `http://localhost:8081`.

*   **To start the Frontend Development Server:**
    ```bash
    cd web_app
    npm start
    ```
    The frontend application will open automatically in your browser at `http://localhost:3000`.
