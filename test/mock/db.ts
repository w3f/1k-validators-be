export default class MockDb {
  public targets = new Map();

  addNominator(address: string, timestamp = 0): boolean {
    return true;
  }

  getCurrentTargets(address: string): string[] {
    return this.targets.get(address) || [];
  }

  setTarget(address: string, stash: string, timestamp = 0): boolean {
    const targets = this.targets.get(address) || [];
    targets.push(stash);
    this.targets.set(address, targets);
    return true;
  }

  setLastNomination(address: string, timestamp = 0): boolean {
    return true;
  }

  clearCurrent(address: string): boolean {
    this.targets.set(address, []);

    return true;
  }
}
