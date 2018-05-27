
// tslint:disable unified-signatures

import {Descriptor} from "./descriptor"
import * as types from "./types"

export class Container implements types.ContainerInterface {

  protected descriptors: Map<string, Descriptor<any>>
  protected instances: Map<string, any>
  protected factories: Map<string, () => any>
  protected aliases: Map<string, string>
  protected providers: types.Provider[]
  protected isBooted = false

  constructor() {
    this.instances = new Map<string, any>()
    this.descriptors = new Map<string, Descriptor<any>>()
    this.factories = new Map<string, () => any>()
    this.aliases = new Map<string, string>()
    this.providers = []
  }

  public set<P>(name: string, value: P): void
  public set<P>(name: string, value: Promise<P>): void
  public set<P>(name: string, factory: () => P): types.ContainerFluent<P>
  public set<P>(name: string, factory: () => Promise<P>): types.ContainerFluent<P>
  public set<P>(name: string, value: any): any {
    this.delete(name)
    if (typeof value === "function") {
      this.factories.set(name, value)
      const descriptor = new Descriptor()
      this.descriptors.set(name, descriptor)
      return descriptor
    }
    this.instances.set(name, value)
  }

  public async get<P>(name: string): Promise<P> {
    if (this.descriptors.has(name)) {
      (this.descriptors.get(name) as Descriptor<P>).freeze()
    }
    while (this.aliases.has(name)) {
      name = this.aliases.get(name) as string
    }
    if (this.instances.has(name)) {
      return this.instances.get(name) as P
    }
    if (!this.descriptors.has(name)) {
      throw new Error(`"${name}" is not defined!`)
    }
    const descriptor = this.descriptors.get(name) as Descriptor<P>
    const factory = this.factories.get(name) as () => any

    let instance = factory() as P|Promise<P>
    if (instance instanceof Promise) {
      instance = await instance
    }

    for (const afterHandler of descriptor.afterHandlers) {
      const handlerResult = afterHandler(instance)
      instance = (handlerResult instanceof Promise)
        ? await handlerResult
        : handlerResult
    }
    if (!descriptor.isFactory) {
      this.instances.set(name, instance) // caching
    }
    return instance
  }

  public delete(...names: string[]): void {
    for (const name of names) {
      if (this.descriptors.has(name)) {
        const descriptor = this.descriptors.get(name) as Descriptor<any>
        if (descriptor.isFrozen) {
          throw new Error(`cannot change ${name}`)
        }
        this.descriptors.delete(name)
      }
      this.instances.delete(name)
      this.factories.delete(name)
      this.aliases.delete(name)
    }
  }

  public register(provider: types.Provider): void {
    this.providers.push(provider)
  }

  public async boot(): Promise<void> {
    if (!this.isBooted) {
      for (const provider of this.providers) {
        const registering = provider.register(this)
        if (registering instanceof Promise) {
          await registering
        }
      }
      for (const provider of this.providers) {
        if (!provider.boot) {
          continue
        }
        const booting = provider.boot(this)
        if (booting instanceof Promise) {
          await booting
        }
      }
      this.isBooted = true
    }
  }

  public async close(): Promise<void> {
    if (this.isBooted) {
      for (const provider of this.providers) {
        if (!provider.close) {
          continue
        }
        const closing = provider.close(this)
        if (closing instanceof Promise) {
          await closing
        }
      }
      this.isBooted = false
    }
  }
}
