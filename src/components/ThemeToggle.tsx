import { Moon, Sun } from 'lucide-react'
import type { MapTheme } from '../lib/map-style'

export function ThemeToggle({ theme, onToggle }: { theme: MapTheme; onToggle: () => void }) {
  const dark = theme === 'dark'
  return <button className="theme-toggle" type="button" role="switch" aria-checked={dark} aria-label="Тёмная тема" title={dark ? 'Включить дневную тему' : 'Включить тёмную тему'} onClick={onToggle}>
    {dark ? <Moon size={14} aria-hidden="true" /> : <Sun size={14} aria-hidden="true" />}
    <span>{dark ? 'Тёмная тема' : 'Дневная тема'}</span><span className="theme-toggle-track" aria-hidden="true"><span /></span>
  </button>
}
