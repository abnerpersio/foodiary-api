export interface QueueConsumer<TMesage extends Record<string, unknown>> {
  process(message: TMesage): Promise<void>;
}
