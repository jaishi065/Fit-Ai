# FITAI (frontend-only core)
Run: open the `fitai` folder in VS Code, right-click `index.html` and choose Open with Live Server (ES modules need a server).
Architecture: `js/storage.js` is the only file that touches localStorage; each function is annotated with the future API call. `js/data.js` holds the 32-exercise dataset. `js/app.js` holds the hash router, the rule-based plan generator (`generatePlan`, replaceable by an API call), onboarding and the views.

## MuscleWiki demo videos
Run with `npm start` (not Live Server) and open http://localhost:3000. Create `.env` next to `server.js` containing `MUSCLEWIKI_API_KEY=YOUR_KEY_HERE` (copy `.env.example`). The key stays on the server; the browser only talks to `/api/musclewiki/*`.
