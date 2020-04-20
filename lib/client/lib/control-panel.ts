import { $ } from './utils/dom';

export interface CreateControlPanelOptions {
  readonly runButtonSelector: string;
  readonly updateIntervalInputSelector: string;
  readonly updateIntervalLabelSelector: string;
  readonly canvas: HTMLCanvasElement;
  readonly devicePixelRatio: number;
}

export const createControlPanel = ({
  runButtonSelector,
  updateIntervalInputSelector,
  updateIntervalLabelSelector,
  canvas,
  devicePixelRatio,
}: CreateControlPanelOptions) => {
  const $runButton = $<HTMLInputElement>(runButtonSelector)[0];
  const $updateIntervalInput = $<HTMLInputElement>(updateIntervalInputSelector)[0];
  const $updateIntervalLabel = $<HTMLLabelElement>(updateIntervalLabelSelector)[0];

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
    onCanvasClick: (cb: (point: readonly [number, number]) => void) => {
      canvas.addEventListener('click', (event) => {
        const topOffset = canvas.offsetTop;
        const leftOffset = canvas.offsetLeft;
        const point = [
          ((event.pageX || event.clientX) - leftOffset) * devicePixelRatio,
          ((event.pageY || event.clientY) - topOffset) * devicePixelRatio,
        ] as const;

        return cb(point);
      });
    },
  };
};
