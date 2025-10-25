import { z } from "zod";

const METADATA_KEY = "custom:schema";

export function Schema(schema: z.ZodSchema): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(METADATA_KEY, schema, target);
  };
}

export function getSchema(target: any): z.ZodSchema | undefined {
  return Reflect.getMetadata(METADATA_KEY, target.constructor);
}
