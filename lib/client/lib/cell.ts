import { ProgramInfo } from './webgl/index';
import { COLOR } from './utils/colors';

export type CellState = 'ALIVE' | 'DEAD';

export type Point = readonly [number, number];

export interface Cell {
  readonly point: Point;
  readonly height: number;
  readonly width: number;
  readonly color: readonly [number, number, number, number];
  readonly state: CellState;
}

export interface DrawCellOptions {
  readonly programInfo: ProgramInfo;
  readonly cell: Cell;
}

export const drawCell = ({
  programInfo,
  cell: {
    point,
    height,
    width,
    state,
  },
}: DrawCellOptions) => {
  const { context } = programInfo;
  const x1 = point[0];
  const x2 = x1 + width;
  const y1 = point[1];
  const y2 = y1 + height;

  programInfo.attributes.position({
    buffer: programInfo.buffers.vertex,
    normalize: false,
    offset: 0,
    size: 2,
    stride: 0,
    type: context.FLOAT,
  });

  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([
      x1, y1,
      x2, y1,
      x1, y2,
      x1, y2,
      x2, y2,
      x2, y1,
    ]),
    context.STATIC_DRAW,
  );

  programInfo.attributes.vertexColor({
    buffer: programInfo.buffers.color,
    normalize: false,
    offset: 0,
    size: 4,
    stride: 0,
    type: context.FLOAT,
  });

  const color: readonly number[] = mapStateToColor(state);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array(color.concat(color, color, color, color, color)),
    context.STATIC_DRAW,
  );

  context.drawArrays(context.TRIANGLES, 0, 6);
};

export interface CalculateCellStateOptions {
  readonly cell: Cell;
  readonly aliveNeighborCount: number;
}

export const calculateCellState = ({ cell, aliveNeighborCount }: CalculateCellStateOptions) => {
  switch (cell.state) {
    case 'ALIVE':
      return aliveNeighborCount === 2 || aliveNeighborCount === 3
        ? 'ALIVE'
        : 'DEAD';

    case 'DEAD':
      return aliveNeighborCount === 3 ? 'ALIVE' : 'DEAD';

    default:
      return 'DEAD';
  }
};

interface DetectCollisionOptions {
  readonly cell: Cell;
  readonly point: readonly [number, number];
}

export const detectCellCollision = ({ cell, point }: DetectCollisionOptions): boolean => {
  const [cellX, cellY] = cell.point;
  const [x, y] = point;

  const withinX = cellX <= x && (cellX + cell.width) >= x;
  const withinY = cellY <= y && (cellY + cell.height) >= y;

  return withinX && withinY;
};

export interface ToggleCellOptions {
  readonly cell: Cell;
}

export const toggleCell = ({ cell }: ToggleCellOptions): Cell => {
  const state = cell.state === 'ALIVE' ? 'DEAD' : 'ALIVE';
  const color = mapStateToColor(state);

  return {
    ...cell,
    state,
    color,
  };
};

export const mapStateToColor = (state: CellState) => state === 'ALIVE'
  ? COLOR.BLACK
  : COLOR.WHITE;
