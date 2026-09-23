import type { Map as MapInstance } from '@2gis/mapgl/types'

// Layer IDs belong to this published 2GIS style. Custom published styles bypass
// these overrides. Roads, water, parks, buildings and labels keep their order.
export const BASE_MAP_STYLE = 'c080bb6a-8134-4993-93a1-5b4d8c36a59b'

const neutralLandLayers: { originalId: string; property: string; value: string; color: string; minzoom?: number }[] = [
  { originalId: '726018', property: 'sublayer', value: 'Country_area', color: '#f7f9fc' },
  { originalId: '740420', property: 'sublayer', value: 'Country_2gis_area', color: '#f7f9fc' },
  { originalId: 'background', property: 'db_sublayer', value: 'Region', color: '#f7f9fc', minzoom: 9 },
  { originalId: 'substrate', property: 'sublayer', value: 'Substrate', color: '#f0f3f6' },
  { originalId: '904990', property: 'db_sublayer', value: 'Dwelling_quarter', color: '#edf1f5' },
  { originalId: '523344', property: 'sublayer', value: 'Manual_generalization_quarter', color: '#f7f9fc' },
]

export function applyLightMapStyle(map: Pick<MapInstance, 'hasLayer' | 'addLayer' | 'removeLayer'>) {
  for (const { originalId, property, value, color, minzoom } of neutralLandLayers) {
    const id = 'astana-light-' + originalId
    if (!map.hasLayer(originalId) || map.hasLayer(id)) continue
    const layer: Parameters<MapInstance['addLayer']>[0] = {
      id, type: 'polygon', filter: ['==', ['get', property], value],
      ...(minzoom === undefined ? {} : { minzoom }),
      style: { color, strokeColor: color, strokeWidth: 0 },
    }
    // Insert before removing: a failed insertion leaves the original intact.
    map.addLayer(layer, originalId)
    map.removeLayer(originalId)
  }
}
