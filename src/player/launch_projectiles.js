import { setInterval } from 'timers/promises'
import { on } from 'events'

import UUID from 'uuid-1345'
import minecraftData from 'minecraft-data'
import { aiter } from 'iterator-helper'
import combineAsyncIterators from 'combine-async-iterators'

import { VERSION } from '../settings.js'
import { direction_to_yaw_pitch, to_direction } from '../math.js'
import { PlayerAction, PlayerEvent } from '../events.js'
import Entities from '../../data/entities.json' assert { type: 'json' }
import { abortable } from '../iterator.js'


const mcData = minecraftData(VERSION)

// Arrow entity
const ARROW_AMOUNT = 10
let ARROW_CURSOR = 0
const ARROW_TTL = 1200

// Mobs entities
const visible_mobs = {}

// Register the arrows in the world entities list
/** @param {import('../context.js').InitialWorld} world */
export function register({ next_entity_id, ...world }) {
  return {
    ...world,
    arrow_start_id: next_entity_id,
    next_entity_id: next_entity_id + ARROW_AMOUNT,
  }
}

// Main function
export default {
  /** @type {import('../context.js').Observer} */
  observe({ client, get_state, signal, dispatch, events, world }) {
    // Detect the collision of the arrow with a block
    // Use the aiter function to iterate over the events
    // Use the PlayerAction.SHOOT_ARROW event to detect the collision
    aiter(
      abortable(
        // @ts-ignore
        combineAsyncIterators(
          on(events, PlayerAction.SHOOT_ARROW, { signal }),
          setInterval(ARROW_TTL / 2, [{ timer: true }], { signal })
        )
      )
    )
      .map(([{ arrow, position, timer }]) => ({ arrow, position, timer }))
      .reduce(
        ({ cursor: last_cursor, ids }, { arrow, position, timer }) => {
          if (timer) {
            // entering here means the iteration is trigered by the interval
            const now = Date.now()
            ids
              .filter(({ age }) => age + ARROW_TTL < now)
              .forEach(({ entity_id }) =>
                client.write('entity_destroy', {
                  entityIds: [entity_id],
                })
              )
            return { cursor: last_cursor, ids }
          }

          const { arrow_start_id } = world
          const cursor = (last_cursor + 1) % ARROW_AMOUNT
          const entity_id = arrow_start_id + cursor
          const { yaw, pitch } = position // From the player
          const { x, y, z } = arrow // From the arrow

          // Set the arrow velocity
          const velocity = {
            x: to_direction(yaw, pitch).x * 10000,
            y: to_direction(yaw, pitch).y * 10000,
            z: to_direction(yaw, pitch).z * 10000,
          }

          // Send the arrow entity to the client
          launch_entity({
            client,
            entity: arrow,
            velocity,
            position: { x, y, z, yaw, pitch },
          })

          return {
            cursor,
            ids: [
              ...ids.slice(0, cursor),
              { entity_id, age: Date.now() },
              ...ids.slice(cursor + 1),
            ],
          }
        },
        {
          cursor: -1,
          ids: Array.from({ length: ARROW_AMOUNT }).fill({
            age: Infinity,
          }),
        }
      )

    client.on('use_item', async ({ position }) => {
      const arrow = {
        // Entity ID is the arrow start ID + the arrow cursor, then increment the arrow cursor
        // The cursor cannot be higher than the arrow amount
        entityId: world.arrow_start_id + (ARROW_CURSOR++ % ARROW_AMOUNT),
        objectUUID: UUID.v4(),
        type: mcData.entitiesByName.arrow.id,
        x: get_state().position.x,
        y: get_state().position.y + 1.5, // Add 1.5 to the player position to make the arrow spawn in the middle of the player
        z: get_state().position.z,
      }
      position = { ...get_state().position }
      events.emit(PlayerAction.SHOOT_ARROW, { arrow, position })
    })

    // Add the mob to the visible mobs list when it enters the view
    events.on(PlayerEvent.MOB_ENTER_VIEW, ({ mob }) => {
      const { category } = Entities[mob?.type] ?? {}
      if (category !== 'npc') visible_mobs[mob.entity_id] = mob
    })

    // Remove the mob from the visible mobs list when it leaves the view
    events.on(PlayerEvent.MOB_LEAVE_VIEW, ({ entity_id }) => {
      if (entity_id in visible_mobs) delete visible_mobs[entity_id]
    })
  },
}

// Launch item function
export function launch_entity({ client, entity, velocity, position }) {
  console.log(entity)

  // Send the entity to the client
  client.write(
    'spawn_entity',
    entity,
    direction_to_yaw_pitch(to_direction(position.yaw, position.pitch))
  )

  // Send the entity velocity to the client
  client.write('entity_velocity', {
    entityId: entity.entityId,
    velocityX: velocity.x,
    velocityY: velocity.y,
    velocityZ: velocity.z,
  })
}
