import shoot from './bow.js'

const Status = {
  STARTED_DIGGING: 0,
  CANCELLED_DIGGING: 1, // Sent when the player lets go of the Mine Block key (default: left click).
  FINISHED_DIGGING: 2, // Sent when the client thinks it is finished.
  DROP_ITEM_STACK: 3, // Triggered by using the Drop Item key (default: Q) with the modifier to drop the entire selected stack (default: depends on OS). Location is always set to 0/0/0, Face is always set to -Y.
  DROP_ITEM: 4, // Triggered by using the Drop Item key (default: Q). Location is always set to 0/0/0, Face is always set to -Y.
  SHOOT_ARROW: 5, // Indicates that the currently held item should have its state updated such as eating food, pulling back bows, using buckets, etc. Location is always set to 0/0/0, Face is always set to -Y.
  SWAP_ITEM_IN_HAND: 6, // Used to swap or assign an item to the second hand. Location is always set to 0/0/0, Face is always set to -Y.
}

export default {
  observe({ client, events, world }) {
    client.on('block_dig', (packet) => {
      events.once('state', (state) => {
        const { position } = state
        const { status } = packet
        switch (status) {
          case Status.SHOOT_ARROW:
            shoot({ position, client, world })
            break

          default:
            break
        }
      })
    })
  },
}
