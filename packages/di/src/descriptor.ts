import { ContainerFluent } from "./interfaces/container"

export class Descriptor<P> implements ContainerFluent<P> {

  public isFrozen = false

  public isSingleton = false

  public afterHandlers: ((context: P) => P|Promise<P>)[] = []

  public freeze(): ContainerFluent<P> {
    this.isFrozen = true
    return this
  }

  public singleton(): ContainerFluent<P> {
    this.isSingleton = true
    return this
  }

  public after(handler: (context: P) => P|Promise<P>): ContainerFluent<P> {
    this.afterHandlers.push(handler)
    return this
  }
}