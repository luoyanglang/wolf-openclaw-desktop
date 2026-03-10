import { setWallSprites } from './wallTiles'
import { setCharacterTemplates } from './sprites/spriteData'
import { setFloorSprites } from './floorTiles'
import { buildDynamicCatalog } from './layout/furnitureCatalog'
import type { LoadedAssetData } from './layout/furnitureCatalog'
import type { OfficeLayout } from './types'

// Import PNG assets (Vite returns URL strings)
import wallsPngUrl from './assets/walls.png'
import floorsPngUrl from './assets/floors.png'
import char0Url from './assets/characters/char_0.png'
import char1Url from './assets/characters/char_1.png'
import char2Url from './assets/characters/char_2.png'
import char3Url from './assets/characters/char_3.png'
import char4Url from './assets/characters/char_4.png'
import char5Url from './assets/characters/char_5.png'

// Import catalog JSON (Vite resolves at build time)
import catalogJson from './assets/furniture/furniture-catalog.json'

// Import default layout
import defaultLayoutJson from './assets/default-layout.json'

// Vite glob import for all furniture PNGs (eager = resolved at build time)
const furniturePngs = import.meta.glob('./assets/furniture/**/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const PNG_ALPHA_THRESHOLD = 128
const WALL_PIECE_WIDTH = 16
const WALL_PIECE_HEIGHT = 32
const WALL_GRID_COLS = 4
const WALL_BITMASK_COUNT = 16
const CHAR_FRAME_W = 16
const CHAR_FRAME_H = 32
const CHAR_FRAMES_PER_ROW = 7
const CHAR_COUNT = 6
const CHARACTER_DIRECTIONS = ['down', 'up', 'right'] as const
const FLOOR_TILE_SIZE = 16
const FLOOR_PATTERN_COUNT = 7

type SpriteData = string[][]

/** Load an image from URL */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/** Extract pixel data from an image */
function getImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/** Extract a SpriteData from ImageData given origin + dimensions */
function extractSprite(
  imageData: ImageData,
  ox: number,
  oy: number,
  w: number,
  h: number,
): SpriteData {
  const { data, width } = imageData
  const sprite: string[][] = []
  for (let r = 0; r < h; r++) {
    const row: string[] = []
    for (let c = 0; c < w; c++) {
      const idx = ((oy + r) * width + (ox + c)) * 4
      const rv = data[idx],
        gv = data[idx + 1],
        bv = data[idx + 2],
        av = data[idx + 3]
      if (av < PNG_ALPHA_THRESHOLD) {
        row.push('')
      } else {
        row.push(
          `#${rv.toString(16).padStart(2, '0')}${gv.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`.toUpperCase(),
        )
      }
    }
    sprite.push(row)
  }
  return sprite
}

/** Parse walls.png (64×128) into 16 SpriteData arrays */
async function loadWalls(): Promise<void> {
  try {
    const img = await loadImage(wallsPngUrl)
    const imageData = getImageData(img)
    const sprites: SpriteData[] = []

    for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
      const ox = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH
      const oy = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT
      sprites.push(extractSprite(imageData, ox, oy, WALL_PIECE_WIDTH, WALL_PIECE_HEIGHT))
    }
    setWallSprites(sprites)
    console.log(`[PixelAgents] ✅ Loaded ${sprites.length} wall sprites from PNG`)
  } catch (err) {
    console.warn('[PixelAgents] Could not load walls.png, using fallback:', err)
  }
}

/** Parse floors.png (112×16) into 7 floor tile SpriteData arrays */
async function loadFloors(): Promise<void> {
  try {
    const img = await loadImage(floorsPngUrl)
    const imageData = getImageData(img)
    const sprites: SpriteData[] = []

    for (let i = 0; i < FLOOR_PATTERN_COUNT; i++) {
      const ox = i * FLOOR_TILE_SIZE
      sprites.push(extractSprite(imageData, ox, 0, FLOOR_TILE_SIZE, FLOOR_TILE_SIZE))
    }
    setFloorSprites(sprites)
    console.log(`[PixelAgents] ✅ Loaded ${sprites.length} floor sprites from PNG`)
  } catch (err) {
    console.warn('[PixelAgents] Could not load floors.png, using fallback:', err)
  }
}

