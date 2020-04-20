import { Cell, calculateCellState, drawCell, detectCellCollision, Point } from './cell';
import { ProgramInfo } from './webgl/index';
import { repeat } from './utils/repeat';
import { COLOR } from './utils/colors';

export type Cells = Cell[][];

export interface GridSize {
  rows: number;
  columns: number;
}

export interface World {
  height: number;
  width: number;
  border: number;
  cells: Cells;
};

export interface UpdateWorldOptions {
  readonly world: World;
}

export const updateWorld = ({ world }: UpdateWorldOptions): World => {
  const { cells } = world;

  return {
    ...world,
    cells: cells.map((rowCell, row) => {
      return rowCell.map((cell, column) => {
        const aliveNeighborCount = [
          cells[row - 1]?.[column - 1]?.state === 'ALIVE',
          cells[row - 1]?.[column]?.state === 'ALIVE',
          cells[row - 1]?.[column + 1]?.state === 'ALIVE',
          cells[row]?.[column + 1]?.state === 'ALIVE',
          cells[row + 1]?.[column + 1]?.state === 'ALIVE',
          cells[row + 1]?.[column]?.state === 'ALIVE',
          cells[row + 1]?.[column - 1]?.state === 'ALIVE',
          cells[row]?.[column - 1]?.state === 'ALIVE'
        ]
        .filter((i) => i)
        .length;

        return {
          ...cell,
          state: calculateCellState({ cell, aliveNeighborCount })
        };
      });
    }),
  };
};

export interface ResizeWorldOptions {
  readonly height: number;
  readonly width: number;
  readonly border: number;
  readonly cells: Cells;
}

export const resizeWorld = ({
  height,
  width,
  border,
  cells,
}: ResizeWorldOptions): World => {
  const { cellHeight, cellWidth } = calculateCellDimensions({
    height,
    width,
    border,
    rows: cells.length,
    columns: cells[0].length,
  });

  const updatedCells = cells.map((row, rowIndex) => {
    return row.map((cell, columnIndex) => ({
      ...cell,
      height: cellHeight,
      width: cellWidth,
      point: caluclateCellPosition({
        border,
        column: columnIndex,
        row: rowIndex,
        height: cellHeight,
        width: cellWidth
      }),
    }));
  });

  return {
    height,
    width,
    border,
    cells: updatedCells,
  };
};

export interface CreateWorldOptions {
  readonly height: number;
  readonly width: number;
  readonly gridSize: GridSize;
  readonly border: number;
}

export const createWorld = ({
  height,
  width,
  border,
  gridSize: {
    columns,
    rows,
  },
}: CreateWorldOptions): World => {
  const { cellHeight, cellWidth } = calculateCellDimensions({
    height,
    width,
    border,
    rows,
    columns,
  });

  const cells = repeat(rows, (rowIndex) => {
    return repeat<Cell>(columns, (columnIndex) => ({
      height: cellHeight,
      width: cellWidth,
      point: caluclateCellPosition({
        border,
        column: columnIndex,
        row: rowIndex,
        height: cellHeight,
        width: cellWidth
      }),
      color: COLOR.WHITE,
      state: 'DEAD',
    }));
  });

  return {
    height,
    width,
    border,
    cells,
  };
};

export interface UpdateWorldSizeOptions {
  readonly height: number;
  readonly width: number;
  readonly cells: Cells;
  readonly gridSize: GridSize;
  readonly border: number;
}

export const updateWorldSize = ({
  cells,
  height,
  width,
  border,
  gridSize: {
    rows,
    columns,
  },
}: UpdateWorldSizeOptions): World => {
  const { cellHeight, cellWidth } = calculateCellDimensions({
    height,
    width,
    border,
    rows,
    columns,
  });

  const updatedCells = repeat(rows, (rowIndex) => {
    return repeat(columns, (columnIndex) => {
      const existing: Cell | undefined = cells[rowIndex]?.[columnIndex];
      return {
        color: existing?.color ?? COLOR.WHITE,
        state: existing?.state ?? 'DEAD',
        height: cellHeight,
        width: cellWidth,
        point: caluclateCellPosition({
          border,
          column: columnIndex,
          row: rowIndex,
          height: cellHeight,
          width: cellWidth
        }),
      };
    });
  });

  return {
    height,
    width,
    border,
    cells: updatedCells,
  };
};

export interface DrawWorldOptions {
  readonly world: World;
  readonly programInfo: ProgramInfo;
}

export const drawWorld = ({ world, programInfo }: DrawWorldOptions): void => {
  const { context } = programInfo;
  context.useProgram(programInfo.program);

  programInfo.uniforms.resolution([
    context.canvas.width,
    context.canvas.height,
  ]);

  world.cells.forEach((row) => {
    row.forEach((cell) => {
      drawCell({
        programInfo,
        cell,
      });
    });
  });
};

export interface DetectWorldCollisionOptions {
  readonly world: World;
  readonly point: readonly [number, number];
}

export type CollisionResult =
  | {
    readonly collision: false;
  }
  | {
    readonly collision: true;
    readonly cell: Cell;
    readonly position: {
      readonly row: number;
      readonly column: number;
    };
  };

export const detectWorldCollision = ({ world, point }: DetectWorldCollisionOptions): CollisionResult => {
  const result = world.cells.reduce<CollisionResult | null>((acc, row, rowIndex) => {
    if (acc) {
      return acc;
    }

    const foundIndex = row.findIndex((cell) => detectCellCollision({ cell, point }));
    if (foundIndex === -1) {
      return null;
    }

    const cell = world.cells[rowIndex][foundIndex];
    return {
      collision: true,
      cell,
      position: {
        row: rowIndex,
        column: foundIndex,
      },
    };
  }, null);

  return result ?? { collision: false };
};

interface CalculateCellDimensionsOptions {
  readonly height: number;
  readonly width: number;
  readonly border: number;
  readonly rows: number;
  readonly columns: number;
}

const calculateCellDimensions = ({
  height,
  width,
  border,
  rows,
  columns,
}: CalculateCellDimensionsOptions) => ({
  cellHeight: ((height - border) / rows) - border,
  cellWidth: ((width - border) / columns) - border,
});

interface CalculateCellPositionOptions {
  readonly border: number;
  readonly column: number;
  readonly row: number;
  readonly height: number;
  readonly width: number;
}

const caluclateCellPosition = ({
  border,
  column,
  row,
  height,
  width,
}: CalculateCellPositionOptions): Point => [
  (border * (column + 1)) + (column * width),
  (border * (row + 1)) + (row * height),
];
