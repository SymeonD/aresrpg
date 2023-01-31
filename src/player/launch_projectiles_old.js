import UUID from 'uuid-1345'
import minecraftData from 'minecraft-data'

import { VERSION } from '../settings.js'
import { to_metadata } from '../entity_metadata.js'
import { direction_to_yaw_pitch, to_direction, distance3d_squared } from '../math.js'
import { PlayerAction, PlayerEvent, MobAction } from '../events.js'
import Items from '../../data/items.json' assert { type: 'json' }
import logger from '../logger.js'
import combineAsyncIterators from 'combine-async-iterators'

import { get_block } from '../chunk.js'
import { setInterval as interval} from 'timers/promises'

import Entities from '../../data/entities.json' assert { type: 'json' }
import { aiter } from 'iterator-helper'
import { abortable } from '../iterator.js'
import { on } from 'events'

const mcData = minecraftData(VERSION)
const log = logger(import.meta)

const ARROW_AMOUNT = 50
let START_ARROW_ID = 0;
let CURRENT_ARROW_ID = 0;
const ARROW_LIFE_TIME = 3000
const visible_mobs = {}
const HOTBAR_OFFSET = 36
const Hand = {
  MAINHAND: 0,
}

/** @param {import('../context.js').InitialWorld} world */
export function register({ next_entity_id, ...world }) {

  START_ARROW_ID = next_entity_id;
  CURRENT_ARROW_ID = next_entity_id;

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

const launchable = {
  arrow: {
    entityId: null,
    type: mcData.entitiesByName.arrow.id,
    position: { x: 0, y: 0, z: 0 },
    metadata_values: to_metadata('arrow', {
      // color: 0,
      abstract_arrow_flags: {
        is_critical: true,
      },
      entity_flags: {
        has_glowing_effect: true,
      },
      custom_name: JSON.stringify({ text: 'Arrow', color: 'white' }),
      is_custom_name_visible: true,
    }),
  },
}

function launch_item(client, { x, y, z }, yaw, pitch, launchable_item, get_state, world) {

  // pass a launchable item to this function
  const { type, metadata_values } = launchable_item

  console.log((CURRENT_ARROW_ID + 1) - ARROW_AMOUNT < START_ARROW_ID);
  console.log(START_ARROW_ID);
  console.log(ARROW_AMOUNT);

  // Set the entity id
  CURRENT_ARROW_ID = (CURRENT_ARROW_ID + 1) - ARROW_AMOUNT < START_ARROW_ID ? CURRENT_ARROW_ID + 1 : START_ARROW_ID
  const entityId = CURRENT_ARROW_ID

  // https://minecraft-data.prismarine.js.org/?d=protocol&v=1.16.4#toClient_spawn_entity
  const arrow = {
    entityId,
    objectUUID: UUID.v4(),
    type,
    position: { x, y, z },
    objectData: {
      // Not existing for now
      owner_id: get_state().entity_id,
    },
  }

  // https://wiki.vg/Entity_metadata#Entity
  const metadata = {
    entityId,
    metadata: metadata_values,
  }

  // Multiply the direction by the speed
  const speed = 10000 // TODO: Find optimal value
  const direction = to_direction(yaw, pitch)
  const velocity = {
    entityId,
    velocityX: direction.x * speed,
    velocityY: direction.y * speed,
    velocityZ: direction.z * speed,
  }

  client.write('spawn_entity', {
    entityId: 6450,
    objectUUID: UUID.v4(),
    type: 2,
    position: { x: 0, y: 0, z: 0 },
    yaw: yaw,
    pitch: pitch,
    objectData: {
      // Not existing for now
      owner_id: get_state().entity_id,
    },
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
  })
  console.log(arrow)
  // client.write('entity_metadata', metadata)
  // console.log(metadata)
  // client.write('entity_velocity', velocity)
  // console.log(velocity)
}

// export default {
//   /** @type {import('../context.js').Observer} */
//   observe({ client, events, get_state, world, signal }) {
//     aiter(
//       abortable(
//         // @ts-ignore
//         combineAsyncIterators(
//           on(events, PlayerAction.SHOOT_ARROW, { signal }),
//           interval(ARROW_LIFE_TIME / 2, [{ timer: true }], { signal })
//         )
//       )
//     )
//       .map(([{sender, position, velocity, timer}]) => ({sender, position, velocity, timer}))
//       .reduce(
//         ({ cursor: last_cursor, ids }, { sender, position, velocity, timer }) => {
//           if (timer) {
//             // entering here means the iteration is trigered by the interval
//             const now = Date.now()
//             ids
//               .filter(({ age }) => age + ARROW_LIFE_TIME < now)
//               .forEach(({ entity_id }) =>
//                 client.write('entity_destroy', {
//                   entityIds: [entity_id],
//                 })
//               )
//             return { cursor: last_cursor, ids }
//           }

//           let wall_predict = {x: 0, y: 0, z: 0}
//           get_path_collision(world, position, velocity, 60).then((result) => {wall_predict = result})
//           const { arrow_start_id } = world
//           const delta = 0.05
//           const cursor = (last_cursor + 1) % ARROW_AMOUNT

//           // const arrow = launchable.arrow
//           // const { x, y, z, yaw, pitch } = get_state().position // Get player position
//           // launch_item(client, { x, y, z }, yaw, pitch, arrow, get_state, world) //Launch the arrow

//           const arrow = {
//             entityId: arrow_start_id + cursor,
//             objectUUID: UUID.v4(),
//             objectData: sender.ids,
//             damage: 5,
//             position
//           }
//           client.write('spawn_entity', {
//             ...arrow,
//             type: 2,
//             ...position,
//           })
//           client.write('entity_velocity', {
//             entityId: arrow.entityId,
//             velocityX: velocity.x,
//             velocityY: velocity.y,
//             velocityZ: velocity.z,
//             })

//           let t = 0
//           const interval = setInterval(() => {
//             const step = Math.round(t/delta)
//             if (t > ARROW_LIFE_TIME/1000) {
//               clearInterval(interval)
//             } else {
//               // Get the position of the arrow
//               const cur_pos = {
//                 ...arrow.position,
//                 ...get_pos(arrow.position, velocity, step)
//               }
//               // Get the block the arrow is in
//               const dif = {
//                 x: arrow.position.x - cur_pos.x,
//                 y: arrow.position.y - cur_pos.y,
//                 z: arrow.position.z - cur_pos.z
//               }
//               if ( Math.abs(wall_predict.x)-1 <= Math.abs(dif.x) // Change to -0.3 to stuck arrow in the walls
//                 && Math.abs(wall_predict.y)-1 <= Math.abs(dif.y)
//                 && Math.abs(wall_predict.z)-1 <= Math.abs(dif.z)
//               ) {
//                 log.info(cur_pos, "step")
//                 client.write('spawn_entity', {
//                   ...arrow,
//                   type: 2,
//                   ...position,
//                 })
//                 client.write('entity_velocity', {
//                   entityId: arrow.entityId,
//                   velocityX: velocity.x,
//                   velocityY: velocity.y,
//                   velocityZ: velocity.z,
//                   })
//                 clearInterval(interval)
//                 return
//               }

//               // Hit detection
//               Object.values(visible_mobs).forEach((mob) => {
//                 if (mob.health === 0) return 
//                 const mob_pos = mob.position()
//                 const dist = distance3d_squared(cur_pos, mob_pos)
//                 if (dist < 1) {
//                   mob.dispatch(MobAction.DEAL_DAMAGE, {
//                     damage: arrow.damage,
//                     damager: sender.uuid,
//                   })
//                   client.write('entity_destroy', {
//                     entityIds: [arrow.entityId],
//                   })
//                   clearInterval(interval)
//                 }
//               })
//               client.write('rel_entity_move', {
//                 entityId: arrow.entityId,
//                 dX: velocity.x,
//                 dY: velocity.y, //Math.max(-32768, velocity.y-(98*step)),
//                 dZ: velocity.z,
//                 onGround: false
//               })
//               client.write('entity_velocity', {
//                 entityId: arrow.entityId,
//                 velocityX: 0,
//                 velocityY: 0,
//                 velocityZ: 0,
//               })
//               client.write('entity_velocity', {
//                 entityId: arrow.entityId,
//                 velocityX: velocity.x,
//                 velocityY: velocity.y, //Math.max(-32768, velocity.y-(98*step)),
//                 velocityZ: velocity.z,
//               })
//             }
//             t += delta
//           }, 50)

//           return {
//             cursor,
//             ids: [
//               ...ids.slice(0, cursor),
//               { entity_id: arrow.entityId, age: Date.now() },
//               ...ids.slice(cursor + 1),
//             ],
//           }
//         },
//         {
//           cursor: -1,
//           ids: Array.from({ length: ARROW_AMOUNT }).fill({
//             age: Infinity,
//           }),
//         }
//       )

//     events.on(PlayerEvent.MOB_ENTER_VIEW, ({ mob }) => {
//       const { category } = Entities[mob?.type] ?? {}
//       if (category !== 'npc')
//         visible_mobs[mob.entity_id] = mob
//     })

//     events.on(PlayerEvent.MOB_LEAVE_VIEW, ({ entity_id }) => {
//       if (entity_id in visible_mobs)
//         delete visible_mobs[entity_id]
//     })

//     client.on('use_item', ({ hand }) => {
//       if (hand === Hand.MAINHAND) {
//         const { inventory, held_slot_index, position } = get_state()
//         const slot_number = held_slot_index + HOTBAR_OFFSET
//         const item = inventory[slot_number]
//         const state = get_state()
//         if (item && state.health > 0) {
//           const { type } = item
//           const itemData = Items[type]
//           if (itemData.type === 'bow') {
//             const direction = to_direction(position.yaw, position.pitch)
//             const pos = {...position, y: position.y+1}
//             const velocity = { x: direction.x*6000, y: direction.y*4000, z: direction.z*6000 }
//             events.emit(PlayerAction.SHOOT_ARROW, {sender: client, position: pos, velocity})
//           }
//         }
//       }
//     })
//   }
// }


export default {
  /** @type {import('../context').Observer} */
  observe({ client, world, get_state, events }) {
    //Launch an arrow when the player right click
    client.on('use_item', ({ hand }) => {
      // Get the item in the player's hand
      const item = get_state().inventory[get_state().held_slot_index + 36]

      // Get the player's position
      const { x, y, z, yaw, pitch } = get_state().position

      // If the item is a bow, launch an arrow
      if (item && item.type.includes('bow')) {
        const { arrow } = launchable

        launch_item(client, { x, y, z }, yaw, pitch, arrow, get_state, world) // Shoot the arrow

        //TODO: Make the player "use" the bow to enable the cooldown
        client.write('set_cooldown', {
          itemID: mcData.itemsByName.bow.id, //https://minecraft-data.prismarine.js.org/?v=1.16.4&d=items
          cooldownTicks: 20,
          })

        // client.write('entity_status', {
        //   entityId: get_state().entity_id,
        //   entityStatus: 9,
        // })
      }
    })

    client.on('block_dig', (params) => {
        console.log(params, 'params')
        if (params.status === PlayerAction.SHOOT_ARROW) {
            console.log("Shoot arrow")
            // const item = get_state().inventory[get_state().held_slot_index + 36]

            const { x, y, z, yaw, pitch } = get_state().position
            const { arrow } = launchable
            launch_item(client, { x, y, z }, yaw, pitch, arrow, get_state, world) // Shoot the arrow

            // // Get the player's position
            // const { x, y, z, yaw, pitch } = get_state().position
            // if (item && items[item.type] && items[item.type].item === 'bow') {
            //     const { arrow } = launchable

            //     launch_item(client, { x, y, z }, yaw, pitch, arrow) // Shoot the arrow
            // }
        }
    })

    // // Run and or jump
    // client.on('entity_action', ({ entityId, actionId, jumpBoost }) => {
    //   console.log(entityId, actionId, jumpBoost)
    // })

    events.on(PlayerEvent.MOB_ENTER_VIEW, ({ mob }) => {
      const { category } = Entities[mob?.type] ?? {}
      if (category !== 'npc')
        visible_mobs[mob.entity_id] = mob
    })

    events.on(PlayerEvent.MOB_LEAVE_VIEW, ({ entity_id }) => {
      if (entity_id in visible_mobs)
        delete visible_mobs[entity_id]
    })
  },
}
