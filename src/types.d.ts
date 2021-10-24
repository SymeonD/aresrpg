import net from 'net'

declare module 'minecraft-protocol' {
  interface ServerOptions {
    favicon: string
  }

  interface Server {
    socketServer: net.Server
  }

  interface Client {
    id: number
    end(reason: string, fullReason: string): void
  }
}

declare module 'minecraft-data' {
  interface IndexedData {
    loginPacket: any
  }
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

type Await<T> = T extends Promise<infer U> ? U : T

type EventMap = Record<string, any>

type EventName<T extends EventMap> = string & keyof T
type EventListener<T> = (arg: T) => void

interface TypedEmitter<T extends EventMap> {
  on(eventName: string | symbol, listener: (arg: any) => void): this
  on<K extends EventName<T>>(eventName: K, listener: EventListener<T[K]>): this

  once(eventName: string | symbol, listener: (arg: any) => void): this
  once<K extends EventName<T>>(
    eventName: K,
    listener: EventListener<T[K]>
  ): this

  off(eventName: string | symbol, listener: (arg: any) => void): this
  off<K extends EventName<T>>(eventName: K, listener: EventListener<T[K]>): this

  emit(eventName: string | symbol, arg: any): boolean
  emit<K extends EventName<T>>(eventName: K, arg: T[K]): boolean
}

declare module 'events' {
  interface StaticEventEmitterOptions {
    signal?: AbortSignal | undefined
  }

  class EventEmitter {
    static on(
      emitter: NodeJS.EventEmitter,
      eventName: string,
      options?: StaticEventEmitterOptions
    ): AsyncIterableIterator<any>
    static on<T, K extends EventName<T>>(
      emitter: TypedEmitter<T>,
      eventName: K,
      options?: StaticEventEmitterOptions
    ): AsyncIterableIterator<[T[K]]>
    static on<T>(
      emitter: TypedEmitter<T>,
      eventName: string,
      options?: StaticEventEmitterOptions
    ): AsyncIterableIterator<any>
  }
}