/** Parse char_X.png files (112×96 each) into character data */
async function loadCharacters(): Promise<void> {
  const charUrls = [char0Url, char1Url, char2Url, char3Url, char4Url, char5Url]
  try {
    const characters: Array<{ down: SpriteData[]; up: SpriteData[]; right: SpriteData[] }> = []

    for (let ci = 0; ci < CHAR_COUNT; ci++) {
      const img = await loadImage(charUrls[ci])
      const imageData = getImageData(img)
      const charData: { down: SpriteData[]; up: SpriteData[]; right: SpriteData[] } = {
        down: [],
        up: [],
        right: [],
      }

      for (let dirIdx = 0; dirIdx < CHARACTER_DIRECTIONS.length; dirIdx++) {
        const dir = CHARACTER_DIRECTIONS[dirIdx]
        const rowOffsetY = dirIdx * CHAR_FRAME_H
        const frames: SpriteData[] = []

        for (let f = 0; f < CHAR_FRAMES_PER_ROW; f++) {
          const frameOffsetX = f * CHAR_FRAME_W
          frames.push(extractSprite(imageData, frameOffsetX, rowOffsetY, CHAR_FRAME_W, CHAR_FRAME_H))
        }
        charData[dir] = frames
      }
      characters.push(charData)
    }
    setCharacterTemplates(characters)
    console.log(`[PixelAgents] ✅ Loaded ${characters.length} character sprites from PNG`)
  } catch (err) {
    console.warn('[PixelAgents] Could not load character PNGs, using fallback:', err)
  }
}

/** Raw catalog asset entry as it appears in furniture-catalog.json (includes `file`) */
type RawCatalogAsset = LoadedAssetData['catalog'][number] & { file: string }

/** Load all furniture PNGs and build the dynamic catalog */
async function loadFurniture(): Promise<void> {
  try {
    const assets = (catalogJson as { assets: RawCatalogAsset[] }).assets

    const sprites: Record<string, SpriteData> = {}

    await Promise.all(
      assets.map(async (asset) => {
        // Match glob key: './assets/furniture/decor/PAPER_SIDE.png'
        const globKey = `./assets/${asset.file}`
        const pngUrl = furniturePngs[globKey]
        if (!pngUrl) {
          console.warn(`[PixelAgents] No PNG found for ${asset.id} at ${globKey}`)
          return
        }

        try {
          const img = await loadImage(pngUrl)
          sprites[asset.id] = extractSprite(getImageData(img), 0, 0, img.width, img.height)
        } catch (err) {
          console.warn(`[PixelAgents] Failed to load sprite for ${asset.id}:`, err)
        }
      }),
    )

    const assetData: LoadedAssetData = {
      catalog: assets,
      sprites,
    }

    const ok = buildDynamicCatalog(assetData)
    console.log(
      `[PixelAgents] ✅ Furniture: loaded ${Object.keys(sprites).length}/${assets.length} sprites, catalog built=${ok}`,
    )
  } catch (err) {
    console.warn('[PixelAgents] Could not load furniture assets:', err)
  }
}

let loaded = false
let cachedLayout: OfficeLayout | null = null

/**
 * Load all PNG assets (walls, floors, characters, furniture).
 * Returns the default office layout once assets are ready.
 * Safe to call multiple times — loads only once, returns cached layout.
 */
export async function loadPixelAssets(): Promise<OfficeLayout | null> {
  if (loaded) return cachedLayout
  loaded = true

  await Promise.all([loadWalls(), loadFloors(), loadCharacters(), loadFurniture()])

  cachedLayout = defaultLayoutJson as unknown as OfficeLayout
  return cachedLayout
}

/** Return the default layout synchronously if already loaded, otherwise null. */
export function getDefaultLayout(): OfficeLayout | null {
  return cachedLayout
}
