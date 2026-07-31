import L from 'leaflet'

const CACHE_NAME = 'map-tiles-v1'

// A Leaflet TileLayer that caches every tile it loads in the browser's
// Cache Storage — not cookies (capped at ~4KB total, hopeless for image
// tiles) but the same storage API service workers use, good for hundreds
// of MB and persists across reloads. Once a tile has been seen, it keeps
// rendering from cache even if the network request for it fails later — a
// driver briefly losing signal mid-route no longer sees a blank grey map,
// since tiles for anywhere they've already driven replay instantly from
// cache instead of trying (and failing) to hit the network again.
export const CachedTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const tile = document.createElement('img')
    const url = this.getTileUrl(coords)

    L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile))
    L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile))
    if (this.options.crossOrigin || this.options.crossOrigin === '') {
      tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin
    }
    tile.alt = ''

    if (!('caches' in window)) {
      // Old/unusual browser without Cache Storage — fall back to a normal
      // direct load. No offline benefit, but not broken either.
      tile.src = url
      return tile
    }

    caches.open(CACHE_NAME).then((cache) => {
      cache.match(url).then((cachedResponse) => {
        if (cachedResponse) {
          cachedResponse.blob().then((blob) => {
            tile.src = URL.createObjectURL(blob)
          })
          return
        }
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error('Tile fetch failed')
            cache.put(url, res.clone())
            return res.blob()
          })
          .then((blob) => {
            tile.src = URL.createObjectURL(blob)
          })
          .catch(() => {
            // Not cached yet and the network request just failed (signal
            // drop) — nothing to show for this one specific tile, but every
            // tile already cached from earlier in the drive still renders.
          })
      })
    })

    return tile
  },
})

export function cachedTileLayer(url, options) {
  return new CachedTileLayer(url, options)
}
