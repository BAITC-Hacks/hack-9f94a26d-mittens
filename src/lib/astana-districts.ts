import { parse } from 'wellknown'
import polygonClipping from 'polygon-clipping'
import type { MultiPolygon } from 'polygon-clipping'

// Five playable regions. In this scenario Almaty includes Saraishyk's territory.
// The first catalog entry supplies the single label anchor for each game region.
export const districtCatalogIds: Record<string, string[]> = {
  saryarka: ['70030076297673516'],
  almaty: ['9570759093518343', '70030076987083136'],
  yesil: ['9570759093518340'],
  baikonyr: ['70030076172372592'],
  nura: ['70030076552180178'],
}

export type DistrictBoundary = { id: string; center: number[]; polygons: MultiPolygon }
type CatalogResponse = {
  meta?: { code: number }
  result?: { items?: { id: string; geometry?: { centroid?: string; selection?: string } }[] }
}

export async function loadDistrictBoundaries(key: string, signal: AbortSignal): Promise<DistrictBoundary[]> {
  const url = new URL('https://catalog.api.2gis.com/3.0/items')
  url.search = new URLSearchParams({
    city_id: '9570771978420226', type: 'adm_div.district', page_size: '10',
    fields: 'items.geometry.centroid,items.geometry.selection', key,
  }).toString()
  const response = await fetch(url, { signal }).catch(() => {
    throw new Error('Не удалось загрузить границы районов. Проверьте соединение и повторите попытку.')
  })
  if (!response.ok) throw new Error('Не удалось загрузить границы районов из 2ГИС.')
  const data = await response.json() as CatalogResponse
  // Catalog can return an API error inside an HTTP 200 response.
  if (data.meta?.code !== 200) throw new Error('Границы недоступны. Проверьте доступ ключа к Places API 2ГИС.')

  const readGeometry = (catalogId: string) => {
    const item = data.result?.items?.find((entry) => entry.id === catalogId)
    const geometry = item?.geometry?.selection ? parse(item.geometry.selection) : null
    const center = item?.geometry?.centroid ? parse(item.geometry.centroid) : null
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type) || center?.type !== 'Point'
      || center.coordinates.length < 2 || !center.coordinates.every(Number.isFinite)) {
      throw new Error('2ГИС вернул неполные границы районов. Попробуйте ещё раз.')
    }
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
    if (!polygons.length || polygons.some((polygon) => !polygon.length || polygon.some((ring) =>
      ring.length < 4 || ring.some((point) => point.length < 2 || !point.every(Number.isFinite))))) {
      throw new Error('Не удалось прочитать геометрию районов 2ГИС.')
    }
    const coordinates: MultiPolygon = polygons.map(polygon => polygon.map(ring => ring.map(point => [point[0], point[1]])))
    return { center: center.coordinates, polygons: coordinates }
  }

  return Object.entries(districtCatalogIds).map(([id, catalogIds]) => {
    const parts = catalogIds.map(readGeometry)
    let polygons = parts[0].polygons
    if (parts.length > 1) {
      try {
        // A geometric union removes the shared edge instead of leaving two
        // adjacent clickable regions. Disconnected parts and holes are retained.
        polygons = polygonClipping.union(polygons, ...parts.slice(1).map(part => part.polygons))
      } catch {
        throw new Error('Не удалось объединить границы Алматы и Сарайшыка. Повторите загрузку карты.')
      }
      if (!polygons.length) throw new Error('2ГИС вернул пустую объединённую границу Алматы.')
    }
    return { id, center: parts[0].center, polygons }
  })
}

export function boundaryBounds(boundaries: DistrictBoundary[]) {
  const points = boundaries.flatMap((boundary) => boundary.polygons.flat(2))
  return {
    southWest: [Math.min(...points.map((point) => point[0])), Math.min(...points.map((point) => point[1]))],
    northEast: [Math.max(...points.map((point) => point[0])), Math.max(...points.map((point) => point[1]))],
  }
}
