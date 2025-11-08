# Development Workflow Guide

## Development Mode (Hot Reload)

For active development with instant hot-reload when you save files.

### Step-by-Step:

**Terminal 1 - Start Vite Dev Server:**
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Terminal 2 - Run Python App in Dev Mode:**
```bash
cd backend
./run_dev.sh
```

OR manually:
```bash
cd backend
export DEV_MODE=true
python3 main.py
```

### What Happens:

- ✅ Vite watches all `.vue`, `.js`, `.css` files
- ✅ Any file change triggers instant hot-reload
- ✅ Browser updates automatically (no manual refresh!)
- ✅ PyQt6 app loads from `http://localhost:5173`
- ✅ No need to run `npm run build`

### Tips:

- Keep Terminal 1 running the entire time you're developing
- Terminal 1 shows compilation errors if any
- Save any file → see changes instantly
- Press `Ctrl+C` in Terminal 1 to stop dev server
- Press `Ctrl+C` in Terminal 2 to stop Python app

---

## Production Mode (Built Files)

For testing the built/production version.

### Step-by-Step:

**1. Build the frontend:**
```bash
cd frontend
npm run build
```

**2. Run Python app normally:**
```bash
cd backend
python3 main.py
```

### What Happens:

- ✅ Vite builds optimized production files to `frontend/dist/`
- ✅ PyQt6 app serves files from `frontend/dist/`
- ✅ Files are minified and optimized
- ❌ No hot-reload - must rebuild after every change

---

## Quick Reference

| Mode | Terminal 1 | Terminal 2 | Hot Reload | Build Required |
|------|-----------|-----------|-----------|----------------|
| **Development** | `cd frontend && npm run dev` | `cd backend && ./run_dev.sh` | ✅ Yes | ❌ No |
| **Production** | - | `cd backend && python3 main.py` | ❌ No | ✅ Yes |

---

## Common Issues

### Issue: "Failed to fetch" or blank screen

**Solution:** Make sure Vite dev server is running in Terminal 1
```bash
cd frontend
npm run dev
```

### Issue: Changes not showing up

**In Dev Mode:**
- Check Terminal 1 for compilation errors
- Hard refresh browser: `Cmd+Shift+R`
- Restart Vite dev server

**In Production Mode:**
- You must run `npm run build` after every change
- Switch to Dev Mode for faster iteration

### Issue: Port 5173 already in use

**Solution:** Kill existing Vite process
```bash
lsof -ti:5173 | xargs kill -9
```

Then restart: `npm run dev`

### Issue: Port 8765 already in use (Production)

**Solution:** Kill existing HTTP server
```bash
lsof -ti:8765 | xargs kill -9
```

---

## Recommended Workflow

**Daily Development:**
1. Start Vite dev server (Terminal 1)
2. Start Python app in dev mode (Terminal 2)
3. Edit code, save, see changes instantly
4. Keep both terminals open all day

**Before Committing:**
1. Test in production mode
2. Build: `npm run build`
3. Run: `python3 main.py`
4. Verify everything works

**Before Creating DMG:**
1. Build production: `npm run build`
2. Switch API to production URL
3. Build DMG: `pyinstaller --clean timekeeper.spec`
4. Create installer: `./create_dmg.sh`

---

## File Watching (Alternative)

If you prefer to use built files but want auto-rebuild:

```bash
cd frontend
npm run build -- --watch
```

This rebuilds automatically on file changes, but slower than dev server.

---

## Environment Variables

| Variable | Value | Mode | Description |
|----------|-------|------|-------------|
| `DEV_MODE` | `true` | Development | Load from Vite dev server |
| `DEV_MODE` | `false` or unset | Production | Load from built files |

Set in Terminal 2:
```bash
export DEV_MODE=true
python3 main.py
```

Or use the provided script:
```bash
./run_dev.sh
```
