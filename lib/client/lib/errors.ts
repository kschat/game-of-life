export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${val}`);
  }
}

export class WebGLError extends Error {
  constructor(message: string | Error = '') {
    super(typeof message !== 'string' ? message.message : message)
    this.name = this.constructor.name;
  }
}
