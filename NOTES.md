# NOTES.md

Нюансы, подводные камни, важные решения.

## Map Library

### MapLibre vs Mapbox
- MapLibre — форк Mapbox GL JS после смены лицензии в 2020
- API почти идентичен, но нет `accessToken`
- CSS: `maplibre-gl/dist/maplibre-gl.css` (не mapbox)
- Draw tool: `@maplibre/maplibre-gl-draw` (не `@mapbox/mapbox-gl-draw`)

### DOM архитектура карты
Карта монтируется в `document.body` (не в React дерево) — это намеренно. Позволяет карте "жить" при смене роутов. `MapStorage` (скрытый div) держит карту, когда `MapSlot` не смонтирован.

Это означает: стили карты управляются через `containerRef.style.*`, а не через React state/CSS классы.

### SSR и maplibre-gl
MapLibre требует `window` и `document`. В Next.js:
- `MapProvider` должен быть `"use client"`
- Компоненты с `maplibre-gl` импортами — через `dynamic(() => import(...), { ssr: false })` если не уверен
- Тест: `typeof window !== 'undefined'` перед созданием Map instance

### Тайлы OpenStreetMap
Бесплатные демо тайлы: `https://demotiles.maplibre.org/style.json`
Для продакшна так нельзя (rate limits). Варианты:
- **MapTiler** (freemium, есть OSM стиль)
- **Stadia Maps** (freemium)
- **Самостоятельно** через PMTiles + собственный S3

### GeoJSON полигоны мест
- Хранить как Feature Collection в `entities/place/model/`
- Слой `fill` + слой `fill-extrusion` (для 3D эффекта при желании)
- Hover: `map.setFeatureState({source, id}, {hover: true})`
- Клик: `map.on('click', layerId, handler)`

### Layer Manager
`useLayerManager` из CODEBASE хранит список добавленных source/layer id-ов и умеет:
1. Восстановить слои после смены стиля карты (стиль удаляет все кастомные слои)
2. Очистить всё через `clearAll()`
При портировании: убрать все mapbox-gl типы, заменить на maplibre-gl.

### `onMapReady` паттерн
Не использовать `map.on('load', ...)` напрямую в компонентах. Всегда через `lifecycle.onMapReady(cb)`. Причина: если карта уже загружена — событие не выстрелит. `onMapReady` проверяет состояние и вызывает колбэк сразу если карта готова.

## VR / Three.js

### Панорамные фото (Этап 1)
- Формат: equirectangular (2:1 соотношение сторон)
- Three.js: `SphereGeometry` с `TextureLoader`, камера внутри сферы
- OrbitControls или PointerLockControls для управления
- Hotspots: `Sprite` объекты или HTML overlay через CSS3DRenderer

### Переходы между точками
- Каждая `TourPoint` entity: `{ id, panoramaUrl, position3D, linkedPoints[] }`
- При клике на hotspot → fade out → загрузить новую текстуру → fade in
- Данные точек хранятся в Redux: `entities/tour-point/model/slice.ts`

### Производительность
- Текстуры панорам большие (8K+). Предзагружать следующую точку в фоне.
- `THREE.TextureLoader` кэшировать через WeakMap или RTK Query cache

## Next.js нюансы

### App Router + FSD
- `app/` = FSD "app" слой (роутинг + провайдеры). Не пихать бизнес-логику.
- Страницы (`app/**/page.tsx`) — тонкие обёртки, рендерят виджеты из `widgets/`
- `"use client"` директива: ставить только где нужно (интерактивность/хуки)

### Metadata для SEO
```ts
// app/place/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const place = await fetchPlaceById(params.id)
  return { title: place.name, description: place.description }
}
```

### Динамические роуты
`app/place/[id]/page.tsx` — `params.id` доступен в серверных компонентах.
Данные fetching: `fetch()` с Next.js cache или RTK Query на клиенте.

## FSD правила

### Импорты
- Слой может импортировать только из слоёв **ниже**: `widgets` → `features` → `entities` → `shared`
- `shared/lib/map` не должен знать ни о каких entity / feature
- Если нужно поднять зависимость — это сигнал к рефакторингу

### Public API (index.ts)
Каждый FSD сегмент экспортирует только через `index.ts`. Прямые импорты вглубь — запрещены вне слайса.

```ts
// ✅ правильно
import { PlaceCard } from 'entities/place'
// ❌ неправильно
import { PlaceCard } from 'entities/place/ui/PlaceCard'
```
