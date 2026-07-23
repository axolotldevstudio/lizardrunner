# lizardrunner

## Changing Multiplayer Servers

The multiplayer servers are configured in `serverConfig.js` at the project root.

- File: `serverConfig.js` — edit the three URLs at the top of the file.
- Supported URL formats: `http://12.34.56.78:3000` and `https://example.com` (ports optional).

Automatic client behavior:

- The client uses `serverManager.js` to perform lightweight health checks against each server's `/health` endpoint before connecting.
- The client selects the server with the lowest latency that reports `{ "status": "ok" }`.
- If a server fails to connect or disconnects, the client will automatically attempt to fail over to another available server using exponential-ish backoff and will not hammer a failed server.

How to change a server URL:

1. Open `serverConfig.js`.
2. Replace the corresponding URL value for `singapore`, `europe`, or `global`.
3. Save the file and redeploy frontend (if hosted) or reload the page.

How health checks work:

- Each multiplayer server must expose a lightweight unauthenticated GET `/health` endpoint that returns a small JSON payload, e.g. `{ "status": "ok" }`.
- The client times out health checks after ~4 seconds and marks servers unavailable until rechecked.

Files added/changed:

- `serverConfig.js` — central editable server URL list.
- `serverManager.js` — client-side health, latency, selection, and failover logic.
- `multiplayer.js` — updated to use `serverManager` for automatic selection and failover.
- `lizardserver/server.js` — added `/health` endpoint for server health checks.

Notes:

- Do not include private credentials or Firebase service account data in frontend files.
- If you add another server, simply add a new key/value pair to `serverConfig.js`.

