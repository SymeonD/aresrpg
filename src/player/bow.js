import UUID from 'uuid-1345'
import Vec3 from 'vec3'
import ray_aabb from 'ray-aabb-intersection'

import { to_direction } from '../math.js'
import { get_block } from '../chunk.js'

/* function convert_angle(angle) {
  if (angle >= 0) {
    angle = angle % 360
    angle = angle
    angle -= 180
  } else {
    angle = angle % 360
    angle = angle
    angle += 180
  }

  angle = Math.floor((angle / 360) * 255)

  return angle
} */

function array_to_vec3(array) {
  return Vec3({ x: array[0], y: array[1], z: array[2] })
}

function ray_tracing({
  x,
  y,
  z,
  prevX,
  prevY,
  prevZ,
  world,
  interval_id: id,
  velocity,
  client,
}) {
  // init truncated. if don't truncated it will check more block in the for loop.
  const truncated_x = Math.trunc(x)
  const truncated_y = Math.trunc(y)
  const truncated_z = Math.trunc(z)
  const truncated_prevX = Math.trunc(prevX)
  const truncated_prevY = Math.trunc(prevY)
  const truncated_prevZ = Math.trunc(prevZ)

  // choose the lowest Vector Component
  const x1 = x >= truncated_prevX ? truncated_prevX : truncated_x
  const y1 = y >= truncated_prevY ? truncated_prevY : truncated_y
  const z1 = z >= truncated_prevZ ? truncated_prevZ : truncated_z

  // int the size for each dimension
  const x_length = Math.abs(truncated_x - truncated_prevX) + 1
  const y_length = Math.abs(truncated_y - truncated_prevY) + 1
  const z_length = Math.abs(truncated_z - truncated_prevZ) + 1

  let nearest_intersection

  // make a rectangle with the current and pervious point and do a ray tracing for all the blocks in the rectangle
  for (let x_axis = 0; x_axis < x_length; x_axis++) {
    for (let y_axis = 0; y_axis < y_length; y_axis++) {
      for (let z_axis = 0; z_axis < z_length; z_axis++) {
        get_block(world, {
          x: x1 + x_axis,
          y: y1 + y_axis,
          z: z1 + z_axis,
        }).then((block) => {
          const ray_direction = Vec3({
            x: x - prevX,
            y: y - prevY,
            z: z - prevZ,
          })
            .normalize()
            .toArray()

          const { shapes } = block
          shapes.forEach((shape) => {
            // block arre composed by multiple aabb sometimes
            const first_point = shape.slice(0, 2)
            const second_point = shape.slice(3)
            const aabb = [first_point, second_point]

            const ray_origin = [
              truncated_x - prevX,
              truncated_y - prevY,
              truncated_z - prevZ,
            ] //
            const intersection = new Float32Array(3)
            ray_aabb(intersection, ray_origin, ray_direction, aabb)
            const distance = array_to_vec3(intersection)
              .minus(array_to_vec3(ray_origin))
              .norm() // distance between the the ray_origin and the ray intersection
            if (nearest_intersection !== undefined) {
              // always be undefined at first
              if (distance < array_to_vec3(nearest_intersection).norm()) {
                nearest_intersection = intersection
              }
            } else {
              nearest_intersection = intersection
            }

            if (
              x_axis + 1 === x_length &&
              y_axis + 1 === y_length && // if the end of the for loops
              z_axis + 1 === z_length
            ) {
              console.log('touché ')
              clearInterval(id)
              const final_x = nearest_intersection[0] + prevX
              const final_y = nearest_intersection[1] + prevY
              const final_z = nearest_intersection[2] + prevZ

              client.write('entity_move_look', {
                entityId: 10000,
                dX: (final_x * 32 - prevX * 32) * 128,
                dY: (final_y * 32 - prevY * 32) * 128,
                dZ: (final_z * 32 - prevZ * 32) * 128,
                yaw: getYaw(velocity),
                pitch: getPitch(velocity),
                onGround: false,
              })

              client.write('entity_velocity', {
                entityId: 10000,
                velocityX: velocity.x,
                velocityY: velocity.y,
                velocityZ: velocity.z,
                onGround: false,
              })

              console.log(final_x)
              console.log(final_y)
              console.log(final_z)
            }
          })
        })
      }
    }
  }
}

function getYaw(vector) {
  const vector2 = Object.assign(Vec3({ x: 0, y: 0, z: 0 }), vector)
  vector2.normalize()
  const yaw = Math.acos(vector2.x) * (128 / Math.PI) - 128 + 64
  return yaw
}
function getPitch(vector) {
  const vector2 = Object.assign(Vec3({ x: 0, y: 0, z: 0 }), vector)
  vector2.normalize()
  const pitch = Math.acos(vector2.x) * (128 / Math.PI) - 128 + 64
  return pitch
}

export default function shoot({
  position: { x, y, z, yaw, pitch },
  client,
  world,
}) {
  // arrow type entity = 2
  // base speed = 579 397 598
  const speed_factor = 1 / 100 // temporary
  const acceleration_vector = Vec3({ x: 0, y: -1 * speed_factor * 8000, z: 0 })
  const speed = Math.sqrt(570591436) * speed_factor
  const velocity = to_direction(yaw, pitch)
  velocity.normalize()
  velocity.scale(speed)

  const options = {
    entityId: 10000,
    objectUUID: UUID.v4(),
    type: 2,
    x,
    y,
    z,
    pitch: getPitch(velocity),
    yaw: getYaw(velocity),
    objectData: 64,
    velocityX: velocity.x,
    velocityY: velocity.y,
    velocityZ: velocity.z,
  }
  client.write('spawn_entity', options)

  const init_time = Date.now()
  const id = setInterval(() => {
    velocity.add(acceleration_vector)

    velocity.scale(0.99) // air friction

    if (velocity.norm() > 32767 || Date.now() > init_time + 3000) {
      clearInterval(id)
      console.log('mort')
      return
    }

    const prevX = x
    const prevY = y
    const prevZ = z

    x += velocity.x / 8000
    y += velocity.y / 8000
    z += velocity.z / 8000

    ray_tracing({
      x,
      y,
      z,
      prevX,
      prevY,
      prevZ,
      world,
      interval_id: id,
      velocity,
      client,
    })
  }, 50)
}
