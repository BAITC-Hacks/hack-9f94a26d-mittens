# Аким на 5 часов

TanStack Start frontend для хакатонного AI-симулятора управления городом. Интерактивная карта 2ГИС показывает улицы, здания и реальные границы шести районов Астаны: Сарыарка, Алматы, Есиль, Байқоңыр, Нұра и Сарайшык. Район выбирается по его территории, подписи или кнопке над картой. Интерфейс собирает сценарий из пяти инициатив и отправляет весь набор в backend для расчёта.

## Запуск

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH" # macOS Homebrew; или nvm use
npm install
cp .env.example .env.local
npm run dev
```

Откройте `http://localhost:3000`.

В `.env.local` задайте `VITE_2GIS_MAP_KEY`. Ключ должен иметь доступ к MapGL JS API и Places API, включая `items.geometry.selection`. Ключ для браузерной карты доступен клиенту; ограничьте его разрешёнными доменами в кабинете 2ГИС. Файл `.env.local` исключён из Git. После изменения ключа перезапустите dev-сервер.

Границы загружаются из [Places API 2ГИС](https://docs.2gis.com/en/api/search/places/overview) для города `9570771978420226`; геометрия Polygon/MultiPolygon преобразуется из WKT. Карта занимает весь экран. Выбранный район выделяется голубым контуром; чёрные полупрозрачные панели показателей и действий появляются только после выбора района. Закрытие района сохраняет инициативы. Масштабирование и перемещение включены. «Все районы» показывает весь охват границ. При недоступности карты или границ отображается ошибка с повторной загрузкой.

Подложка светлая: `src/lib/map-style.ts` заменяет фоновые слои опубликованного стиля через [MapGL addLayer/removeLayer](https://docs.2gis.com/en/mapgl/map-style/modify), сохраняя воду, парки, дороги, здания и подписи. Для собственного оформления опубликуйте стиль в [редакторе 2ГИС](https://docs.2gis.com/en/maps/styles/overview) и задайте его UUID в `VITE_2GIS_MAP_STYLE_ID`. В этом случае встроенная светлая перекраска не применяется. После изменения переменной перезапустите dev-сервер.

## Контракт с backend

В `.env.local` укажите адрес сервиса:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Фронтенд вызывает `POST {VITE_API_BASE_URL}/api/simulation/decision`.

### Запрос

```json
{
  "sessionId": "demo-team-01",
  "decisions": [
    { "id": "M2" },
    { "id": "M3", "district": "Nura" },
    { "id": "M8", "district": "Nura" },
    { "id": "M9", "district": "Nura" },
    { "id": "M14" }
  ]
}
```

### Ответ

```json
{
  "budgetRemaining": 82,
  "qualityOfLifeScore": 58,
  "districts": [],
  "analysis": "BRT снизил транспортную нагрузку в Сарыарке; следующий риск — нехватка зелёных зон.",
  "event": "Транспортный индекс района вырос на 14 пунктов"
}
```

`districts` должен вернуть полный массив районов с полями `id`, `name`, `population`, `indicators`, с пересчитанными `indicators`: `transport`, `green`, `social`, `safety`, `service`.

## Граница ответственности

- Frontend: набор из 5 инициатив, проверка ограничений черновика, остаток бюджета и отображение ответа backend.
- Backend: проверка бюджета, правила симуляции, расчёт QoL, события и AI-анализ.
- Население и индексы всех шести районов — синтетические данные сценария, география — данные 2ГИС.
- Для Сарайшыка используется `district: "Saraishyk"` в запросе и `id: "saraishyk"` в ответе. Backend должен поддерживать этот район и возвращать все шесть районов.

## Выбор инициатив

Каталог из 14 мер и правила находятся в `data/campaigns.json`.
Каталог сначала показывает пять категорий: транспорт, экология, социальная сфера,
безопасность и сервисы. Нажмите категорию, чтобы открыть её инициативы;
«Все категории» возвращает к списку. Выбранные меры и бюджет сохраняются при переходах.

Нажатие на инициативу добавляет меру в сценарий и резервирует стоимость; повторное нажатие или «Убрать» возвращает
бюджет. Район сохраняется в момент добавления. Общегородские меры не имеют района.
Ровно 5 мер, бюджет ≤ 100, без повторов, максимум 2 меры одного направления;
несовместимости проверяются с учётом района. Остаток бюджета допустим и не даёт бонуса.
Недоступные меры показывают причину. Район каждой районной меры можно выбрать в выпадающем списке до или после добавления. Несовместимые районы для уже выбранной меры недоступны.

В репозитории есть детерминированный движок и endpoints оптимизации (см. Optimizer ниже).
Внешний backend для интерфейса должен поддерживать массив `decisions` выше: повторно проверить полный набор и
рассчитать его от исходных данных, а не накопительно. Повторная отправка того же
набора не должна повторно списывать бюджет. До ответа сервиса QoL не отображается;
показатели районов до расчёта остаются синтетическими демонстрационными данными.
Ошибка сети сохраняет выбранный сценарий для повторной отправки.

## Проверки

```bash
npm test
npx tsc --noEmit
npm run build
```

Тесты проверяют бюджет (включая ровно 100), число мер, повторения, направления,
районы, несовместимости и удаление мер. Тесты движка также проверяют Score, точный оптимум и 694395 допустимых наборов.

## Optimizer

The backend uses the existing TypeScript/TanStack Start stack. The pure optimizer
is in `src/simulator/optimizer.ts`, next to `validateScenario()` and `scoreCity()`;
there is no separate Python runtime. `data/engine.json` is the engine's static
five-district dataset from AGENTS.md. The frontend's six-district demonstration
and external `/api/simulation/decision` integration are separate and unchanged.

`optimize(constraints = null, top_n = 10)` visits all 2,002 five-measure combinations,
prunes budget/direction/global incompatibility failures, enumerates every allowed
district assignment, runs the full existing validator, and scores valid sets with
the shared effect and score functions. A bounded heap retains only the top N.
Because every feasible assignment is examined, the optimum is exact; no LLM, ML,
or heuristics are involved. Lag-scaled effects are precomputed. At larger scale,
this could move to ILP (with suitable linearization) or a genetic algorithm
(which would sacrifice the exact-optimum guarantee).

Start with `npm run dev` and use the endpoints at `http://localhost:3000`:

```bash
curl -s http://localhost:3000/optimize \
  -H 'Content-Type: application/json' \
  -d '{"top_n":3}'

curl -s http://localhost:3000/optimize \
  -H 'Content-Type: application/json' \
  -d '{"constraints":{"budget":95,"include":[{"id":"M8","district":"Nura"}],"exclude":["M3"],"exclude_districts":["Esil"],"min_directions":4,"direction_min":{"B":1},"direction_max":{"T":1},"max_per_district":2},"top_n":3}'

curl -s http://localhost:3000/counterfactual \
  -H 'Content-Type: application/json' \
  -d '{"set":[{"id":"M7","district":"Nura"},{"id":"M8","district":"Nura"},{"id":"M10","district":"Nura"},{"id":"M12","district":null},{"id":"M5","district":"Saryarka"}],"top_k":3}'
```

All constraints are optional. Budget is an integer from 0 to 100; direction keys
are `T`, `E`, `S`, `B`, `C`. An included regional measure without a district can
target any permitted district. City measures use `null` or omit the district.
`max_per_district` counts only regional measures. Constraints never relax the base
rules. Impossible constraints return `[]` from the pure function and HTTP 422 with
an `error` message from `/optimize`; malformed requests also return 422.

Results contain `measures`, `cost`, `score`, `d_avg`, `district_scores`, and `n_crit`.
Order is score descending, cost ascending, then sorted IDs lexicographically
(`M10` precedes `M2`); district assignments break remaining ties lexicographically.
Scores retain full precision. Counterfactuals enumerate every valid single measure
replacement or district change, returning the same fields plus `score_delta`,
`removed`, and `added`. They exclude the unchanged set and may return negative
deltas when no improvement is possible.

The server entry precomputes and caches the unconstrained top 10 at startup per
process. Smaller requests reuse the cache; a larger request expands it. Constrained
requests run a fresh search. The pure optimizer always runs a fresh search.

Validation and reproducible timing:

```bash
node --import tsx --test tests/*.test.mjs src/server/*.test.ts src/simulator/*.test.ts
node --import tsx src/simulator/optimizer.bench.ts
npx tsc --noEmit
npm run build
```

The full search measured approximately **2.93 seconds** locally (uncached, Node 24.13.1), below
the 5-second target. `count_valid()` returns **694395**. The best set is M2,
M3 Nura, M8 Nura, M9 Nura, M14: cost **98**, score **57.236735** (rounded **57.24**).
The repository recommends Node 20; it was unavailable at the documented Homebrew path
in the verification environment. Tests, type checking, and build passed on Node 24.
The benchmark exits unsuccessfully if the uncached search takes 5 seconds or more.
