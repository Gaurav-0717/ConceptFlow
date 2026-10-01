# ConceptFlow

ConceptFlow is an AI-powered visual learning platform. Students enter a concept to receive a validated interactive visualization, three-level explanation, key terminology, and a five-question quiz.

## Current Status: Phases 1–4

> [!NOTE]
> The MVP includes the full-stack foundation, five visualization engines, validated Gemini generation and learning content, optional MongoDB caching, deterministic fallbacks, and browser-local learning history. Video generation, accounts, and shared cloud history are not included.

---

## Technology Stack

### Frontend (`client/`)

- **Runtime & Tooling:** Vite + React 18 (JavaScript)
- **Routing:** React Router v7 (`react-router-dom`)
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **Icons:** Lucide React (`lucide-react`)
- **Networking:** Axios (`axios`)

### Backend (`server/`)

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Middleware:** CORS, Morgan (HTTP logging)
- **Abuse Protection:** `express-rate-limit` on AI-backed endpoints
- **Config:** Dotenv (`.env`)
- **AI:** Google Gemini via `@google/genai`
- **Cache:** MongoDB Node.js driver (`mongodb`), optional
- **Architecture:** Modular MVC structure, Zod validation, centralized safe errors, and optional MongoDB cache

### Learning Data

- Browser `localStorage` holds up to 50 recent concepts and their latest quiz score.
- MongoDB is optional and stores validated concept-generation cache entries.
- Quiz answer keys stay in short-lived in-memory server sessions and are returned only after submission.

---

## Project Structure

```
ConceptFlow/
├── client/                     # Frontend React + Vite application
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, etc.)
│   │   ├── pages/              # Landing, Dashboard, Create Concept
│   │   ├── services/           # Axios API service client
│   │   ├── App.jsx             # React Router configuration
│   │   ├── main.jsx            # React root DOM mount
│   │   └── index.css           # Tailwind base styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── server/                     # Backend Node.js + Express application
│   ├── src/
│   │   ├── controllers/        # API controllers
│   │   ├── routes/             # Express routers
│   │   ├── middleware/         # 404 and centralized error handling
│   │   ├── services/           # Validation, Gemini, Mongo cache, fallback, orchestration
│   │   ├── app.js              # Express app setup and middleware pipeline
│   │   └── server.js           # Server bootstrap and port listener
│   ├── .env                    # Environment variables (PORT=5000, etc.)
│   ├── .env.example
│   └── package.json
├── package.json                # Root orchestration scripts
├── .gitignore
└── README.md
```

---

## Installation

### Prerequisites

- Node.js (v20.19+ required by the MongoDB Node.js driver)
- npm (v9+ recommended)

### Step 1: Install Root Orchestrator (Optional)

```bash
npm install
```

### Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../client
npm install
```

---

## How to Run

### Running Backend (Express Server)

```bash
cd server
npm run dev
```

The server will start on `http://localhost:5000`.

Create local environment files from the examples:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

| Variable             | Where            | Purpose                                                          |
| :------------------- | :--------------- | :--------------------------------------------------------------- |
| `GEMINI_API_KEY`     | Backend          | Enables live Gemini content; keep secret.                        |
| `GEMINI_MODEL`       | Backend          | Optional model override; defaults to `gemini-2.5-flash`.         |
| `MONGODB_URI`        | Backend          | Optional validated-concept cache connection; keep secret.        |
| `CLIENT_URL`         | Backend          | Comma-separated allowed browser origins; set for deployment.     |
| `PORT`               | Backend          | Optional Express port; defaults to 5000.                         |
| `NODE_ENV`           | Backend          | Set to `production` for deployment CORS policy.                  |
| `AI_RATE_LIMIT`      | Backend          | Optional per-IP AI/learning request limit per 15-minute window.  |
| `TRUST_PROXY`        | Backend          | Set to `true` only behind one trusted reverse proxy.             |
| `VITE_API_URL`       | Client build     | API base URL; defaults to same-origin `/api`.                    |
| `VITE_DEV_API_PROXY` | Client dev shell | Optional local Vite proxy target; defaults to backend port 5000. |

Configure `GEMINI_API_KEY` for live AI. `MONGODB_URI` is optional; without it, cache reads/writes are skipped and Gemini or fallback still works. Keep backend credentials out of the client environment.

To test the health endpoint:

```bash
curl http://localhost:5000/api/health
```

Response:

```json
{
  "success": true,
  "service": "ConceptFlow API",
  "status": "HEALTHY"
}
```

### Running Frontend (React + Vite)

```bash
cd client
npm run dev
```

The Vite development server starts on `http://localhost:5173` and proxies `/api` to the backend on port 5000. Set `VITE_DEV_API_PROXY` in the shell if the local backend uses another address.

