import UUID from 'uuid-1345'
import minecraftData from 'minecraft-data'

import { VERSION } from '../settings.js'
import { direction_to_yaw_pitch, to_direction } from '../math.js'

const mcData = minecraftData(VERSION)

// Arrow entity
const ARROW_AMOUNT = 10

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
    client.on(
      'use_item',
      async ({ position, face, cursor_position, inside_block }) => {
        // Get the player position
        const { x, y, z, yaw, pitch } = get_state().position

        const velocity = {
          x: to_direction(yaw, pitch).x * 10000,
          y: to_direction(yaw, pitch).y * 10000,
          z: to_direction(yaw, pitch).z * 10000,
        }

        // Create the arrow entity
        const arrow = {
          entityId: world.arrow_start_id,
          objectUUID: UUID.v4(),
          type: mcData.entitiesByName.arrow.id,
          x,
          y: y + 1.5, // Add 1.5 to the player position to make the arrow spawn in the middle of the player
          z,
        }

        // Send the arrow entity to the client
        try {
          launch_entity({
            client,
            entity: arrow,
            velocity,
            position: { yaw, pitch },
          })
        } catch (err) {
          console.log(err)
        }
      }
    )
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
