export const CORE_SHELL_VERTEX = `
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vLocal;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const CORE_SHELL_FRAGMENT = `
uniform float uTime;
uniform float uAudio;
uniform float uBass;
uniform vec3 uViewPos;

varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vLocal;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(17.1, 113.3, 57.7))) * 43758.5453);
}

void main() {
  vec3 viewDir = normalize(uViewPos - vWorld);
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.3);

  float depth = 1.0 - smoothstep(0.05, 1.2, length(vLocal));
  float wave = sin((vLocal.y * 7.0) + (uTime * 0.72)) * 0.5 + 0.5;
  float noise = hash(vLocal * 4.0 + vec3(uTime * 0.08, 0.0, uTime * 0.05));

  vec3 indigo = vec3(0.09, 0.11, 0.26);
  vec3 violet = vec3(0.30, 0.20, 0.62);
  vec3 blue = vec3(0.22, 0.57, 0.95);
  vec3 amber = vec3(0.88, 0.63, 0.30);

  vec3 base = mix(indigo, violet, wave);
  vec3 glow = mix(blue, amber, clamp(uBass * 1.35, 0.0, 1.0));
  vec3 color = mix(base, glow, depth * (0.45 + uAudio * 0.9));

  float transmission = 0.16 + fresnel * 0.54;
  float alpha = clamp((0.34 + depth * 0.35 + fresnel * 0.26) + (noise - 0.5) * 0.06, 0.0, 0.95);

  gl_FragColor = vec4(color * (0.82 + transmission), alpha);
}
`

export const NETWORK_VERTEX = `
attribute float aAlong;
attribute float aPhase;
attribute float aSpeed;
attribute float aBrightness;

varying float vAlong;
varying float vPhase;
varying float vSpeed;
varying float vBrightness;

void main() {
  vAlong = aAlong;
  vPhase = aPhase;
  vSpeed = aSpeed;
  vBrightness = aBrightness;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const NETWORK_FRAGMENT = `
uniform float uTime;
uniform float uAudio;
uniform float uHarmony;

varying float vAlong;
varying float vPhase;
varying float vSpeed;
varying float vBrightness;

void main() {
  float stream = sin((vAlong * 36.0) - (uTime * (2.1 + vSpeed * 1.4)) + vPhase);
  float streamMask = smoothstep(0.72, 0.98, stream);

  float packetPos = fract((uTime * (0.09 + vSpeed * 0.06)) + (vPhase * 0.15));
  float packet = exp(-abs(vAlong - packetPos) * 52.0);

  float energy = (streamMask * 0.42) + (packet * 1.2) + (uAudio * 0.4);
  float harmonyBoost = 1.0 + (uHarmony * 0.7);

  vec3 base = vec3(0.24, 0.34, 0.87);
  vec3 hot = vec3(0.93, 0.68, 0.34);
  vec3 cold = vec3(0.41, 0.75, 1.0);

  vec3 color = mix(base, cold, streamMask);
  color = mix(color, hot, packet * 0.7);

  float alpha = clamp((0.12 + energy * 0.72) * vBrightness * harmonyBoost, 0.0, 1.0);
  gl_FragColor = vec4(color * (0.75 + energy * 0.46), alpha);
}
`

export const DUST_VERTEX = `
attribute float aSize;
attribute float aLayer;

uniform float uParallax;

varying float vLayer;

void main() {
  vLayer = aLayer;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (130.0 / -mvPosition.z) * (1.0 + (uParallax * vLayer));
  gl_Position = projectionMatrix * mvPosition;
}
`

export const DUST_FRAGMENT = `
varying float vLayer;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = dot(uv, uv);
  float alpha = smoothstep(0.25, 0.0, dist) * (0.3 + vLayer * 0.32);
  vec3 color = mix(vec3(0.43, 0.50, 0.89), vec3(0.88, 0.67, 0.39), vLayer * 0.18);
  gl_FragColor = vec4(color, alpha);
}
`
