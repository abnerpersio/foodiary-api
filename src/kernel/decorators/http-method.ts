import type { HttpMetadata } from "@/shared/types/http";

const METADATA_KEY = "custom:httpMethod";

export function HttpMethod(value: HttpMetadata["method"]): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(METADATA_KEY, value, target);
  };
}
