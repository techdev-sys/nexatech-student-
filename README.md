# Nexatech School Operations Platform

Production deployment instructions are available in [docs/RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md). The deployment builds the React frontend and Laravel API into one HTTPS service, with separate queue and scheduler services backed by MySQL and Redis.

Full-stack school operations platform for connected records, workflows, and trusted information retrieval.

## Structure

- `backend/` - Laravel API and application backend.
- `frontend/` - React/Vite frontend.
- `start-all.sh` - helper script for local startup.

## Start locally

On Windows PowerShell or Command Prompt:

```powershell
.\start-all.cmd
```

On macOS, Linux, or Git Bash:

```bash
./start-all.sh
```

The frontend starts at `http://localhost:5173` and the Laravel backend at
`http://localhost:8888`. Press `Ctrl+C` to stop all services.
