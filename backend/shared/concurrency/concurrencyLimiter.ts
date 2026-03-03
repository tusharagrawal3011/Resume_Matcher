export class ConcurrencyLimiter {
  private running = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    // If limit reached, wait
    if (this.running >= this.limit) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.running++;

    try {
      return await task();
    } finally {
      this.running--;

      // Allow next waiting task (if any)
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
