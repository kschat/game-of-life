import { COLOR } from './utils/colors';
import { onReady } from './utils/dom';
import { toggleCell, Cell } from './cell';

import {
  updateWorld,
  resizeWorld,
  calculateWorld,
  drawWorld,
  detectWorldCollision,
} from './world';

import {
  loadContext,
  getViewportSize,
  resizeViewport,
  createProgramInfo,
} from './webgl/index';
import { createControlPanel } from './control-panel';

const BORDER = 4;
const DEVICE_PIXEL_RATIO = window.devicePixelRatio;

type InputEvent =
  | {
    readonly type: 'INTERVAL_SLIDER_UPDATE';
    readonly value: number;
  }
  | {
    readonly type: 'RUN_BUTTON_CLICK';
  }
  | {
    readonly type: 'BOARD_CLICK';
    readonly point: readonly [number, number];
  };

interface GameState {
  world: Cell[][];
  running: boolean;
  tick: {
    interval: number;
    delta: number;
  };
}

onReady(async () => {
  const context = loadContext('#game-viewport');

  const controlPanel = createControlPanel({
    runButtonSelector: '#run-button',
    updateIntervalInputSelector: '#update-interval-input',
    updateIntervalLabelSelector: '#update-interval-label',
    canvas: context.canvas as HTMLCanvasElement,
    devicePixelRatio: DEVICE_PIXEL_RATIO,
  });

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

  controlPanel.onSliderUpdate((value) => gameLoop.registerInput({
    type: 'INTERVAL_SLIDER_UPDATE',
    value,
  }));

  controlPanel.onRunClick(() => gameLoop.registerInput({
    type: 'RUN_BUTTON_CLICK',
  }));

  controlPanel.onCanvasClick((point) => gameLoop.registerInput({
    type: 'BOARD_CLICK',
    point,
  }));

  const gameLoop = createGameLoop<GameState, InputEvent>({
    timeStep: 1000 / 60,
    state: {
      world,
      running: false,
      tick: {
        interval: controlPanel.getTickInterval(),
        delta: 0,
      },
    },

    processInput: ({ state, events }) => {
      return events.reduce((acc, event) => {
        switch (event.type) {
          case 'INTERVAL_SLIDER_UPDATE':
            acc.tick.interval = Number(event.value);
            return acc;

          case 'RUN_BUTTON_CLICK':
            acc.running = !acc.running;
            return acc;

          case 'BOARD_CLICK':
            const result = detectWorldCollision({ world, point: event.point });
            if (!result.collision) {
              return acc;
            }

            const { position, cell } = result;
            acc.world[position.row][position.column] = toggleCell({ cell });

            return acc;

          default:
            throw new Error(`Unknown input type "${event}"`);
        }
      }, state);
    },

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

interface RenderOptions<T> {
  readonly now: number;
  readonly state: T;
}

interface ProcessInputOptions<T, E> {
  readonly state: T;
  readonly events: E[];
}

interface CreateGameLoopOptions<T, E> {
  readonly state: T;
  readonly timeStep: number;
  readonly render: (options: RenderOptions<T>) => T;
  readonly update: (options: UpdateOptions<T>) => T;
  readonly processInput: (options: ProcessInputOptions<T, E>) => T;
}

const createGameLoop = <T, E>({
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
