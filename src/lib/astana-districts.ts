import { parse } from 'wellknown'

// Catalog IDs keep game state independent of localized district names.
export const districtCatalogIds: Record<string, string> = {
  saryarka: '70030076297673516',
  almaty: '9570759093518343',
  yesil: '9570759093518340',
  baikonyr: '70030076172372592',
  nura: '70030076552180178',
  saraishyk: '70030076987083136',
}

export type DistrictBoundary = { id: string; center: number[]; polygons: number[][][][] }
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

  return Object.entries(districtCatalogIds).map(([id, catalogId]) => {
    const item = data.result?.items?.find((entry) => entry.id === catalogId)
    const geometry = item?.geometry?.selection ? parse(item.geometry.selection) : null
    const center = item?.geometry?.centroid ? parse(item.geometry.centroid) : null
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type) || center?.type !== 'Point') {
      throw new Error('2ГИС вернул неполные границы районов. Попробуйте ещё раз.')
    }
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
    if (!polygons.length || polygons.some((polygon) => !polygon.length || polygon.some((ring) =>
      ring.length < 4 || ring.some((point) => point.length < 2 || !point.every(Number.isFinite))))) {
      throw new Error('Не удалось прочитать геометрию районов 2ГИС.')
    }
    return { id, center: center.coordinates, polygons }
  })
}

export function boundaryBounds(boundaries: DistrictBoundary[]) {
  const points = boundaries.flatMap((boundary) => boundary.polygons.flat(2))
  return {
    southWest: [Math.min(...points.map((point) => point[0])), Math.min(...points.map((point) => point[1]))],
    northEast: [Math.max(...points.map((point) => point[0])), Math.max(...points.map((point) => point[1]))],
  }
}
