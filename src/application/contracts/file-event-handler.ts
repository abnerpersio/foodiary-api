export interface FileEventHandler {
  handle(input: FileEventHandler.Input): Promise<void>;
}

export namespace FileEventHandler {
  export type Input = {
    fileKey: string;
  };
}
