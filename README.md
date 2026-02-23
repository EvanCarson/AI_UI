# Tenant Usage Grid UI

A small deployable TypeScript UI that provides an editable grid for:

- Tenant ID
- Branch Name
- Usage
- URL list
- OMS Firm
- GIO Firm
- Note
- Status with color icon (`Read`, `WIP`, `Unset`, `Expire`)

## Sample data (from JSON)

Default rows are loaded from `src/data/seedRecords.json` (including tenant IDs **811** and **810**).

If you change data while testing, click **Reset to JSON seed data** in the UI to reload from the JSON file.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Build for deployment

```bash
npm run build
```

The production assets are generated into `dist/` and can be deployed to any static hosting service.

## Debug guide (WebStorm)

### 1) Quick debug in browser tools

1. Start app: `npm run dev`
2. Open browser DevTools (F12)
3. Inspect app state in **Application > Local Storage** key `tenant-usage-grid-records`
4. Clear local storage to re-test first-load behavior from JSON seed data

### 2) Debug with WebStorm

1. Run `npm install`
2. In WebStorm, open **Run | Edit Configurations...**
3. Add an **npm** configuration:
   - `package.json`: project root
   - `Command`: `run`
   - `Scripts`: `dev`
4. Run the npm `dev` config so Vite starts on `http://localhost:5173`
5. Add a **JavaScript Debug** configuration with URL `http://localhost:5173`
6. Start the JavaScript Debug config and set breakpoints in `src/App.tsx`

### 3) Useful debug points

- `getSeedData()` to confirm JSON parsing/normalization
- `save()` to check localStorage writes
- `updateField()` to inspect row edits

### 4) TypeScript check

```bash
npm run typecheck
```
