export const initiativeTabs = [
  { id: 'T', label: 'Транспорт' },
  { id: 'E', label: 'Экология' },
  { id: 'S', label: 'Социальная сфера' },
  { id: 'B', label: 'Безопасность' },
  { id: 'C', label: 'Сервисы' },
  { id: 'CITY', label: 'Весь город' },
] as const

export type InitiativeTabId = typeof initiativeTabs[number]['id']

export function belongsToTab(measure: { type: string; direction: string }, tab: InitiativeTabId) {
  return tab === 'CITY' ? measure.type === 'C' : measure.type === 'R' && measure.direction === tab
}

export function nextInitiativeTab(current: InitiativeTabId, key: string): InitiativeTabId | null {
  const index = initiativeTabs.findIndex(tab => tab.id === current)
  if (key === 'Home') return initiativeTabs[0].id
  if (key === 'End') return initiativeTabs[initiativeTabs.length - 1].id
  if (key === 'ArrowRight') return initiativeTabs[(index + 1) % initiativeTabs.length].id
  if (key === 'ArrowLeft') return initiativeTabs[(index - 1 + initiativeTabs.length) % initiativeTabs.length].id
  return null
}
