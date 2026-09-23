import type { Category, DistrictId, IndicatorId, MeasureId } from './types'

export const DISTRICT_PRESENTATION: Record<DistrictId, { name: string; mapCenter: [number, number]; position: { left: string; top: string } }> = {
  Saryarka: { name: 'Сарыарка', mapCenter: [71.385, 51.154], position: { left: '26%', top: '52%' } },
  Almaty: { name: 'Алматы', mapCenter: [71.443, 51.194], position: { left: '52%', top: '28%' } },
  Esil: { name: 'Есиль', mapCenter: [71.477, 51.147], position: { left: '76%', top: '47%' } },
  Baikonur: { name: 'Байқоңыр', mapCenter: [71.394, 51.183], position: { left: '37%', top: '33%' } },
  Nura: { name: 'Нұра', mapCenter: [71.451, 51.107], position: { left: '57%', top: '76%' } },
}
export const CATEGORY_LABELS: Record<Category, string> = { transport: 'Транспорт', ecology: 'Экология', social: 'Инфраструктура', safety: 'Безопасность', services: 'Сервисы' }
export const INDICATOR_LABELS: Record<IndicatorId, string> = {
  T1: 'Эффективность дорог', T2: 'Доступность транспорта', E1: 'Озеленение', E2: 'Качество воздуха',
  S1: 'Школы и детские сады', S2: 'Поликлиники', B1: 'Безопасность улиц', B2: 'Безопасность дорог',
  C1: 'Надёжность ЖКХ', C2: 'Обработка обращений',
}
export const MEASURE_LABELS: Record<MeasureId, string> = {
  M1: 'Выделенные автобусные полосы', M2: 'Умные светофоры', M3: 'Линия / расширение LRT',
  M4: 'Парк / сквер', M5: 'Чистое топливо для частного сектора', M6: 'Озеленение и ветрозащита',
  M7: 'Школа + детский сад', M8: 'Семейная поликлиника', M9: 'Спортивные центры района',
  M10: 'Освещение и камеры', M11: 'Безопасные переходы и школьные зоны', M12: 'Единая платформа обращений',
  M13: 'Модернизация теплосетей и водопровода', M14: 'Аварийные бригады и оповещение',
}
