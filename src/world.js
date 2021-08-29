import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import mobs from '../world/floor1/mobs.json'
import items from '../world/floor1/items.json'
import traders from '../world/floor1/traders.json'
import teleportation_stones from '../world/floor1/teleportation_stones.json'

import logger from './logger.js'
import { chunks } from './chunk.js'

const log = logger(import.meta)

const world_folder = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'world'
)

export const floor1 = {
  spawn_position: { x: 469.5, y: 162, z: 646.5, yaw: 25, pitch: 0 },
  chunks: chunks(join(world_folder, 'floor1', 'region')),
  mobs,
  items,
  traders,
  teleportation_stones,
}

log.trace(
  {
    world: 'floor1',
    mobs: floor1.mobs.length,
    items: Object.entries(floor1.items).length,
  },
  'World loaded'
)
