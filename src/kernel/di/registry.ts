import { type Constructor } from "@/shared/types/constructor";

export class Registry {
  private static instance: Registry | undefined;

  static getInstance() {
    if (!this.instance) {
      this.instance = new Registry();
    }

    return this.instance;
  }

  private constructor() {}

  private readonly providers = new Map<string | symbol, Registry.Provider>();

  bind<T = unknown>(token: string | symbol, impl: Constructor): void {
    if (this.providers.has(token)) {
      throw new Error(
        `"${String(token)}" is already registered in the registry.`
      );
    }

    const deps = Reflect.getMetadata("design:paramtypes", impl) ?? [];

    this.providers.set(token, { impl, deps });
  }

  get<T>(token: string | symbol): T {
    const provider = this.providers.get(token);

    if (!provider) {
      throw new Error(`"${String(token)}" is not registered.`);
    }

    const deps = provider.deps.map((dep, index) => {
      const depToken =
        Reflect.getMetadata("inject:token", provider.impl, String(index)) ??
        dep;

      if (typeof depToken === "string" || typeof depToken === "symbol") {
        return this.get(depToken);
      }

      return this.resolve(dep);
    });

    return new provider.impl(...deps) as T;
  }

  register(impl: Constructor) {
    const token = impl.name;

    if (this.providers.has(token)) {
      throw new Error(`"${token}" is already registered in the registry.`);
    }

    const deps = Reflect.getMetadata("design:paramtypes", impl) ?? [];

    this.providers.set(token, { impl, deps });
  }

  resolve<TImpl extends Constructor>(impl: TImpl): InstanceType<TImpl> {
    const token = impl.name;
    const provider = this.providers.get(token);

    if (!provider) {
      throw new Error(`"${token}" is not registered.`);
    }

    const deps = provider.deps.map((dep, index) => {
      const depToken =
        Reflect.getMetadata("inject:token", provider.impl, String(index)) ??
        dep;

      if (typeof depToken === "string" || typeof depToken === "symbol") {
        return this.get(depToken);
      }

      return this.resolve(dep);
    });

    const instance = new provider.impl(...deps);

    return instance;
  }
}

export namespace Registry {
  export type Provider = {
    impl: Constructor;
    deps: Constructor[];
  };
}
