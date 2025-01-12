import UUID from 'uuid-1345'
import { abortable } from '../iterator.js'
import { setInterval as interval} from 'timers/promises'
import { on } from 'events'
import { aiter } from 'iterator-helper'
import combineAsyncIterators from 'combine-async-iterators'
import Items from '../../data/items.json' assert { type: 'json' }
// Re Import what was needed from context
import { MobAction } from '../events.js'
import { direction_to_yaw_pitch, distance3d_squared, to_direction } from '../math.js'
import logger from '../logger.js'
import Entities from '../../data/entities.json' assert { type: 'json' }
import { get_block } from '../chunk.js'

const log = logger(import.meta)
const visible_mobs = {}

const HOTBAR_OFFSET = 36
const Hand = {
  MAINHAND: 0,
}

const ARROW_AMOUNT = 50
const ARROW_LIFE_TIME = 3000

/** @param {import('../context.js').InitialWorld} world */
export function register({ next_entity_id, ...world }) {
  return {
    ...world,
    arrow_start_id: next_entity_id,
    next_entity_id: next_entity_id + ARROW_AMOUNT,
  }
}

function get_pos(origin, velocity, step) { // TODO: add gravity that sync with client
  return {
    x: origin.x+(velocity.x/8000)*(step),
    y: origin.y+(velocity.y/8000)*(step), // (Math.max(-32768, velocity.y-(98*step))/8000)*(step),
    z: origin.z+(velocity.z/8000)*(step),
  }
}

async function get_path_collision(world, position, velocity, steps) {
  for (let id = 1; id < steps; id++) {
    // velocity.y = Math.max(-32768, velocity.y-98)
    const pos = {...position, ...get_pos(position, velocity, id)}

    log.info(pos, "pre pos")
    const block = await get_block(world, pos)
    if (block.boundingBox === 'block') {
      return {x: pos.x - position.x, y: pos.y - position.y, z: pos.z - position.z}
    }
  }
  return {x: 255, y: 255, z: 255}
}

