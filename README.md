# Аким на 5 часов

Минимальный TanStack Start frontend для хакатонного AI-симулятора управления городом. Районы показаны кликабельными кругами; интерфейс отправляет выбранную инициативу в backend и отображает его расчёт.

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Откройте `http://localhost:3000`.

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
  "budgetRemaining": 100,
  "selectedDistrictId": "saryarka",
  "decision": { "id": "brt", "category": "transport", "title": "BRT-коридор", "cost": 18 },
  "districts": []
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

`districts` должен вернуть полный массив районов в том же формате, что был в запросе, с пересчитанными `indicators`: `transport`, `green`, `social`, `safety`, `service`.

## Граница ответственности

- Frontend: выбор района и инициативы, отображение бюджета, индикаторов и AI-текста.
- Backend: проверка бюджета, правила симуляции, расчёт QoL, события и AI-анализ.
- Данные в стартовом наборе синтетические.
