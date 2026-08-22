type WaitingUser = {
  socketId: string;
  guestId: string;
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
    isBlocked: (candidateGuestId: string) => Promise<boolean>
  ): Promise<WaitingUser | null> {
    return this.take(socketId, isBlocked);
  }

  private async take(
    socketId: string,
    isBlocked: (candidateGuestId: string) => Promise<boolean>
  ) {
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];
      if (candidate.socketId === socketId) continue;

      if (await isBlocked(candidate.guestId)) {
        this.queue.splice(i, 1);
        i--;
        continue;
      }

      this.queue.splice(i, 1);
      return candidate;
    }

    return null;
  }
}
