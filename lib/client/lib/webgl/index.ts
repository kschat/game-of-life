import { repeat } from '../utils/repeat';

export class WebGLError extends Error {
  constructor(message: string | Error = '') {
    super(typeof message !== 'string' ? message.message : message)
    this.name = this.constructor.name;
  }
}

export const loadContext = (selector: string): WebGLRenderingContext => {
  const canvas = document.querySelector<HTMLCanvasElement>(selector);
  if (!canvas) {
    throw new WebGLError(`Could not find Canvas with selector "${selector}"`);
  }

  const context = canvas.getContext('webgl');
  if (!context) {
    throw new WebGLError('Could not load WebGL context');
  }

  return context;
};

export const downloadShaderSource = async (path: string): Promise<string> => {
  const response = await fetch(path);
  return response.text();
};

export interface CreateShaderOptions {
  readonly context: WebGLRenderingContext;
  readonly path: string;
  readonly type: GLenum;
}

export const createShader = async ({
  path,
  context,
  type,
}: CreateShaderOptions): Promise<WebGLShader> => {
  const shaderSource = await downloadShaderSource(path);
  const shader = context.createShader(type);
  if (!shader) {
    throw new WebGLError(`Could not create shader of type "${type}"`);
  }

  context.shaderSource(shader, shaderSource);
  context.compileShader(shader);

  const status = context.getShaderParameter(shader, context.COMPILE_STATUS);
  if (!status) {
    const errorLog = context.getShaderInfoLog(shader);
    context.deleteShader(shader);
    throw new WebGLError(`Failed creating shader: ${errorLog}`);
  }

  return shader;
};

export interface CreateProgramOptions {
  readonly context: WebGLRenderingContext;
  readonly vertexShader: WebGLShader;
  readonly fragmentShader: WebGLShader;
}

export const createProgram = ({
  context,
  vertexShader,
  fragmentShader,
}: CreateProgramOptions): WebGLProgram => {
  const program = context.createProgram();
  if (!program) {
    throw new WebGLError('Failed to create WebGL program');
  }

  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);

  const success = context.getProgramParameter(program, context.LINK_STATUS);
  if (!success) {
    const errorLog = context.getProgramInfoLog(program);
    context.deleteProgram(program);
    throw new WebGLError(`Failed to create program: ${errorLog || 'Unknown error'}`);
  }

  return program;
};

export interface CreateProgramInfoOptions {
  readonly context: WebGLRenderingContext;
  readonly vertexShaderPath: string;
  readonly fragmentShaderPath: string;
  readonly bufferNames: readonly string[];
}

export interface ProgramInfo {
  readonly context: WebGLRenderingContext;
  readonly program: WebGLProgram;
  readonly attributes: Record<string, AttributeSetter>;
  readonly uniforms: Record<string, UniformSetter>;
  readonly buffers: Record<string, WebGLBuffer>;
}

export const createProgramInfo = async ({
  context,
  vertexShaderPath,
  fragmentShaderPath,
  bufferNames,
}: CreateProgramInfoOptions) => {
  const [vertexShader, fragmentShader] = await Promise.all([
    createShader({
      context,
      path: vertexShaderPath,
      type: context.VERTEX_SHADER,
    }),
    createShader({
      context,
      path: fragmentShaderPath,
      type: context.FRAGMENT_SHADER,
    }),
  ]);

  const program = createProgram({
    context,
    vertexShader,
    fragmentShader,
  });

  const attributes = loadAttributes({ context, program });
  const uniforms = loadUniform({ context, program });

  const buffers = bufferNames.reduce<Record<string, WebGLBuffer>>((acc, name) => {
    const buffer = context.createBuffer();
    if (!buffer) {
      throw new WebGLError(`Can't create buffer`);
    }

    acc[name] = buffer;
    return acc;
  }, {});

  return {
    context,
    program,
    attributes,
    uniforms,
    buffers,
  };
};

interface LoadAttributesOptions {
  readonly context: WebGLRenderingContext;
  readonly program: WebGLProgram;
}

const loadAttributes = ({ context, program }: LoadAttributesOptions) => {
  const attributeCount = context.getProgramParameter(program, context.ACTIVE_ATTRIBUTES);

  return repeat(attributeCount, (i) => i)
    .reduce<Record<string, AttributeSetter>>((acc, index) => {
      const info = context.getActiveAttrib(program, index);
      if (!info) {
        throw new WebGLError(`Could not query attribute at index "${index}"`);
      }

      const attributeIndex = context.getAttribLocation(program, info.name);
      acc[info.name] = createAttributeSetter(context, attributeIndex);

      return acc;
    }, {});
};

