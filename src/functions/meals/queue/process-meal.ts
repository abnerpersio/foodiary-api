import { SQSEvent } from "aws-lambda";

export const handler = (event: SQSEvent) => {
  console.log("sqs event", JSON.stringify(event, null, 2));
};
