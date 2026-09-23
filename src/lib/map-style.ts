import type { Map as MapInstance } from '@2gis/mapgl/types'

// Official 2GIS night style: https://docs.2gis.com/en/mapgl/map-style/create
// Native night colors keep roads, buildings and labels readable without CSS inversion.
export const BASE_MAP_STYLE = 'e05ac437-fcc2-4845-ad74-b1de9ce07555'
export const MAP_BACKGROUND = '#080d12'
export type MapTheme = 'dark' | 'light'
export const LIGHT_MAP_STYLE = 'c080bb6a-8134-4993-93a1-5b4d8c36a59b'
export const mapThemeOptions = (theme: MapTheme) => ({
  style: theme === 'dark' ? BASE_MAP_STYLE : LIGHT_MAP_STYLE,
  defaultBackgroundColor: theme === 'dark' ? MAP_BACKGROUND : '#f7f9fc',
})

// These IDs/filters belong to the night style above. Only darken base land;
// preserve the night palette and ordering of water, parks, roads and buildings.
const darkLandLayers: { originalId: string; value: string; color: string; minzoom?: number }[] = [
  { originalId: '124523', value: 'Country_area', color: MAP_BACKGROUND },
  { originalId: '999833', value: 'Country_2gis_area', color: MAP_BACKGROUND },
  { originalId: 'background', value: 'Region', color: MAP_BACKGROUND, minzoom: 9 },
  { originalId: 'substrate', value: 'Substrate', color: '#111b1c' },
  { originalId: 'kvar_living', value: 'Dwelling_quarter', color: '#0e151b' },
  { originalId: '799287', value: 'Manual_generalization_quarter', color: MAP_BACKGROUND, minzoom: 9 },
]

export function applyDarkMapStyle(map: Pick<MapInstance, 'hasLayer' | 'addLayer' | 'removeLayer'>) {
  for (const { originalId, value, color, minzoom } of darkLandLayers) {
    const id = 'astana-dark-' + originalId
    if (!map.hasLayer(originalId) || map.hasLayer(id)) continue
    const layer: Parameters<MapInstance['addLayer']>[0] = {
      id, type: 'polygon', filter: ['==', ['get', 'sublayer'], value],
      ...(minzoom === undefined ? {} : { minzoom }),
      style: { color, strokeColor: color, strokeWidth: 0 },
    }
    // Insert before removing: a failed insertion leaves the original intact.
    map.addLayer(layer, originalId)
    map.removeLayer(originalId)
  }
}

export function applyLightMapStyle(map: Pick<MapInstance, 'hasLayer' | 'addLayer' | 'removeLayer'>) {
  const layers = [
    ['726018', 'sublayer', 'Country_area', '#f7f9fc'],
    ['740420', 'sublayer', 'Country_2gis_area', '#f7f9fc'],
    ['background', 'db_sublayer', 'Region', '#f7f9fc'],
    ['substrate', 'sublayer', 'Substrate', '#f0f3f6'],
    ['904990', 'db_sublayer', 'Dwelling_quarter', '#edf1f5'],
    ['523344', 'sublayer', 'Manual_generalization_quarter', '#f7f9fc'],
  ]
  for (const [originalId, property, value, color] of layers) {
    const id = 'astana-light-' + originalId
    if (!map.hasLayer(originalId) || map.hasLayer(id)) continue
    map.addLayer({ id, type: 'polygon', filter: ['==', ['get', property], value],
      ...(originalId === 'background' ? { minzoom: 9 } : {}),
      style: { color, strokeColor: color, strokeWidth: 0 },
    }, originalId)
    map.removeLayer(originalId)
  }
}
