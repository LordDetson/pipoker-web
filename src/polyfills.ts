// sockjs-client, used for the room WebSocket, expects the Node.js "global" to exist.
// Define it before the application bundle loads so the dependency can reference it.
// Kept here instead of an inline script in index.html, so the Content-Security-Policy
// can forbid inline scripts (script-src 'self') without a hash.
(window as unknown as { global: Window }).global = window;
