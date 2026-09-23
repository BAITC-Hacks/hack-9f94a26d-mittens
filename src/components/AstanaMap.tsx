import { useEffect, useRef, useState } from 'react'

type MapDistrict = {
  id: string
  name: string
  mapCenter: [number, number]
  position: { left: string; top: string }
  score: number
}

type MapGL = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => { destroy: () => void }
  Polygon: new (map: unknown, options: Record<string, unknown>) => { destroy: () => void }
}

declare global {
  interface Window {
    mapgl?: MapGL
  }
}

function octagon([longitude, latitude]: [number, number]) {
  const horizontal = 0.011
  const vertical = 0.0065
  return [
    [longitude - horizontal * 0.42, latitude + vertical],
    [longitude + horizontal * 0.42, latitude + vertical],
    [longitude + horizontal, latitude + vertical * 0.42],
    [longitude + horizontal, latitude - vertical * 0.42],
    [longitude + horizontal * 0.42, latitude - vertical],
    [longitude - horizontal * 0.42, latitude - vertical],
    [longitude - horizontal, latitude - vertical * 0.42],
    [longitude - horizontal, latitude + vertical * 0.42],
    [longitude - horizontal * 0.42, latitude + vertical],
  ]
}

function colorFor(score: number) {
  if (score >= 58) return { fill: '#2d9d84', stroke: '#e6fff8' }
  if (score >= 45) return { fill: '#d7a13b', stroke: '#fff1cb' }
  return { fill: '#cf625b', stroke: '#ffe4df' }
}

export function AstanaMap({
  districts,
  selectedDistrictId,
  onSelect,
}: {
  districts: MapDistrict[]
  selectedDistrictId: string
  onSelect: (districtId: string) => void
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'fallback'>('loading')

  useEffect(() => {
    const key = import.meta.env.VITE_2GIS_MAP_KEY
    let map: { destroy: () => void } | undefined
    const polygons: { destroy: () => void }[] = []
    let disposed = false

    const initialize = () => {
      if (!mapContainer.current || !window.mapgl || !key || disposed) {
        if (!disposed) setMapState('fallback')
        return
      }
      map = new window.mapgl.Map(mapContainer.current, {
        center: [71.4304, 51.1447], zoom: 11.35, pitch: 26, rotation: -7, key,
        disableDragging: true, disableZoom: true,
      })
      districts.forEach((district) => {
        const color = colorFor(district.score)
        polygons.push(new window.mapgl!.Polygon(map, {
          coordinates: [octagon(district.mapCenter)], color: `${color.fill}77`, strokeColor: color.stroke, strokeWidth: 3, zIndex: 4,
        }))
      })
      setMapState('ready')
    }

    if (window.mapgl) initialize()
    else {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-2gis-mapgl]')
      if (existingScript) {
        existingScript.addEventListener('load', initialize, { once: true })
        existingScript.addEventListener('error', () => setMapState('fallback'), { once: true })
      } else {
        const script = document.createElement('script')
        script.src = 'https://mapgl.2gis.com/api/js/v1'
        script.async = true
        script.dataset['2gisMapgl'] = 'true'
        script.addEventListener('load', initialize, { once: true })
        script.addEventListener('error', () => setMapState('fallback'), { once: true })
        document.head.appendChild(script)
      }
    }
    return () => { disposed = true; polygons.forEach((polygon) => polygon.destroy()); map?.destroy() }
  }, [districts])

  return (
    <div className={`astana-map ${mapState === 'fallback' ? 'map-fallback' : ''}`}>
      <div className="map-canvas" ref={mapContainer} />
      {mapState === 'fallback' && <div className="fallback-grid" aria-hidden="true" />}
      <div className="district-overlay" aria-label="Игровые районы">
        {districts.map((district) => <button className={`octagon-district ${district.id === selectedDistrictId ? 'selected' : ''}`} key={district.id} onClick={() => onSelect(district.id)} style={district.position} type="button"><span>{district.name}</span><strong>{district.score}</strong></button>)}
      </div>
      <div className={`map-source ${mapState}`}>{mapState === 'ready' ? '2GIS · Астана' : mapState === 'loading' ? 'Загрузка карты' : 'Демо-карта'}</div>
    </div>
  )
}
