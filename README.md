# CourseMapper

CourseMapper is a full-stack academic planning app for students. It supports registration and login, curriculum visualization, prerequisite-aware progress tracking, analytics, profile settings, and curriculum import from text/PDF/DOCX sources.

## Stack

- Frontend: React 19, Vite, React Router
- Backend: Node.js, Express, CORS, Compression
- Persistence: local JSON files or PostgreSQL/Neon
- Tests: Vitest, Testing Library, Supertest
- Deploy: Vercel frontend, Render backend, Neon database, optional GitHub Pages frontend

## Project Structure

```text
.
|-- api/
|   `-- [...path].js              # Vercel API proxy to Render, optional
|-- backend/
|   |-- app.cjs                   # Express app factory and middleware wiring
|   |-- server.cjs                # Backend entrypoint
|   |-- config.cjs                # Environment parsing
|   |-- security.cjs              # Security headers, CORS, password/email helpers
|   |-- seed.cjs                  # Demo user seeding
|   |-- data/                     # Built-in curricula and local JSON persistence
|   |-- repositories/             # File/Postgres storage adapters
|   |-- routes/                   # API route modules
|   |-- services/                 # Domain logic
|   |-- sql/                      # PostgreSQL schema
|   `-- tests/                    # Backend tests
|-- public/                       # Static assets
|-- src/
|   |-- app/                      # App shell, app helpers, app-level tests/styles
|   |-- assets/                   # Frontend assets
|   |-- components/               # Reusable UI components
|   |-- features/                 # Feature-specific UI
|   |-- layout/                   # Dashboard shell/sidebar
|   |-- pages/                    # Route/page components
|   |-- services/                 # Frontend API/storage services
|   |-- utils/                    # Shared frontend utilities
|   |-- main.jsx                  # React bootstrap
|   `-- index.css                 # Global base styles
|-- test/                         # Legacy/shared unit tests
|-- render.yaml
|-- vercel.json
|-- vite.config.js
|-- vitest.config.js
`-- README.md
```

## Main API Routes

- `GET /api/health`
- `GET /api/curriculums`
- `POST /api/curriculums/import`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/profile`
- `GET /api/map`
- `POST /api/progress/toggle`

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL/Neon only when using `STORAGE_DRIVER=postgres`

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` from `.env.example`:

```bash
APP_ENV=development
PORT=3001
VITE_API_BASE_URL=/api
STORAGE_DRIVER=file
USERS_FILE=backend/data/users.json
IMPORTED_CURRICULUMS_FILE=backend/data/imported-curriculums.json
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coursemapper
ALLOWED_ORIGINS=http://localhost:5173
MISTRAL_API_KEY=
MISTRAL_MODEL=mistral-small-latest
MISTRAL_OCR_MODEL=mistral-ocr-latest
```

Use `STORAGE_DRIVER=file` for fast local development. Use `STORAGE_DRIVER=postgres` with `DATABASE_URL` for Neon/PostgreSQL.

## Running Locally

Run frontend and backend together:

```bash
npm run dev:all
```

Run only the frontend:

```bash
npm run dev
```

Run only the backend:

```bash
npm run backend
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3001/api/health`

## Demo User

Seed the demo user:

```bash
npm run seed
```

Credentials:

- Registration: `2026000001`
- Password: `Demo@2026`

## Scripts

- `npm run dev`: start Vite
- `npm run backend`: start the Express backend with watch mode
- `npm run dev:all`: run frontend and backend together
- `npm run seed`: create/update the demo user
- `npm run build`: build the frontend
- `npm run preview`: preview the frontend build
- `npm test`: run all tests
- `npm run test:watch`: run tests in watch mode
- `npm run lint`: run ESLint

## Testing

Run the full test suite:

```bash
npm test
```

Run frontend tests only:

```bash
npx vitest run src
```

Run backend tests only:

```bash
npx vitest run backend/tests
```

The current suite covers backend routes, repositories, security helpers, frontend services, app helpers, pages, layout, auth UI, and the main app flow.

## Deploy

### Render Backend

`render.yaml` deploys the backend service.

Required production variables:

```bash
APP_ENV=production
PORT=10000
STORAGE_DRIVER=postgres
DATABASE_URL=...
ALLOWED_ORIGINS=https://dacgp1-joao.vercel.app,https://joaovitorsteffendonascimento.github.io
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-small-latest
MISTRAL_OCR_MODEL=mistral-ocr-latest
```

Health check:

```text
/api/health
```

### Vercel Frontend

Production frontend:

```text
https://dacgp1-joao.vercel.app
```

Recommended variable:

```bash
VITE_API_BASE_URL=https://dacgp1-joao.onrender.com/api
```

The `api/[...path].js` proxy exists for the `/api` proxy strategy, but the current production setup can call the Render API directly through `VITE_API_BASE_URL`.

### Neon Database

Use the Neon connection string as `DATABASE_URL`, usually with SSL enabled:

```bash
postgresql://user:password@host/dbname?sslmode=require
```

The backend initializes `backend/sql/schema.postgres.sql` automatically when the Postgres repositories start.

### GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the frontend with:

```bash
VITE_BASE_PATH=/CourseMapper/
VITE_API_BASE_URL=https://dacgp1-joao.onrender.com/api
```

In GitHub, set Pages source to **GitHub Actions** if you want to use this deploy target.

## Troubleshooting

- `Failed to fetch`: check whether the current frontend origin is included in Render `ALLOWED_ORIGINS`.
- API returns HTML instead of JSON: verify `VITE_API_BASE_URL` and avoid calling a frontend SPA route as if it were the backend.
- Render is slow on first request: the free plan can cold start.
- PostgreSQL errors: confirm `STORAGE_DRIVER=postgres` and a valid `DATABASE_URL`.
- Local file reset: clear `backend/data/users.json` and `backend/data/imported-curriculums.json`.

## Security Notes

- Passwords are hashed with `scrypt`.
- Production blocks local file persistence by requiring `STORAGE_DRIVER=postgres`.
- Production requires explicit CORS origins through `ALLOWED_ORIGINS`.
- Sensitive profile/auth responses use restrictive cache headers.
- Security headers include `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, and HSTS in production.
- Curriculum import validates MIME/size limits before parsing.
