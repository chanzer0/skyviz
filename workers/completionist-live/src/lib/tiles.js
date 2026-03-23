export function buildSeedTiles(degrees) {
  const tiles = [];
  for (let south = -90.0; south < 90.0; south += degrees) {
    const north = Math.min(90.0, south + degrees);
    for (let west = -180.0; west < 180.0; west += degrees) {
      const east = Math.min(180.0, west + degrees);
      tiles.push({ south, north, west, east });
    }
  }
  return tiles;
}

export function tileSpan(tile) {
  return Math.max(tile.north - tile.south, tile.east - tile.west);
}

export function canSplitTile(tile, minTileDegrees) {
  return (tileSpan(tile) / 2.0) >= minTileDegrees;
}

export function splitTile(tile) {
  const midLat = (tile.south + tile.north) / 2.0;
  const midLon = (tile.west + tile.east) / 2.0;
  return [
    { south: midLat, north: tile.north, west: tile.west, east: midLon },
    { south: midLat, north: tile.north, west: midLon, east: tile.east },
    { south: tile.south, north: midLat, west: tile.west, east: midLon },
    { south: tile.south, north: midLat, west: midLon, east: tile.east },
  ];
}

export function formatBounds(tile) {
  return `${tile.north},${tile.south},${tile.west},${tile.east}`;
}

function encodeCoordinatePart(value) {
  return value.toFixed(4).replace(/-/g, 'm').replace(/\./g, 'p');
}

export function buildTileKey(tile) {
  return [
    'n', encodeCoordinatePart(tile.north),
    '_s', encodeCoordinatePart(tile.south),
    '_w', encodeCoordinatePart(tile.west),
    '_e', encodeCoordinatePart(tile.east),
  ].join('');
}

export function normalizeTile(rawTile) {
  if (!rawTile || typeof rawTile !== 'object') {
    return null;
  }
  const north = Number(rawTile.north);
  const south = Number(rawTile.south);
  const west = Number(rawTile.west);
  const east = Number(rawTile.east);
  if (
    !Number.isFinite(north)
    || !Number.isFinite(south)
    || !Number.isFinite(west)
    || !Number.isFinite(east)
  ) {
    return null;
  }
  return { north, south, west, east };
}

export function buildTileMessage(runId, tile) {
  return { runId, tile };
}
