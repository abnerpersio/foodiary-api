export function Inject(token: string | symbol): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Reflect.defineMetadata("inject:token", token, target, String(parameterIndex));
  };
}
