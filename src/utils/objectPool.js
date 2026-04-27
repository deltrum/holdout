export class ObjectPool {
  constructor(factory, reset, initialSize = 20) {
    this._factory = factory;
    this._reset = reset;
    this._pool = [];
    for (let i = 0; i < initialSize; i++) {
      this._pool.push(this._factory());
    }
  }

  acquire() {
    const obj = this._pool.length > 0 ? this._pool.pop() : this._factory();
    this._reset(obj);
    return obj;
  }

  release(obj) {
    this._pool.push(obj);
  }

  get size() {
    return this._pool.length;
  }
}
