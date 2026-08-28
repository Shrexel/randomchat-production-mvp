export type WaitingUser = {
  socketId: string;
  guestId: string;
  country: string | null;
  queuedAt: number;
};

export class Matchmaker {
  private queue: WaitingUser[] = [];

  enqueue(user: WaitingUser) {
    this.remove(user.socketId);
    this.queue.push(user);
  }

  remove(socketId: string) {
    this.queue = this.queue.filter((u) => u.socketId !== socketId);
  }

  takeCandidate(
    socketId: string,
    shouldSkip: (candidate: WaitingUser) => Promise<boolean>
  ): Promise<WaitingUser | null> {
    return this.take(socketId, shouldSkip);
  }

  private async take(
    socketId: string,
    shouldSkip: (candidate: WaitingUser) => Promise<boolean>
  ) {
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];
      if (candidate.socketId === socketId) continue;

      // A candidate skipped for THIS searcher (blocked, or a country
      // mismatch when "same country" is on) is left in the queue —
      // they may still be a valid match for someone else searching.
      if (await shouldSkip(candidate)) {
        continue;
      }

      this.queue.splice(i, 1);
      return candidate;
    }

    return null;
  }
}
