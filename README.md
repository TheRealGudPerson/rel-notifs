# Relationship & Server Notifs

A [Revenge](https://github.com/revenge-mod) plugin that records friend-list and server-list changes and sends a mobile notification whenever:

- a mutual/friend removes you from their friend list;
- your account is added to a server; or
- your account is removed from a server.

The plugin settings page also keeps a combined history of mutual additions, mutual removals, server additions, and server removals. The history can be filtered by event type.

> Note: Revenge plugins run inside the mobile Discord client. The plugin uses Discord/Revenge's available local notification helper when present and falls back to an in-app toast if the runtime does not expose local notifications.

## Repository structure

```text
manifest.json        Revenge plugin manifest
src/index.tsx        Plugin entrypoint, event listeners, notifications, and settings UI
scripts/build.mjs    esbuild compile script
package.json         Build/typecheck scripts and dev dependencies
tsconfig.json        TypeScript configuration
dist/                Generated installable plugin files after build
```

## Build / compile

1. Install Node.js 20 or newer.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the plugin:

   ```bash
   npm run build
   ```

4. The installable files are generated in `dist/`:

   ```text
   dist/manifest.json
   dist/index.js
   ```

5. Optional type check:

   ```bash
   npm run typecheck
   ```

## Publish to GitHub Pages for Revenge installation

1. Create a GitHub repository and push this project.
2. Run `npm install` and `npm run build` locally.
3. Commit the generated `dist/` directory, or configure a GitHub Actions workflow to build it.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select your branch and set the folder to `/dist`.
7. Save the settings and wait for GitHub Pages to deploy.
8. Your Revenge install URL will be the GitHub Pages URL that points at the directory containing `manifest.json`, for example:

   ```text
   https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/
   ```

9. Open Revenge's plugin installer and paste that URL. Revenge reads `manifest.json`, then loads the compiled `index.js` referenced by the manifest.

## Development notes

- `RELATIONSHIP_ADD` and `RELATIONSHIP_REMOVE` events are recorded in history.
- `GUILD_CREATE` and `GUILD_DELETE` events are recorded in history and can trigger notifications.
- The history is capped by `maxEntries` in plugin storage, defaulting to 250 entries.
