import { MealsQueueConsumer } from "@/application/queues/meals-queue-consumer";
import { LambdaSQSAdapter } from "@/infra/adapters/lambdaSQS";

export const handler = new LambdaSQSAdapter(MealsQueueConsumer).build();
