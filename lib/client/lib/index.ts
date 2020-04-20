import { COLOR } from './utils/colors';
import { onReady, $ } from './utils/dom';
import { detectCollision, toggleCell } from './cell';
import { updateWorld, resizeWorld, calculateWorld, drawWorld } from './world';

import {
  loadContext,
  getViewportSize,
  resizeViewport,
  createProgramInfo,
} from './webgl/index';

const BORDER = 4;
const DEVICE_PIXEL_RATIO = window.devicePixelRatio;

onReady(async () => {
  const $startButton = $('#start-button')[0];
  const $updateIntervalInput = $<HTMLInputElement>('#update-interval-input')[0];
  const $updateIntervalLabel = $('#update-interval-label')[0];
  const context = loadContext('#game-viewport');

  const programInfo = await createProgramInfo({
    context,
    vertexShaderPath: '/static/lib/shaders/board-vertex.glsl',
    fragmentShaderPath: '/static/lib/shaders/board-fragment.glsl',
    bufferNames: ['vertex', 'color'],
  });

  const world = calculateWorld({
    viewportSize: getViewportSize({
      canvas: context.canvas as HTMLCanvasElement,
      devicePixelRatio: DEVICE_PIXEL_RATIO,
    }),
    columns: 40,
    rows: 20,
    border: BORDER,
  });

  $updateIntervalInput.addEventListener('input', ({ target }) => {
    // @ts-ignore
    gameState.tick.interval = Number(target.value);
    $updateIntervalLabel.textContent = `${gameState.tick.interval} ms`;
  });

  $startButton.addEventListener('click', () => {
    gameState.running = !gameState.running;
    $startButton.textContent = gameState.running ? 'pause' : 'start';
  });

  (context.canvas as HTMLCanvasElement).addEventListener('click', (event) => {
    const topOffset = (context.canvas as HTMLCanvasElement).offsetTop;
    const leftOffset = (context.canvas as HTMLCanvasElement).offsetLeft;
    const point = [
      ((event.pageX || event.clientX) - leftOffset) * DEVICE_PIXEL_RATIO,
      ((event.pageY || event.clientY) - topOffset) * DEVICE_PIXEL_RATIO,
    ] as const;

    let found = false;
    gameState.world.forEach((row) => {
      if (found) return;

      row.forEach((cell) => {
        if (found) return;

        if (detectCollision({ cell, point })) {
          found = true;
          const { color, state } = toggleCell({ cell });
          // @ts-ignore
          cell.color = color;
          // @ts-ignore
          cell.state = state;
        }
      });
    });
  });

  const tickInterval = Number($updateIntervalInput.value);
  $updateIntervalLabel.textContent = `${tickInterval} ms`;

  const gameState = {
    world,
    running: false,
    tick: {
      interval: tickInterval,
      delta: 0,
    },
  };

  const gameLoop = createGameLoop({
    state: gameState,
    timeStep: 1000 / 60,
    update: ({ state, delta }) => {
      state.tick.delta += Math.min(state.tick.interval, delta);

      while (state.tick.delta >= state.tick.interval) {
        state.tick.delta -= state.tick.interval;
        if (state.running) {
          state.world = updateWorld({ world: state.world });
        }
      }

      return state;
    },
    render: ({ state }) => {
      const viewportSize = resizeViewport({
        canvas: context.canvas as HTMLCanvasElement,
        devicePixelRatio: DEVICE_PIXEL_RATIO,
      });

      if (viewportSize.resize) {
        state.world = resizeWorld({
          viewportSize,
          world: state.world,
          border: BORDER
        });
      }

      context.viewport(0, 0, viewportSize.width, viewportSize.height);
      context.clearColor(...COLOR.BACKGROUND_COLOR);
      context.clear(context.COLOR_BUFFER_BIT);

      drawWorld({ world: state.world, programInfo });

      return state;
    },
  });

  gameLoop.start();

});

interface UpdateOptions<T> {
  readonly delta: number;
  readonly state: T;
}

interface DrawOptions<T> {
  readonly now: number;
  readonly state: T;
}

interface CreateGameLoopOptions<T> {
  readonly state: T;
  readonly timeStep: number;
  readonly render: (options: DrawOptions<T>) => T;
  readonly update: (options: UpdateOptions<T>) => T;
}

const createGameLoop = <T>({
  state,
  timeStep,
  render,
  update,
}: CreateGameLoopOptions<T>) => {
  let frameId = -1;
  let delta = 0;

  const loop = (last: number) => (now: number) => {
    delta = delta + Math.min(timeStep, now - last);

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
  }
};
