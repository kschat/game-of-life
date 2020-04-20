import { $ } from './utils/dom';
import { debounce } from './utils/debounce';
import { GridSize } from './world';
import { Point } from './cell';

export interface CreateControlPanelOptions {
  readonly selectors: {
    readonly canvas: string;
    readonly runButton: string;
    readonly updateIntervalInput: string;
    readonly updateIntervalLabel: string;
    readonly heightInput: string;
    readonly widthInput: string;
  };
  readonly devicePixelRatio: number;
  readonly sizeUpdateDelay: number;
}

export const createControlPanel = ({
  selectors,
  devicePixelRatio,
  sizeUpdateDelay,
}: CreateControlPanelOptions) => {
  const $canvas = $<HTMLCanvasElement>(selectors.canvas)[0];
  const $runButton = $<HTMLInputElement>(selectors.runButton)[0];
  const $updateIntervalInput = $<HTMLInputElement>(selectors.updateIntervalInput)[0];
  const $updateIntervalLabel = $<HTMLLabelElement>(selectors.updateIntervalLabel)[0];
  const $heightInput = $<HTMLInputElement>(selectors.heightInput)[0];
  const $widthInput = $<HTMLInputElement>(selectors.widthInput)[0];

  const tickInterval = Number($updateIntervalInput.value);
  $updateIntervalLabel.textContent = `${tickInterval} ms`;

  $updateIntervalInput.addEventListener('input', () => {
    const value = Number($updateIntervalInput.value);
    $updateIntervalLabel.textContent = `${value} ms`;
  });

  $runButton.addEventListener('click', () => {
    $runButton.textContent = $runButton.textContent === 'start' ? 'pause' : 'start';
  });

  return {
    getTickInterval: () => tickInterval,
    onSliderUpdate: (cb: (value: number) => void) => {
      $updateIntervalInput.addEventListener(
        'input',
        () => cb(Number($updateIntervalInput.value)),
      );
    },
    onRunClick: (cb: () => void) => {
      $runButton.addEventListener('click', () => cb());
    },
    onCanvasClick: (cb: (point: Point) => void) => {
      $canvas.addEventListener('click', (event) => {
        const topOffset = $canvas.offsetTop;
        const leftOffset = $canvas.offsetLeft;
        const point = [
          ((event.pageX || event.clientX) - leftOffset) * devicePixelRatio,
          ((event.pageY || event.clientY) - topOffset) * devicePixelRatio,
        ] as const;

        return cb(point);
      });
    },
    onSizeUpdate: (cb: (size: GridSize) => void) => {
      const handleBoardResize = debounce({
        wait: sizeUpdateDelay,
        action: () => {
          const rows = Number($heightInput.value);
          const columns = Number($widthInput.value);
          return cb({ rows, columns });
        },
      });

      $heightInput.addEventListener('input', handleBoardResize);
      $widthInput.addEventListener('input', handleBoardResize);
    },
  };
};
