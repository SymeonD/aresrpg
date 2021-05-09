import { on } from 'events'

import { aiter } from 'iterator-helper'
import vecmath from 'vecmath'

import { chunk_position } from '../chunk.js'
import { empty_slot, item_to_slot } from '../items.js'
import { write_brand } from '../plugin_channels.js'
import { dimension_codec, overworld } from '../world/codec.js'
import { load_chunks } from '../chunk/update.js'
import { PLAYER_ENTITY_ID, PLAYER_INVENTORY_ID } from '../index.js'

import { write_title } from './title.js'
import { set_world_border } from './world_border.js'
import {
  copy_canvas,
  create_screen_canvas,
  spawn_screen,
  update_screen,
} from './screen.js'
import { rainbow_geometry } from './particles/geometries.js'
import {
  mesh,
  render_particles,
  updateTransformMatrix,
} from './particles/particles.js'
import { rainbow_rainbow_material } from './particles/materials.js'

const { Vector3 } = vecmath

export default {
  /** @type {import('../index.js').Observer} */
  observe({ client, events, world }) {
    events.once('state', (state) => {
      const { game_mode, position, inventory, view_distance } = state
      // TODO: move this elsewhere
      const world_names = ['minecraft:overworld']
      // TODO: we should not take the first world of the list
      const [world_name] = world_names

      client.write('login', {
        entityId: PLAYER_ENTITY_ID,
        isHardcore: false,
        gameMode: game_mode,
        previousGameMode: 255,
        worldNames: world_names,
        dimensionCodec: dimension_codec,
        dimension: overworld,
        worldName: world_name,
        hashedSeed: [0, 0],
        maxPlayers: 32,
        viewDistance: view_distance,
        reducedDebugInfo: false,
        enableRespawnScreen: true,
        isDebug: false,
        isFlat: false,
      })

      write_brand(client, { brand: 'AresRPG' })

      client.write('position', {
        ...position,
        flags: 0x00,
        teleportId: 0,
      })

      const chunk = {
        x: chunk_position(position.x),
        z: chunk_position(position.z),
      }

      client.write('update_view_position', {
        chunkX: chunk.x,
        chunkZ: chunk.z,
      })

      set_world_border({ client, x: 510, z: 510, radius: 1020, speed: 1 })

      load_chunks(state, { client, world, events, chunks: [chunk] })

      const to_slot = (item) =>
        item ? item_to_slot(world.items[item.type], item.count) : empty_slot

      client.write('window_items', {
        windowId: PLAYER_INVENTORY_ID,
        items: inventory.map(to_slot),
      })

      write_title(client, {
        subtitle: { text: 'Bienvenue sur' },
        title: { text: 'AresRPG' },
        fadeIn: 2,
        fadeOut: 2,
        stay: 3,
      })

      const screen_pos = {
        ...world.spawn_position,
        y: world.spawn_position.y + 15,
      }
      spawn_screen(
        { client, world },
        {
          screen_id: 'player_screen',
          position: screen_pos,
          direction: { x: 1, y: 0, z: 0 },
        }
      )

      const { canvas } = create_screen_canvas(world.screens.player_screen)

      aiter(on(events, 'screen_interract')).reduce(
        (old_canvas, [{ x, y, screen_id, hand }]) => {
          const new_canvas = copy_canvas(old_canvas)

          const ctx = new_canvas.getContext('2d')
          ctx.font = '30px arial'
          ctx.fillStyle = 'red'
          ctx.fillText('COUCOU', x, y)
          // ctx.beginPath()
          // ctx.ellipse(x, y, 10, 10, 0, 0, Math.PI * 2)
          // ctx.fill()

          update_screen(
            { client, world },
            { screen_id, new_canvas, old_canvas }
          )

          return new_canvas
        },
        canvas
      )

      const particle_pos = {
        ...world.spawn_position,
        y: world.spawn_position.y + 30,
      }

      // const geometry = torus_geometry({
      //   center: { x: 0, y: 0, z: 0 },
      //   radial_segments: 30,
      //   tubular_segments: 100,
      //   radius: 1,
      //   tube: 0.5,
      // })

      // const geometry = cube_geometry({
      //   width: 1,
      //   height: 1,
      //   depth: 1,
      //   depth_segments: 5,
      //   height_segments: 5,
      //   width_segments: 5
      // })

      const geometry = rainbow_geometry({
        min_radius: 3,
        max_radius: 5,
        center: { x: 0, y: 0, z: 0 },
        sides: 60,
      })

      const torus = mesh({
        geometry,
        material: rainbow_rainbow_material({ progress: 1 }),
        position: particle_pos,
        rotation: new Vector3(0, 0, 0),
        scale: new Vector3(2, 2, 2),
      })

      let t = 0
      setInterval(() => {
        t += 0.01
        const final_vertices = []
        updateTransformMatrix(torus)
        torus.material = rainbow_rainbow_material({ progress: t })
        final_vertices.push(
          ...torus.geometry.vertices.map((vertice, index) => ({
            vertice: vertice.clone().transformMat4(torus.transformMatrix),
            properties: torus.material.colorize_vertice(
              torus.geometry,
              vertice,
              index
            ),
          }))
        )
        if (t >= 1) {
          t = 0
          torus.rotation.y += Math.PI
        }
        render_particles(client, final_vertices)
      }, 100)
    })
  },
}
