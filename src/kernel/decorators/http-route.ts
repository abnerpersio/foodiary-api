import type { HttpMetadata } from "@/shared/types/http";

const METADATA_KEY = "custom:httpRoute";

export function HttpRoute(value: HttpMetadata["route"]): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(METADATA_KEY, value, target);
  };
}
