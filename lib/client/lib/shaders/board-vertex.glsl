attribute vec2 position;
attribute vec4 vertexColor;

uniform vec2 resolution;
varying vec4 color;

vec2 resolutionToClipspace(vec2 position, vec2 resolution) {
  vec2 zeroToOne = position / resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;

  return zeroToTwo - 1.0;
}

void main() {
  vec2 clipSpace = resolutionToClipspace(position, resolution);

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  color = vertexColor;
}
