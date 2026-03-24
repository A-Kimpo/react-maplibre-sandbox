# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

Sandbox for a clean MapLibre GL JS integration in Next.js. The primary objective is to port the map library from the legacy monorepo reference (`CODEBASE/`) into a standalone, dependency-free implementation using **MapLibre** instead of Mapbox.

**Critical rule:** `CODEBASE/` is reference-only — never import from it. Strip all `@lkm/*`, `@fsd/*`, `@mapbox/*`, `mapbox-gl` references and replace with `maplibre-gl` equivalents. Also being used as a sandbox to plan/prototype a **tourism map product** (see `GOALS.md`).

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run start    # Start production server
```

No test runner configured.

## Architecture

### Layer Structure

```
app/providers/MapProvider/   ← Root-level map provider (target location, being migrated here)
lib/map/                     ← Core map library: context, hooks, managers, elements, utils
components/                  ← UI feature components consuming the map library
CODEBASE/                    ← Legacy reference implementation (read-only, do not import)
mock/                        ← Dev mock data
```

### MapProvider Pattern (Central Concept)

A **single `maplibre-gl` Map instance** lives in `app/providers/MapProvider/MapProvider.tsx` and is shared across the entire app via React Context (`lib/map/contextProvider/MapContext.ts`).

The provider composes focused hooks (see `CODEBASE/MapProvider/_hooks/` for reference):
- `useMapLifecycle` — creates/destroys the map, fires `onMapReady` callbacks, tracks `instanceLoaded`, `initStyleLoaded`, `isFullyReady`, `isDestroyed`
- `useMapContainer` — show/hide/move the map DOM container (`showMap`, `hideMap`, `mountTo`, `unmountToStorage`)
- `useMapControls` — add/remove controls with deduplication
- `useMapDraw` — draw tool lifecycle (`getDraw`, `setDraw`, `removeDraw`) — use `@maplibre/maplibre-gl-draw` not `@mapbox/mapbox-gl-draw`
- `useMapStyles` — async style/projection switching with layer restoration
- `useIdleTimer` — destroys map after inactivity
- `useDOMStorage` — manages hidden `MapStorage` DOM node (keeps map alive between route changes)
- `useMarkerManager` / `useLayerManager` — manager pattern for markers and layers

Consumer hook: `useMapProvider()` from `lib/map/contextProvider/useMapProvider.ts`.

### Map Lifecycle (Initialization Order)

1. App root renders `<Providers>` → mounts `MapProvider` + `MapStorage` (hidden DOM node)
2. A page mounts `<MapSlot parentRef={...}>` (inside `MapContainer` or a feature component)
3. Feature calls `lifecycle.ensureMap()` — creates the map instance if not yet created
4. Map fires `load` → `lifecycle` invokes all `onMapReady` callbacks
5. Features set styles, restore layers, add controls/markers in `onMapReady`
6. On unmount: unsubscribe → `mapDraw.removeDraw()` → `mapApi.clearAppData({ removeLayers: true })`
7. Provider unmount: `idleTimer.clearTimer()` → `lifecycle.destroyMap()` → remove DOM nodes

### `useMapComponent` Hook

Used inside map element components (`lib/map/elements/`). Registers `setupFn(map)` + `cleanupFn(map, instance)` that runs on every `onMapReady`. Cleanup always runs before setup.

```ts
useMapComponent('MyLayer', (map) => { /* setup, return instance */ }, (map, instance) => { /* cleanup */ }, [dep]);
```

### DOM Architecture

- `containerRef` — actual map canvas container, appended to `document.body`
- `portalRef` — sibling container for map UI overlays (React portals)
- `MapStorage` — hidden element holding the map DOM when no `MapSlot` is active (preserves map across route changes)
- `MapSlot` — visible mount point rendered by features; tracks resize via `parentRef`

### Context Shape (`IMapContext`)

```ts
{
  state: TMapState,                    // isDestroyed, isFullyReady, loaded, isHidden, ...
  api: TMapApi,                        // markers, layers, mapControls, mapDraw, clearAppData, resetToInitialView, changeStyle
  lifecycle: TMapLifecycleAPI,         // ensureMap, destroyMap, onMapReady, forceRecreate, projection, themeScheme, isDirty
  containerControl: TMapContainerActionAPI, // showMap, hideMap, mountTo, unmountToStorage
  map: Map | null,
  mapRef, containerRef
}
```

### Adapter Pattern

`lib/map/adapters/` implements `IMapAdapter` interface (see `CODEBASE/map/interfaces/IMapAdapter.ts`).
- `MaplibreAdapter.ts` — primary target
- `MapboxAdapter.ts` — legacy reference
- `lib/map/factories/MapAdapterFactory.ts` — instantiates the correct adapter

### Redux Store

`lib/features/mapSlice.ts` — single slice managing `markers: { id, lng, lat }[]`.
Actions: `setMarkers`, `clearMarkers`.

## MapLibre Migration Notes

- No access token needed (unlike Mapbox) — remove `mapboxgl.accessToken = ...`
- CSS: `import 'maplibre-gl/dist/maplibre-gl.css'`
- Draw tool: use `@maplibre/maplibre-gl-draw` (not `@mapbox/mapbox-gl-draw`)
- API is largely identical to Mapbox GL JS — check `CODEBASE/map/adapters/MaplibreAdapter.ts` for divergences
- `CODEBASE/map/utils/mapbox.ts` → rename utilities removing the `mapbox` naming

## Key Reference Files in CODEBASE

| File | What to port |
|---|---|
| `CODEBASE/MapProvider/MapProvider.tsx` | Full provider composition pattern |
| `CODEBASE/MapProvider/_hooks/useMapLifecycle.ts` | Map instance creation + onMapReady event bus |
| `CODEBASE/map/contextProvider/types.ts` | IMapContext, TMapApi, TMapState shapes |
| `CODEBASE/map/hooks/useMapComponent.ts` | Base hook for all map element components |
| `CODEBASE/map/hooks/useLayerManager.ts` | Source/layer CRUD + restore after style change |
| `CODEBASE/map/elements/` | Map elements (Markers, Areas, Places, etc.) |
| `CODEBASE/map/utils/` | DOM helpers, WKT parsing, math |
| `CODEBASE/MapAreasFeat/MapAreasFeat.tsx` | Feature component: areas/places editing with draw tool |
