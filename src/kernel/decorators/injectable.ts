import { Registry } from "@/kernel/di/registry";
import { type Constructor } from "@/shared/types/constructor";

export function Injectable<T = unknown>(token?: symbol): ClassDecorator {
  return (target) => {
    const constructor = target as unknown as Constructor;

    if (token) {
      Registry.getInstance().bind(token, constructor);
    } else {
      Registry.getInstance().register(constructor);
    }
  };
}
