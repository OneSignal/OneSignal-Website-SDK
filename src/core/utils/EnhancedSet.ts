
export class EnhancedSet<T> extends Set<T> {
  constructor(){
    super();
  }
  /**
   * Returns the first element in the set iterable and removes it from the set
   * @returns T
   */
  shift(): T {
    const { value } = this.values().next();
    this.delete(value);
    return value;
  }

  /**
   * Adds multiple elems to the beginning of the set
   * @param  {T[]} ...elems
   * @returns void
   */
  unshift(...elems: T[]): void {
    if (!elems.length) {
      return;
    }
    const setWithInitialOrder = this.values();
    this.clear();

    elems.forEach(elem => {
      this.add(elem);
    });

    while(setWithInitialOrder.next().done === false) {
      this.add(setWithInitialOrder.next().value);
    }
  }
}
