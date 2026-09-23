import type { Category, DistrictId, IndicatorId, MeasureId } from './types'

export const DISTRICT_PRESENTATION: Record<DistrictId, { mapId: string; name: string; scenario: string; mapCenter: [number, number]; position: { left: string; top: string } }> = {
  Saryarka: { mapId: 'saryarka', name: 'Сарыарка', scenario: 'Смог от частного сектора и слабое озеленение.', mapCenter: [71.385, 51.154], position: { left: '26%', top: '52%' } },
  Almaty: { mapId: 'almaty', name: 'Алматы', scenario: 'Старый ЖКХ и пробки.', mapCenter: [71.443, 51.194], position: { left: '52%', top: '28%' } },
  Esil: { mapId: 'yesil', name: 'Есиль', scenario: 'Богатый район, но с пробками на мостах и переполненными школами.', mapCenter: [71.477, 51.147], position: { left: '76%', top: '47%' } },
  Baikonur: { mapId: 'baikonyr', name: 'Байконур', scenario: 'Середняк без ярких перекосов.', mapCenter: [71.394, 51.183], position: { left: '37%', top: '33%' } },
  Nura: { mapId: 'nura', name: 'Нура', scenario: 'Главный аутсайдер по социальной сфере и транспорту.', mapCenter: [71.451, 51.107], position: { left: '57%', top: '76%' } },
}
export const CATEGORY_LABELS: Record<Category, string> = { transport: 'Транспорт', ecology: 'Экология', social: 'Социальная сфера', safety: 'Безопасность', services: 'Сервисы' }
export const INDICATOR_LABELS: Record<IndicatorId, string> = {
  T1: 'Разгрузка дорог', T2: 'Доступность общественного транспорта', E1: 'Озеленение', E2: 'Качество воздуха',
  S1: 'Школы и детсады', S2: 'Поликлиники и первичная медпомощь', B1: 'Безопасность улиц', B2: 'Безопасность дорожного движения',
  C1: 'Надёжность ЖКХ', C2: 'Скорость решения обращений жителей',
}
export const INDICATOR_DESCRIPTIONS: Record<IndicatorId, string> = {
  T1: '100 — нет пробок в час пик; 0 — стоит всё.',
  T2: '100 — все жители в 500 м от остановки с интервалом ≤10 мин.',
  E1: '100 — не менее 20 м² зелени на жителя.',
  E2: '100 — зимой AQI ≤50; 0 — хронический смог.',
  S1: '100 — нормативная потребность обеспечена, без второй смены.',
  S2: '100 — норматив на жителя выполнен полностью.',
  B1: '100 — освещение и камеры везде, минимум происшествий.',
  B2: '100 — минимум ДТП с пострадавшими.',
  C1: '100 — нет аварий отопления и воды за год.',
  C2: '100 — все обращения закрыты в срок.',
}
export const INDICATOR_GROUPS = [
  { id: 'T', label: 'Транспорт', indicators: ['T1', 'T2'] },
  { id: 'E', label: 'Экология', indicators: ['E1', 'E2'] },
  { id: 'S', label: 'Социальная сфера', indicators: ['S1', 'S2'] },
  { id: 'B', label: 'Безопасность', indicators: ['B1', 'B2'] },
  { id: 'C', label: 'Сервисы', indicators: ['C1', 'C2'] },
] as const
export const MEASURE_LABELS: Record<MeasureId, string> = {
  M1: 'Выделенные автобусные полосы', M2: 'Умные светофоры', M3: 'Линия / расширение LRT',
  M4: 'Парк / сквер', M5: 'Чистое топливо для частного сектора', M6: 'Озеленение и ветрозащита',
  M7: 'Школа + детский сад', M8: 'Семейная поликлиника', M9: 'Спортивные центры района',
  M10: 'Освещение и камеры', M11: 'Безопасные переходы и школьные зоны', M12: 'Единая платформа обращений',
  M13: 'Модернизация теплосетей и водопровода', M14: 'Аварийные бригады и оповещение',
}
