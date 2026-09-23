import { useEffect, useRef, useState } from 'react'
import type { Map as MapInstance } from '@2gis/mapgl/types'
import { boundaryBounds, loadDistrictBoundaries } from '../lib/astana-districts'
import type { DistrictBoundary } from '../lib/astana-districts'

type MapDistrict = { id: string; name: string; score: number }
type MapGL = typeof import('@2gis/mapgl/types')
type MapSession = { map: MapInstance; api: MapGL }
type MapState = 'loading' | 'ready' | 'error'

let sdkPromise: Promise<MapGL> | undefined
function loadSdk() {
  if (!sdkPromise) {
    let timeout: ReturnType<typeof setTimeout>
    sdkPromise = Promise.race([
      import('@2gis/mapgl').then(({ load }) => load('https://mapgl.2gis.com/api/js/v1')),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('MapGL load timeout')), 20000) }),
    ]).catch((error: unknown) => { sdkPromise = undefined; throw error })
      .finally(() => clearTimeout(timeout))
  }
  return sdkPromise
}

function colorFor(score: number) {
  if (score >= 58) return '#25846c'
  if (score >= 45) return '#b78223'
  return '#bb5149'
}

export function AstanaMap({ districts, selectedDistrictId, onSelect }: {
  districts: MapDistrict[]
  selectedDistrictId: string
  onSelect: (districtId: string) => void
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const layers = useRef<{ destroy: () => void }[]>([])
  const [session, setSession] = useState<MapSession | null>(null)
  const [mapState, setMapState] = useState<MapState>('loading')
  const [mapError, setMapError] = useState('')
  const [boundaries, setBoundaries] = useState<DistrictBoundary[]>([])
  const [boundaryError, setBoundaryError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const key = import.meta.env.VITE_2GIS_MAP_KEY?.trim()
    let map: MapInstance | undefined
    let disposed = false
    let ready = false
    const controller = new AbortController()
    setSession(null)
    setMapState('loading')
    setMapError('')
    setBoundaries([])
    setBoundaryError('')

    const fail = (message: string) => {
      if (!disposed) { setMapState('error'); setMapError(message) }
    }
    const timer = window.setTimeout(() => {
      if (!ready) fail('Карта загружается слишком долго. Проверьте соединение и повторите попытку.')
    }, 25000)

    if (!key) {
      window.clearTimeout(timer)
      fail('Для загрузки карты нужен ключ 2ГИС в настройках приложения.')
    } else {
      loadDistrictBoundaries(key, AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]))
        .then((result) => { if (!disposed) setBoundaries(result) })
        .catch((error: unknown) => {
          if (!disposed) setBoundaryError(error instanceof Error ? error.message : 'Не удалось загрузить границы районов.')
        })

      loadSdk().then((api) => {
        if (disposed || !mapContainer.current) return
        map = new api.Map(mapContainer.current, {
          center: [71.43, 51.14], zoom: 10.8, pitch: 0, rotation: 0, key,
          lang: 'ru', minZoom: 8, maxZoom: 19, zoomControl: false,
          copyright: 'bottomLeft', scaleControl: 'bottomLeft',
          padding: { top: 110, right: 380, bottom: 80, left: 35 },
        })
        map.on('idle', () => {
          if (!disposed) { ready = true; window.clearTimeout(timer); setMapState('ready'); setMapError('') }
        })
        map.on('styleloaderror', () => fail('Не удалось загрузить карту 2ГИС. Проверьте соединение и доступ к карте.'))
        setSession({ map, api })
      }).catch(() => fail('Не удалось запустить карту 2ГИС. Проверьте соединение и поддержку WebGL в браузере.'))
    }

    return () => {
      disposed = true
      controller.abort()
      window.clearTimeout(timer)
      layers.current.forEach((layer) => layer.destroy())
      layers.current = []
      map?.destroy()
    }
  }, [attempt])

  useEffect(() => {
    if (session && boundaries.length) session.map.fitBounds(boundaryBounds(boundaries), {
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
    })
  }, [session, boundaries])

  useEffect(() => {
    if (!session || !boundaries.length) return
    const { map, api } = session
    for (const district of districts) {
      const boundary = boundaries.find((entry) => entry.id === district.id)
      if (!boundary) continue
      const selected = district.id === selectedDistrictId
      const color = colorFor(district.score)
      boundary.polygons.forEach((coordinates) => {
        const polygon = new api.Polygon(map, {
          coordinates, color: color + (selected ? '45' : '22'),
          strokeColor: selected ? '#75500d' : color, strokeWidth: selected ? 3 : 1.5,
          zIndex: selected ? 2 : 1,
        })
        polygon.on('click', () => onSelect(district.id))
        layers.current.push(polygon)
      })
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'district-map-label' + (selected ? ' selected' : '')
      button.setAttribute('aria-pressed', String(selected))
      button.setAttribute('aria-label', district.name + ', индекс ' + district.score)
      button.textContent = district.name + ' · ' + district.score
      button.style.setProperty('--district-color', color)
      button.onclick = () => onSelect(district.id)
      layers.current.push(new api.HtmlMarker(map, {
        coordinates: boundary.center, html: button, anchor: [0, 0],
      }))
    }
    return () => {
      layers.current.forEach((layer) => layer.destroy())
      layers.current = []
    }
  }, [session, boundaries, districts, selectedDistrictId, onSelect])

  function focusDistrict(id: string) {
    onSelect(id)
    const boundary = boundaries.find((entry) => entry.id === id)
    if (session && boundary) session.map.fitBounds(boundaryBounds([boundary]), {
      padding: { top: 35, right: 35, bottom: 35, left: 35 }, maxZoom: 12,
    })
  }

  return (
    <div className="astana-map" data-map-state={mapState}>
      <div className="map-canvas" ref={mapContainer} aria-label="Интерактивная карта 2ГИС" />
      <div className="map-district-picker" aria-label="Районы Астаны">
        {districts.map((district) => <button key={district.id} type="button" aria-pressed={district.id === selectedDistrictId} onClick={() => focusDistrict(district.id)}>{district.name}</button>)}
      </div>
      <div className="map-controls" aria-label="Управление картой">
        <button type="button" aria-label="Приблизить карту" disabled={!session} onClick={() => session?.map.setZoom(session.map.getZoom() + 1)}>+</button>
        <button type="button" aria-label="Отдалить карту" disabled={!session} onClick={() => session?.map.setZoom(session.map.getZoom() - 1)}>−</button>
        <button type="button" disabled={!session || !boundaries.length} onClick={() => session?.map.fitBounds(boundaryBounds(boundaries), { padding: { top: 20, right: 20, bottom: 20, left: 20 } })}>Все районы</button>
      </div>
      {mapState !== 'ready' && <div className="map-notice" role={mapState === 'error' ? 'alert' : 'status'}>
        <strong>{mapState === 'loading' ? 'Загружаем карту Астаны' : 'Карта недоступна'}</strong>
        <p>{mapState === 'loading' ? 'Улицы, здания и районы · 2ГИС' : mapError}</p>
        {mapState === 'error' && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Повторить загрузку</button>}
      </div>}
      {mapState === 'ready' && boundaryError && <div className="map-boundary-error" role="alert">{boundaryError} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Повторить</button></div>}
      <div className="map-source" role="status">{mapState === 'ready' ? boundaries.length ? '2ГИС · границы 6 районов · показатели игровые' : boundaryError ? '2ГИС · границы недоступны' : '2ГИС · загрузка границ районов…' : '2ГИС · Астана'}</div>
    </div>
  )
}