### Running Both Concurrently (From Root)

```bash
npm run dev
```

Or separately from root:

- Backend: `npm run server`
- Frontend: `npm run client`

---

## API Endpoints

| Method | Endpoint                            | Description                                                                                    | Status Code                          |
| :----- | :---------------------------------- | :--------------------------------------------------------------------------------------------- | :----------------------------------- |
| `GET`  | `/api/health`                       | Service health status check                                                                    | `200 OK`                             |
| `POST` | `/api/concepts/generate`            | Generate a validated concept using cache, Gemini, or deterministic fallback                    | `200 OK`, `400` for invalid input    |
| `POST` | `/api/concepts/validate`            | Validate a ConceptFlow concept                                                                 | `200 OK`, `400` for invalid concepts |
| `POST` | `/api/concepts/preview`             | Validate and return a concept preview                                                          | `200 OK`, `400` for invalid concepts |
| `POST` | `/api/learning/explanations`        | Return validated beginner, intermediate, and advanced explanations, takeaways, and terminology | `200 OK`, `400` for invalid concepts |
| `POST` | `/api/learning/quiz`                | Create a five-question quiz without exposing answer keys                                       | `200 OK`, `400` for invalid concepts |
| `POST` | `/api/learning/quiz/:quizId/submit` | Validate answers and return score plus answer explanations                                     | `200 OK`, `400` for invalid answers  |
| `*`    | Any other route                     | 404 Route Not Found handler                                                                    | `404 Not Found`                      |

## Generation Reliability

Generation normalizes the request, checks the optional MongoDB cache, then calls Gemini. Gemini retains its two-attempt retry limit; a validated Gemini result is cached for 30 days when MongoDB is available. Cache keys are SHA-256 hashes over normalized input, subject, difficulty, model, schema version, and prompt version. Bump the explicit schema or prompt version in `server/src/services/conceptCacheService.js` when those contracts change.

Every cache hit and fallback is revalidated with the existing ConceptFlow schema and semantic rules. If Gemini remains unavailable or returns invalid data after its retries, deterministic templates cover photosynthesis, the water cycle, TCP handshake, the OSI model, and the French Revolution; other topics receive a generic study-flow template. MongoDB failures do not block Gemini or fallback generation.

Generation responses use `source: "gemini"`, `source: "cache"`, or `source: "fallback"`. Learning endpoints use `gemini` or `fallback`; fallback content is labeled as ConceptFlow's offline learning engine. Fallbacks are useful study scaffolds, not equivalent to AI-generated explanations.

Explanations and quizzes use the existing Gemini service with strict Zod response contracts and bounded retries. Invalid or unavailable responses fall back to concept-derived content. Correct quiz answers are held in memory for two hours and disclosed only after submission; a backend restart expires active quizzes.

## Testing

```powershell
npm test --prefix server
npm run test:visualizations --prefix client
npm run test:learning --prefix client
npm run build --prefix client
```

The backend suite uses mocked Gemini output and offline Express integration checks. No live Gemini or MongoDB service is required. Existing fixed-port Phase 3 HTTP checks run when the backend is listening on port 5000.

## Deployment

Build the client with `npm run build --prefix client` and deploy `client/dist` to a static host. Set `VITE_API_URL` at build time to the public API base URL ending in `/api`, or leave it as `/api` and configure the static host/reverse proxy to forward `/api` to Express. Never ship Gemini or MongoDB credentials in any `VITE_` variable.

Run the backend with `npm start --prefix server` on Node.js 20.19 or newer. Set `NODE_ENV=production`, `PORT`, and `CLIENT_URL` to the deployed frontend origin(s), comma-separated if needed. Configure `GEMINI_API_KEY` for AI, optionally `GEMINI_MODEL` and `MONGODB_URI`, and tune `AI_RATE_LIMIT` for expected traffic. Set `TRUST_PROXY=true` only when Express is behind a trusted single reverse proxy. Terminate HTTPS at the hosting platform or reverse proxy.

The health check is `GET /api/health`. CORS defaults to local development origins and should be configured explicitly for production. MongoDB is an optional cache, not required for startup. Learning history is local to one browser profile and is not synced across devices or users. Quiz sessions are in-memory and do not survive backend restarts.

## Known Limitations

- Live Gemini generation requires a backend API key and has not been verified without configured credentials.
- Browser-local history can be cleared with browser data and is not a cross-device account history.
- Fallback explanations and quizzes are deterministic study scaffolds.
- Quiz sessions expire after two hours.
- Video generation, authentication, accounts, PDF import, and persistent quiz history are outside this MVP.
