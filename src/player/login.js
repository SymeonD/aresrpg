import { chunk_position } from '../chunk.js'
import { write_brand } from '../plugin_channels.js'
import { dimension_codec, overworld } from '../world/codec.js'
import { load_chunks } from '../chunk/update.js'
import { PLAYER_ENTITY_ID } from '../settings.js'
import { write_title } from '../title.js'
import { Context } from '../events.js'
import { Formats, world_chat_msg } from '../chat.js'

import { set_world_border } from './world_border.js'

import mdata from 'minecraft-data'
import { VERSION } from '../settings.js'
const mcData = mdata(VERSION)

export default {
  /** @type {import('../context.js').Observer} */
  observe({ client, events, world, signal, dispatch }) {
    events.once(Context.STATE, state => {
      const {
        nickname,
        game_mode,
        position,
        view_distance,
        held_slot_index,
        last_disconnection_time,
      } = state
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
        enableRespawnScreen: false,
        isDebug: false,
        isFlat: false,
      })

      client.write('spawn_position', { location: world.spawn_position })

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

      client.write('held_item_slot', { slot: held_slot_index })

      write_title({
        client,
        subtitle: { text: 'Welcome on AresRPG' },
        times: {
          fadeIn: 2,
          fadeOut: 2,
          stay: 10,
        },
      })

      if (!last_disconnection_time)
        world_chat_msg({
          world,
          client,
          message: [
            { text: nickname, ...Formats.SUCCESS },
            { text: ' just joined ', ...Formats.BASE },
            { text: 'AresRPG', ...Formats.INFO },
            { text: ' for the first time', ...Formats.BASE },
          ],
        })

        client.write('tags', {
          blockTags: [
            { tagName: 'minecraft:climbable', entries: [mcData.blocksByName.ladder.id] },
            { tagName: 'minecraft:enderman_holdable', entries: [] },
            { tagName: 'minecraft:banners', entries: [] },
            { tagName: 'minecraft:soul_fire_base_blocks', entries: [] },
            { tagName: 'minecraft:campfires', entries: [] },
            { tagName: 'minecraft:infiniburn_nether', entries: [] },
            { tagName: 'minecraft:flower_pots', entries: [] },
            { tagName: 'minecraft:infiniburn_overworld', entries: [] },
            { tagName: 'minecraft:wooden_fences', entries: [] },
            { tagName: 'minecraft:piglin_repellents', entries: [] },
            { tagName: 'minecraft:wall_post_override', entries: [] },
            { tagName: 'minecraft:wooden_slabs', entries: [] },
            { tagName: 'minecraft:portals', entries: [] },
            { tagName: 'minecraft:small_flowers', entries: [] },
            { tagName: 'minecraft:bamboo_plantable_on', entries: [] },
            { tagName: 'minecraft:wooden_trapdoors', entries: [] },
            { tagName: 'minecraft:pressure_plates', entries: [] },
            { tagName: 'minecraft:jungle_logs', entries: [] },
            { tagName: 'minecraft:wooden_stairs', entries: [] },
            { tagName: 'minecraft:spruce_logs', entries: [] },
            { tagName: 'minecraft:signs', entries: [] },
            { tagName: 'minecraft:carpets', entries: [] },
            { tagName: 'minecraft:base_stone_overworld', entries: [] },
            { tagName: 'minecraft:wool', entries: [] },
            { tagName: 'minecraft:wooden_buttons', entries: [] },
            { tagName: 'minecraft:stairs', entries: [] },
            { tagName: 'minecraft:wither_summon_base_blocks', entries: [] },
            { tagName: 'minecraft:logs', entries: [] },
            { tagName: 'minecraft:stone_bricks', entries: [] },
            { tagName: 'minecraft:hoglin_repellents', entries: [] },
            { tagName: 'minecraft:fire', entries: [] },
            { tagName: 'minecraft:beehives', entries: [] },
            { tagName: 'minecraft:ice', entries: [] },
            { tagName: 'minecraft:base_stone_nether', entries: [] },
            { tagName: 'minecraft:dragon_immune', entries: [] },
            { tagName: 'minecraft:crops', entries: [] },
            { tagName: 'minecraft:wall_signs', entries: [] },
            { tagName: 'minecraft:slabs', entries: [] },
            { tagName: 'minecraft:valid_spawn', entries: [] },
            { tagName: 'minecraft:mushroom_grow_block', entries: [] },
            { tagName: 'minecraft:guarded_by_piglins', entries: [] },
            { tagName: 'minecraft:wooden_doors', entries: [] },
            { tagName: 'minecraft:warped_stems', entries: [] },
            { tagName: 'minecraft:standing_signs', entries: [] },
            { tagName: 'minecraft:infiniburn_end', entries: [] },
            { tagName: 'minecraft:trapdoors', entries: [] },
            { tagName: 'minecraft:crimson_stems', entries: [] },
            { tagName: 'minecraft:buttons', entries: [] },
            { tagName: 'minecraft:flowers', entries: [] },
            { tagName: 'minecraft:corals', entries: [] },
            { tagName: 'minecraft:prevent_mob_spawning_inside', entries: [] },
            { tagName: 'minecraft:wart_blocks', entries: [] },
            { tagName: 'minecraft:planks', entries: [] },
            { tagName: 'minecraft:soul_speed_blocks', entries: [] },
            { tagName: 'minecraft:dark_oak_logs', entries: [] },
            { tagName: 'minecraft:rails', entries: [] },
            { tagName: 'minecraft:coral_plants', entries: [] },
            { tagName: 'minecraft:non_flammable_wood', entries: [] },
            { tagName: 'minecraft:leaves', entries: [] },
            { tagName: 'minecraft:walls', entries: [] },
            { tagName: 'minecraft:coral_blocks', entries: [] },
            { tagName: 'minecraft:beacon_base_blocks', entries: [] },
            { tagName: 'minecraft:strider_warm_blocks', entries: [] },
            { tagName: 'minecraft:fence_gates', entries: [] },
            { tagName: 'minecraft:bee_growables', entries: [] },
            { tagName: 'minecraft:shulker_boxes', entries: [] },
            { tagName: 'minecraft:wooden_pressure_plates', entries: [] },
            { tagName: 'minecraft:wither_immune', entries: [] },
            { tagName: 'minecraft:acacia_logs', entries: [] },
            { tagName: 'minecraft:anvil', entries: [] },
            { tagName: 'minecraft:birch_logs', entries: [] },
            { tagName: 'minecraft:tall_flowers', entries: [] },
            { tagName: 'minecraft:wall_corals', entries: [] },
            { tagName: 'minecraft:underwater_bonemeals', entries: [] },
            { tagName: 'minecraft:stone_pressure_plates', entries: [] },
            { tagName: 'minecraft:impermeable', entries: [] },
            { tagName: 'minecraft:sand', entries: [] },
            { tagName: 'minecraft:nylium', entries: [] },
            { tagName: 'minecraft:gold_ores', entries: [] },
            { tagName: 'minecraft:logs_that_burn', entries: [] },
            { tagName: 'minecraft:fences', entries: [] },
            { tagName: 'minecraft:saplings', entries: [] },
            { tagName: 'minecraft:beds', entries: [] },
            { tagName: 'minecraft:oak_logs', entries: [] },
            { tagName: 'minecraft:unstable_bottom_center', entries: [] },
            { tagName: 'minecraft:doors', entries: [] }
          ],
          itemTags: [
            { tagName: 'minecraft:banners', entries: [] },
            { tagName: 'minecraft:soul_fire_base_blocks', entries: [] },
            { tagName: 'minecraft:stone_crafting_materials', entries: [] },
            { tagName: 'minecraft:wooden_fences', entries: [] },
            { tagName: 'minecraft:piglin_repellents', entries: [] },
            { tagName: 'minecraft:beacon_payment_items', entries: [] },
            { tagName: 'minecraft:wooden_slabs', entries: [] },
            { tagName: 'minecraft:small_flowers', entries: [] },
            { tagName: 'minecraft:wooden_trapdoors', entries: [] },
            { tagName: 'minecraft:jungle_logs', entries: [] },
            { tagName: 'minecraft:lectern_books', entries: [] },
            { tagName: 'minecraft:wooden_stairs', entries: [] },
            { tagName: 'minecraft:spruce_logs', entries: [] },
            { tagName: 'minecraft:signs', entries: [] },
            { tagName: 'minecraft:carpets', entries: [] },
            { tagName: 'minecraft:wool', entries: [] },
            { tagName: 'minecraft:wooden_buttons', entries: [] },
            { tagName: 'minecraft:stairs', entries: [] },
            { tagName: 'minecraft:fishes', entries: [] },
            { tagName: 'minecraft:logs', entries: [] },
            { tagName: 'minecraft:stone_bricks', entries: [] },
            { tagName: 'minecraft:creeper_drop_music_discs', entries: [] },
            { tagName: 'minecraft:arrows', entries: [mcData.itemsByName.arrow.id] },
            { tagName: 'minecraft:slabs', entries: [] },
            { tagName: 'minecraft:wooden_doors', entries: [] },
            { tagName: 'minecraft:warped_stems', entries: [] },
            { tagName: 'minecraft:trapdoors', entries: [] },
            { tagName: 'minecraft:crimson_stems', entries: [] },
            { tagName: 'minecraft:buttons', entries: [] },
            { tagName: 'minecraft:flowers', entries: [] },
            { tagName: 'minecraft:stone_tool_materials', entries: [] },
            { tagName: 'minecraft:planks', entries: [] },
            { tagName: 'minecraft:boats', entries: [] },
            { tagName: 'minecraft:dark_oak_logs', entries: [] },
            { tagName: 'minecraft:rails', entries: [] },
            { tagName: 'minecraft:non_flammable_wood', entries: [] },
            { tagName: 'minecraft:leaves', entries: [] },
            { tagName: 'minecraft:walls', entries: [] },
            { tagName: 'minecraft:coals', entries: [] },
            { tagName: 'minecraft:wooden_pressure_plates', entries: [] },
            { tagName: 'minecraft:acacia_logs', entries: [] },
            { tagName: 'minecraft:anvil', entries: [] },
            { tagName: 'minecraft:piglin_loved', entries: [] },
            { tagName: 'minecraft:music_discs', entries: [] },
            { tagName: 'minecraft:birch_logs', entries: [] },
            { tagName: 'minecraft:tall_flowers', entries: [] },
            { tagName: 'minecraft:sand', entries: [] },
            { tagName: 'minecraft:gold_ores', entries: [] },
            { tagName: 'minecraft:logs_that_burn', entries: [] },
            { tagName: 'minecraft:fences', entries: [] },
            { tagName: 'minecraft:saplings', entries: [] },
            { tagName: 'minecraft:beds', entries: [] },
            { tagName: 'minecraft:oak_logs', entries: [] },
            { tagName: 'minecraft:doors', entries: [] }
          ],
          fluidTags: [
            { tagName: 'minecraft:lava', entries: [] },
            { tagName: 'minecraft:water', entries: [] }
          ],
          entityTags: [
            { tagName: 'minecraft:skeletons', entries: [] },
            { tagName: 'minecraft:raiders', entries: [] },
            { tagName: 'minecraft:arrows', entries: [mcData.entitiesByName.arrow.id] },
            { tagName: 'minecraft:beehive_inhabitors', entries: [] },
            { tagName: 'minecraft:impact_projectiles', entries: [mcData.entitiesByName.arrow.id] }
          ]
        })

        // Same bugs as when i was trying to implement water, maybe it's the same as when i was typing 'minecraft:ladder' in the climbable blockTags entries
    })
  },
}