export default {

  observe({ client, get_state, signal, dispatch, events, world }) {
  }

  // /** @type {import('../context.js').Observer} */
  // observe({ client, get_state, signal, dispatch, events, world }) {
  //   aiter(
  //     abortable(
  //       // @ts-ignore
  //       combineAsyncIterators(
  //         on(events, Context.SHOOT, { signal }),
  //         interval(ARROW_LIFE_TIME / 2, [{ timer: true }], { signal })
  //       )
  //     )
  //   )
  //     .map(([{sender, position, velocity, timer}]) => ({sender, position, velocity, timer}))
  //     .reduce(
  //       ({ cursor: last_cursor, ids }, { sender, position, velocity, timer }) => {
  //         if (timer) {
  //           // entering here means the iteration is trigered by the interval
  //           const now = Date.now()
  //           ids
  //             .filter(({ age }) => age + ARROW_LIFE_TIME < now)
  //             .forEach(({ entity_id }) =>
  //               client.write('entity_destroy', {
  //                 entityIds: [entity_id],
  //               })
  //             )
  //           return { cursor: last_cursor, ids }
  //         }

  //         let wall_predict = {x: 0, y: 0, z: 0}
  //         get_path_collision(world, position, velocity, 60).then((result) => {wall_predict = result})
  //         const { arrow_start_id } = world
  //         const delta = 0.05
  //         const cursor = (last_cursor + 1) % ARROW_AMOUNT
  //         const arrow = {
  //           entityId: arrow_start_id + cursor,
  //           objectUUID: UUID.v4(),
  //           objectData: sender.ids,
  //           damage: 5,
  //           position
  //         }
  //         client.write('spawn_entity', {
  //           ...arrow,
  //           type: 2,
  //           ...position,
  //           ...direction_to_yaw_pitch(to_direction(position.yaw, position.pitch)),
  //           velocityX: velocity.x,
  //           velocityY: velocity.y,
  //           velocityZ: velocity.z,
  //         })
  //         let t = 0
  //         const interval = setInterval(() => {
  //           const step = Math.round(t/delta)
  //           if (t > ARROW_LIFE_TIME/1000) {
  //             clearInterval(interval)
  //           } else {
  //             const cur_pos = {
  //               ...arrow.position,
  //               ...get_pos(arrow.position, velocity, step)
  //             }
  //             const dif = {
  //               x: arrow.position.x - cur_pos.x,
  //               y: arrow.position.y - cur_pos.y,
  //               z: arrow.position.z - cur_pos.z
  //             }
  //             if ( Math.abs(wall_predict.x)-1 <= Math.abs(dif.x) // Change to -0.3 to stuck arrow in the walls
  //               && Math.abs(wall_predict.y)-1 <= Math.abs(dif.y)
  //               && Math.abs(wall_predict.z)-1 <= Math.abs(dif.z)
  //             ) {
  //               log.info(cur_pos, "step")
  //               client.write('spawn_entity', {
  //                 ...arrow,
  //                 type: 2,
  //                 ...cur_pos,
  //                 ...direction_to_yaw_pitch(to_direction(position.yaw, position.pitch)),
  //                 velocityX: velocity.x,
  //                 velocityY: velocity.y,
  //                 velocityZ: velocity.z,
  //               })
  //               clearInterval(interval)
  //               return
  //             }
  //             Object.values(visible_mobs).forEach((mob) => {
  //               if (mob.health === 0) return 
  //               const mob_pos = mob.position()
  //               const dist = distance3d_squared(cur_pos, mob_pos)
  //               if (dist < 1) {
  //                 mob.dispatch(MobAction.DEAL_DAMAGE, {
  //                   damage: arrow.damage,
  //                   damager: sender.uuid,
  //                 })
  //                 client.write('entity_destroy', {
  //                   entityIds: [arrow.entityId],
  //                 })
  //                 clearInterval(interval)
  //               }
  //             })
  //             client.write('rel_entity_move', {
  //               entityId: arrow.entityId,
  //               dX: velocity.x,
  //               dY: velocity.y, //Math.max(-32768, velocity.y-(98*step)),
  //               dZ: velocity.z,
  //               onGround: false
  //             })
  //             client.write('entity_velocity', {
  //               entityId: arrow.entityId,
  //               velocityX: 0,
  //               velocityY: 0,
  //               velocityZ: 0,
  //             })
  //             client.write('entity_velocity', {
  //               entityId: arrow.entityId,
  //               velocityX: velocity.x,
  //               velocityY: velocity.y, //Math.max(-32768, velocity.y-(98*step)),
  //               velocityZ: velocity.z,
  //             })
  //           }
  //           t += delta
  //         }, 50)
  //         return {
  //           cursor,
  //           ids: [
  //             ...ids.slice(0, cursor),
  //             { entity_id: arrow.entityId, age: Date.now() },
  //             ...ids.slice(cursor + 1),
  //           ],
  //         }
  //       },
  //       {
  //         cursor: -1,
  //         ids: Array.from({ length: ARROW_AMOUNT }).fill({
  //           age: Infinity,
  //         }),
  //       }
  //     )

  //   events.on(Context.MOB_SPAWNED, ({ mob }) => {
  //     const { category } = Entities[mob?.type] ?? {}
  //     if (category !== 'npc')
  //       visible_mobs[mob.entity_id] = mob
  //   })
  //   events.on(Context.MOB_DESPAWNED, ({ entity_id }) => {
  //     if (entity_id in visible_mobs)
  //       delete visible_mobs[entity_id]
  //   })

  //   client.on('use_item', ({ hand }) => {
  //     if (hand === Hand.MAINHAND) {
  //       const { inventory, held_slot_index, position } = get_state()
  //       const slot_number = held_slot_index + HOTBAR_OFFSET
  //       const item = inventory[slot_number]
  //       const state = get_state()
  //       if (item && state.health > 0) {
  //         const { type } = item
  //         const itemData = Items[type]
  //         if (itemData.type === 'weapon' && itemData.item === 'bow') {
  //           const direction = to_direction(position.yaw, position.pitch)
  //           const pos = {...position, y: position.y+1}
  //           const velocity = { x: direction.x*6000, y: direction.y*4000, z: direction.z*6000 }
  //           events.emit(Context.SHOOT, {sender: client, position: pos, velocity})
  //         }
  //       }
  //     }
  //   }
  // )}
}