interface AttributeSetterOptions {
  readonly size: number;
  readonly type: GLenum;
  readonly normalize: boolean;
  readonly stride: number;
  readonly offset: number;
  readonly buffer: WebGLBuffer;
}

type AttributeSetter = ReturnType<typeof createAttributeSetter>;

const createAttributeSetter = (context: WebGLRenderingContext, index: number) => {
  return (options: AttributeSetterOptions) => {
    context.bindBuffer(context.ARRAY_BUFFER, options.buffer);
    context.enableVertexAttribArray(index);
    context.vertexAttribPointer(
      index,
      options.size,
      options.type,
      options.normalize,
      options.stride,
      options.offset,
    );
  };
};

interface LoadUniformOptions {
  readonly context: WebGLRenderingContext;
  readonly program: WebGLProgram;
}

const loadUniform = ({ context, program }: LoadUniformOptions) => {
  const uniformCount = context.getProgramParameter(program, context.ACTIVE_UNIFORMS);

  return repeat(uniformCount, (i) => i)
    .reduce<Record<string, UniformSetter>>((acc, index) => {
      const info = context.getActiveUniform(program, index);
      if (!info) {
        throw new WebGLError(`Could not query uniform at index "${index}"`);
      }

      const label = info.name.slice(-3) === '[0]'
        ? info.name.slice(0, -3)
        : info.name;

      acc[label] = createUniformSetter({
        program,
        info,
        context,
      });

      return acc;
    }, {});

};

interface CreateUniformSetterOptions {
  readonly context: WebGLRenderingContext;
  readonly program: WebGLProgram;
  readonly info: WebGLActiveInfo;
}

// type UniformSetter = ReturnType<typeof createUniformSetter>;
// Float32List | number | Int32List
type UniformSetter = (value: any) => void;

const createUniformSetter = ({
  program,
  info,
  context,
}: CreateUniformSetterOptions) => {
  const { name, type, size } = info;
  const location = context.getUniformLocation(program, name);
  if (!location) {
    throw new WebGLError(`Uniform "${name}" does not exist`);
  }

  // const a = context.uniform2fv.bind(location, context);
  const isArray = size > 1 && name.slice(-3) === '[0]';

  switch (type) {
    case context.FLOAT:
      return isArray
        ? context.uniform1fv.bind(context, location)
        : context.uniform1f.bind(context, location);

    case context.FLOAT_VEC2:
      return context.uniform2fv.bind(context, location);

    case context.FLOAT_VEC3:
      return context.uniform3fv.bind(context, location);

    case context.FLOAT_VEC4:
      return context.uniform4fv.bind(context, location);

    case context.INT:
      return isArray
        ? context.uniform1iv.bind(context, location)
        : context.uniform1i.bind(context, location);

    case context.INT_VEC2:
    case context.BOOL_VEC2:
      return context.uniform2iv.bind(context, location);

    case context.INT_VEC3:
    case context.BOOL_VEC3:
      return context.uniform3iv.bind(context, location);

    case context.INT_VEC4:
    case context.BOOL_VEC4:
      return context.uniform4iv.bind(context, location);

    case context.BOOL:
      return context.uniform1iv.bind(context, location);

    case context.FLOAT_MAT2:
      return context.uniformMatrix2fv.bind(context, location, false);

    case context.FLOAT_MAT3:
      return context.uniformMatrix3fv.bind(context, location, false);

    case context.FLOAT_MAT4:
      return context.uniformMatrix4fv.bind(context, location, false);

    default:
      throw new WebGLError(`unknown type "${type}"`);
  }
};

export interface GetViewportOptions {
  readonly canvas: HTMLCanvasElement;
  readonly devicePixelRatio? : number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export const getViewportSize = ({ canvas, devicePixelRatio = 1 }: GetViewportOptions): ViewportSize => ({
    height: Math.floor(canvas.clientHeight * devicePixelRatio),
    width: Math.floor(canvas.clientWidth * devicePixelRatio),
});

export interface ResizeViewportOptions {
  readonly canvas: HTMLCanvasElement;
  readonly devicePixelRatio? : number;
}

export interface ViewportResize extends ViewportSize{
  readonly resize: boolean;
}

export const resizeViewport = ({ canvas, devicePixelRatio = 1 }: ResizeViewportOptions): ViewportResize => {
  const { height, width } = getViewportSize({ canvas, devicePixelRatio });
  let resize = false;
  if (
    canvas.height !== height ||
    canvas.width !== width
  ) {
    resize = true;
    canvas.height = height;
    canvas.width = width;
  }

  return {
    resize,
    width,
    height
  }
};
