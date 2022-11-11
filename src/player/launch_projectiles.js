import UUID from 'uuid-1345'
import minecraftData from 'minecraft-data'

import { VERSION } from '../settings.js'
import { to_metadata } from '../entity_metadata.js'
import { to_direction } from '../math.js'
import items from '../../data/items.json' assert { type: 'json' }

const mcData = minecraftData(VERSION)

const launchable = {
  arrow: {
    entityId: null,
    type: mcData.entitiesByName.arrow.id,
    metadata_values: to_metadata('arrow', {
      // color: 0,
      abstract_arrow_flags: {
        is_critical: true,
      },
      entity_flags: {
        // has_glowing_effect: true,
      },
      // custom_name: JSON.stringify({ text: 'Arrow', color: 'white' }),
      // is_custom_name_visible: true,
    }),
    LeftOwner: true,
  },
}

function launch_item(client, { x, y, z }, yaw, pitch, launchable) {
  const { entityId, type, metadata_values } = launchable
  // https://minecraft-data.prismarine.js.org/?d=protocol&v=1.16.4#toClient_spawn_entity
  const arrow = {
    entityId,
    objectUUID: UUID.v4(),
    type,
    x,
    y: y + 1.5,
    z,
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

  client.write('spawn_entity', arrow)
  client.write('entity_metadata', metadata)
  client.write('entity_velocity', velocity)
  client.write('entity_status', {
    entityId,
    entityStatus: 1,
  })
}

/** @param {import('../context.js').InitialWorld} world */
export function register(world) {
  const { next_entity_id } = world
  launchable.arrow.entityId = next_entity_id + 1
  return {
    ...world,
    next_entity_id: next_entity_id + Object.keys(launchable).length,
  }
}

export default {
  /** @type {import('../context').Observer} */
  observe({ client, get_state }) {
    // Launch an arrow when the player right click
    client.on('use_item', ({ hand }) => {
      // Get the item in the player's hand
      const item = get_state().inventory[get_state().held_slot_index + 36]

      // Get the player's position
      const { x, y, z, yaw, pitch } = get_state().position
      if (item && items[item.type] && items[item.type].item === 'bow') {
        const { arrow } = launchable

        launch_item(client, { x, y, z }, yaw, pitch, arrow) // Shoot the arrow
      }
    })
  },
}
