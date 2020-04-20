import { COLOR } from './utils/colors';
import { onReady } from './utils/dom';
import { toggleCell } from './cell';
import { createControlPanel } from './control-panel';
import { createGameLoop } from './game-loop';
import { UnreachableCaseError } from './errors';

import {
  updateWorld,
  resizeWorld,
  createWorld,
  drawWorld,
  detectWorldCollision,
  World,
  updateWorldSize,
} from './world';

import {
  loadContext,
  getViewportSize,
  resizeViewport,
  createProgramInfo,
  ViewportSize,
} from './webgl/index';

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
  }
  | {
    readonly type: 'SIZE_UPDATE';
    readonly size: ViewportSize;
  };

interface GameState {
  world: World;
  viewportSize: ViewportSize;
  running: boolean;
  tick: {
    interval: number;
    delta: number;
  };
}

onReady(async () => {
  const controlPanel = createControlPanel({
    selectors: {
      canvas: '#game-viewport',
      runButton: '#run-button',
      updateIntervalInput: '#update-interval-input',
      updateIntervalLabel: '#update-interval-label',
      heightInput: '#height-input',
      widthInput: '#width-input',
    },
    devicePixelRatio: DEVICE_PIXEL_RATIO,
    sizeUpdateDelay: 500,
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

  controlPanel.onSizeUpdate((size) => gameLoop.registerInput({
    type: 'SIZE_UPDATE',
    size,
  }));

  const context = loadContext('#game-viewport');

  const programInfo = await createProgramInfo({
    context,
    vertexShaderPath: '/static/lib/shaders/board-vertex.glsl',
    fragmentShaderPath: '/static/lib/shaders/board-fragment.glsl',
    bufferNames: ['vertex', 'color'],
  });

  const viewportSize = getViewportSize({
    canvas: context.canvas as HTMLCanvasElement,
    devicePixelRatio: DEVICE_PIXEL_RATIO,
  });

  const gameLoop = createGameLoop<GameState, InputEvent>({
    timeStep: 1000 / 60,
    state: {
      viewportSize,
      world: createWorld({
        viewportSize,
        columns: 40,
        rows: 20,
        border: BORDER,
      }),
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
            const result = detectWorldCollision({ world: acc.world, point: event.point });
            if (!result.collision) {
              return acc;
            }

            const { position, cell } = result;
            acc.world[position.row][position.column] = toggleCell({ cell });
            return acc;

          case 'SIZE_UPDATE':
            acc.world = updateWorldSize({
              world: acc.world,
              viewportSize: acc.viewportSize,
              size: event.size,
              border: BORDER,
            });
            return acc;

          default:
            throw new UnreachableCaseError(event);
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
        state.viewportSize = viewportSize;
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
