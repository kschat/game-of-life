import { Cell, calculateCellState, drawCell } from './cell';
import { ViewportSize, ProgramInfo } from './webgl/index';
import { repeat } from './utils/repeat';
import { COLOR } from './utils/colors';

export interface UpdateWorldOptions {
  readonly world: Cell[][];
}

export const updateWorld = ({ world }: UpdateWorldOptions): Cell[][] => {
  return world.map((rowCell, row) => {
    return rowCell.map((cell, column) => {
      const aliveNeighborCount = [
        world[row - 1]?.[column - 1]?.state === 'ALIVE',
        world[row - 1]?.[column]?.state === 'ALIVE',
        world[row - 1]?.[column + 1]?.state === 'ALIVE',
        world[row]?.[column + 1]?.state === 'ALIVE',
        world[row + 1]?.[column + 1]?.state === 'ALIVE',
        world[row + 1]?.[column]?.state === 'ALIVE',
        world[row + 1]?.[column - 1]?.state === 'ALIVE',
        world[row]?.[column - 1]?.state === 'ALIVE'
      ].filter((i) => i).length;

      return {
        ...cell,
        state: calculateCellState({ cell, aliveNeighborCount })
      };
    });
  });
};

export interface ResizeWorldOptions {
  readonly viewportSize: ViewportSize;
  readonly border: number;
  readonly world: Cell[][];
}

export const resizeWorld = ({
  viewportSize,
  world,
  border,
}: ResizeWorldOptions): Cell[][] => {
  const rows = world.length;
  const columns = world[0].length;
  const height = ((viewportSize.height - border) / rows) - border;
  const width = ((viewportSize.width - border) / columns) - border;

  return world.map((row, rowIndex) => {
    return row.map((cell, columnIndex) => {
      return {
        ...cell,
        height,
        width,
        point: [
          (border * (columnIndex + 1)) + (columnIndex * width),
          (border * (rowIndex + 1)) + (rowIndex * height),
        ],
      }
    });
  });
};

export interface CalculateGridOptions {
  readonly viewportSize: ViewportSize;
  readonly columns: number;
  readonly rows: number;
  readonly border: number;
}

export const calculateWorld = ({
  viewportSize,
  columns,
  rows,
  border,
}: CalculateGridOptions): Cell[][] => {
  const height = ((viewportSize.height - border) / rows) - border;
  const width = ((viewportSize.width - border) / columns) - border;

  return repeat(rows, (rowIndex) => {
    return repeat<Cell>(columns, (columnIndex) => {
      return {
        height,
        width,
        point: [
          (border * (columnIndex + 1)) + (columnIndex * width),
          (border * (rowIndex + 1)) + (rowIndex * height),
        ],
        color: COLOR.WHITE,
        state: 'DEAD',
      };
    });
  });
};

export interface DrawWorldOptions {
  readonly world: Cell[][];
  readonly programInfo: ProgramInfo;
}

export const drawWorld = ({ world, programInfo }: DrawWorldOptions) => {
  const { context } = programInfo;
  context.useProgram(programInfo.program);

  programInfo.uniforms.resolution([
    context.canvas.width,
    context.canvas.height,
  ]);

  world.forEach((row) => {
    row.forEach((cell) => {
      drawCell({
        programInfo,
        cell,
      });
    });
  });
};
