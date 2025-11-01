import { Injectable } from "@/kernel/decorators/injectable";

type CompensationFn = () => Promise<void>;

@Injectable()
export class Saga {
  private compensations: CompensationFn[] = [];

  addCompensation(fn: CompensationFn) {
    this.compensations.unshift(fn);
  }

  async run<TResult>(fn: () => Promise<TResult>) {
    try {
      return await fn();
    } catch (error) {
      await this.compensate();
      throw error;
    }
  }

  private async compensate() {
    for await (const compensation of this.compensations) {
      try {
        await compensation();
      } catch {}
    }
  }
}

export namespace Saga {}
