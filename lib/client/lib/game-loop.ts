export interface UpdateOptions<T> {
  readonly delta: number;
  readonly state: T;
}

export interface RenderOptions<T> {
  readonly now: number;
  readonly state: T;
}

export interface ProcessInputOptions<T, E> {
  readonly state: T;
  readonly events: E[];
}

export interface CreateGameLoopOptions<T, E> {
  readonly state: T;
  readonly timeStep: number;
  readonly render: (options: RenderOptions<T>) => T;
  readonly update: (options: UpdateOptions<T>) => T;
  readonly processInput: (options: ProcessInputOptions<T, E>) => T;
}

export const createGameLoop = <T, E>({
  state,
  timeStep,
  render,
  update,
  processInput,
}: CreateGameLoopOptions<T, E>) => {
  let frameId = -1;
  let delta = 0;
  let eventBuffer: E[] = [];

  const loop = (last: number) => (now: number) => {
    delta = delta + Math.min(timeStep, now - last);

    state = processInput({ state, events: eventBuffer });
    eventBuffer.length = 0;

    while (delta >= timeStep) {
      delta = delta - timeStep;
      state = update({ delta: timeStep, state });
    }

    state = render({ now, state });

    frameId = requestAnimationFrame(loop(now));
  };

  return {
    start: () => {
      frameId = requestAnimationFrame(loop(0));
    },
    stop: () => cancelAnimationFrame(frameId),
    registerInput: (event: E) => eventBuffer.push(event),
  }
};
