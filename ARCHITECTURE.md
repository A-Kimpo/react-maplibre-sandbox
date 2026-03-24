# ARCHITECTURE.md

## Product

B2C туристическая карта. Пользователь видит полигоны мест (горнолыжки, тропы, парки), кликает — переходит в masterplan вид с деталями, может зайти в 360 VR.

## Стек

| Технология | Обоснование |
|---|---|
| **Next.js 13+ (App Router)** | SEO обязателен (B2C), API routes для будущего бэкенда, routing из коробки |
| **MapLibre GL JS** | Open-source, без токена, OpenStreetMap tiles, адаптер-совместимый |
| **Redux Toolkit** | Глобальное состояние мест, навигации, UI |
| **TypeScript** | Строгая типизация адаптеров и API контрактов |
| **Three.js** | VR 360° панорамы (первый этап — equirectangular фото) |

## Архитектура: FSD + Next.js App Router

Next.js `app/` выполняет роль FSD слоя **app** (роутинг + провайдеры). Остальные слои — рядом.

```
app/                                ← Next.js routing = FSD "app" layer
  layout.tsx                        ← глобальные провайдеры (Redux + MapProvider)
  page.tsx                          ← редирект на /map
  map/
    page.tsx                        ← рендерит OverviewMapPage (thin wrapper)
  place/
    [id]/
      page.tsx                      ← рендерит MasterplanPage
      vr/
        page.tsx                    ← рендерит VRPage
  providers/
    MapProvider/                    ← провайдер карты (компонует хуки из shared/lib/map)

widgets/                            ← FSD: сборные UI блоки
  overview-map/                     ← карта с полигонами + плашка места
  masterplan-map/                   ← детальная карта: пины, тултипы
  place-sidebar/                    ← сайдбар с описанием, услугами, фото
  vr-viewer/                        ← Three.js 360° viewer

features/                           ← FSD: бизнес-сценарии / интеракции
  select-place/                     ← клик по полигону → navigateTo(place)
  navigate-vr/                      ← переход в/из VR режима
  map-style-switcher/               ← смена тайлов/темы

entities/                           ← FSD: доменные модели
  place/
    model/                          ← store slice (selectedPlace, places[])
    api/                            ← REST: fetchPlaces, fetchPlaceById
    ui/                             ← PlaceCard, PlacePolygon
  tour-point/                       ← VR-точки внутри места
    model/
    api/
    ui/

shared/                             ← FSD: инфраструктура, без бизнес-логики
  lib/
    map/                            ← ИЗОЛИРОВАННАЯ БИБЛИОТЕКА КАРТЫ ★
    api/                            ← базовый HTTP клиент (fetch wrapper)
    hooks/                          ← useBreakpoint, useDebounce и т.д.
  ui/                               ← дизайн-система: Button, Card, Badge
  config/                           ← env переменные, константы
  types/                            ← общие TS типы (Coords, BBox и т.д.)
```

## Изолированная библиотека карты (`shared/lib/map/`)

**Главное требование:** никаких импортов из слоёв выше (`entities/`, `features/`, `widgets/`). Только `maplibre-gl` и React. Может быть выделена в отдельный npm пакет с минимальными изменениями.

```
shared/lib/map/
  index.ts                          ← публичный API библиотеки
  contextProvider/
    MapContext.ts                   ← React контекст (IMapContext)
    useMapProvider.ts               ← хук-консьюмер
    types.ts                        ← TMapApi, TMapState, IMapContext
  adapters/
    IMapAdapter.ts                  ← интерфейс адаптера
    MaplibreAdapter.ts              ← реализация (основная)
  factories/
    MapAdapterFactory.ts            ← создаёт нужный адаптер по конфигу
  elements/                         ← компоненты-слои карты
    Areas.tsx                       ← полигоны мест
    Markers.tsx                     ← пины
    Tooltips.tsx
    TilesLayer.tsx
  hooks/
    useMapComponent.ts              ← base hook: setup + cleanup на onMapReady
    useLayerManager.ts              ← CRUD источников/слоёв + restore after style change
    useMarkerManager.ts
    useDOMStorage.ts
  MapSlot.tsx                       ← точка монтирования карты в DOM
  MapStorage.tsx                    ← скрытый контейнер (карта живёт при смене роутов)
  utils/
    ...                             ← DOM helpers, WKT parsing, math, urlHash
```

## State machine: навигация между видами

```
OVERVIEW (app/map)
  полигоны мест на карте
  └─► [клик на место] → MASTERPLAN (app/place/[id])
        пины, тултипы, сайдбар с услугами
        └─► [кнопка VR] → VR (app/place/[id]/vr)
              Three.js 360° панорама
              точки перехода между панорамами
              ◄── [выход] → MASTERPLAN
```

Redux slice `features/select-place` хранит `selectedPlaceId` и экспортирует `navigateToPlace(id)` thunk.

## API Layer (future-ready)

Все обращения к бэкенду через `entities/*/api/`. Сейчас используется mock-данные, конфигурация — через `shared/config/apiConfig.ts` (base URL из env). RTK Query или простые async thunks.

```ts
// entities/place/api/placesApi.ts
export const fetchPlaces = (): Promise<Place[]> => api.get('/places')
export const fetchPlaceById = (id: string): Promise<PlaceDetail> => api.get(`/places/${id}`)
```

Когда появится реальный API — меняется только реализация в `api/*.ts`, интерфейсы остаются.

## MapProvider: схема инициализации

```
<layout.tsx>
  <Redux Provider>
    <MapProvider>              ← создаёт DOM-контейнер, вешает на body
      <MapStorage />           ← скрытый контейнер карты (живёт всегда)
      {children}
        <MapSlot />            ← видимая точка монтирования (в виджете)
          lifecycle.ensureMap() → создаёт Map instance → onMapReady callbacks
```

## VR архитектура (Three.js)

Первый этап: equirectangular панорамные фото (как Google Street View).
- `widgets/vr-viewer/` — Three.js сцена, SphereGeometry с текстурой панорамы
- Точки переходов (`tour-point` entity) — hotspots на сфере с onClick навигацией
- Данные (URL фото, позиции hotspots) — из REST API или mock JSON

Второй этап: полноценные 3D сцены + WebXR (VR headset). Архитектурно VRViewer изолирован — смена внутренностей не затронет остальное.

## Адаптер карты

```ts
interface IMapAdapter {
  createMap(container: HTMLElement, options: MapOptions): MapInstance
  addSource(id: string, source: SourceSpec): void
  addLayer(layer: LayerSpec): void
  removeLayer(id: string): void
  removeSource(id: string): void
  fitBounds(bounds: BBox, options?): void
  on(event: string, handler: Function): void
  off(event: string, handler: Function): void
}
```

`MapAdapterFactory.create('maplibre' | 'mapbox')` → возвращает нужный адаптер. Переключение без изменений в бизнес-логике.
