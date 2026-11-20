// Value noise shared by the sun and planet surfaces.
const noise = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec4 a = vec4(hash(i), hash(i + vec3(1, 0, 0)), hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)));
  i.z += 1.0;
  vec4 b = vec4(hash(i), hash(i + vec3(1, 0, 0)), hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)));
  vec4 n = mix(a, b, f.z);
  return mix(mix(n.x, n.y, f.x), mix(n.z, n.w, f.x), f.y);
}
`;

export const surfaceVertex = /* glsl */ `
  varying vec3 surface;
  varying vec3 viewNormal;
  varying vec3 viewDirection;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    surface = position;
    viewNormal = normalMatrix * normal;
    viewDirection = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const surfaceFragment = /* glsl */ `
  uniform float surfacePhase;
  uniform float surfaceShear;
  uniform vec3 surfaceDark;
  uniform vec3 surfaceHot;
  varying vec3 surface;
  varying vec3 viewNormal;
  varying vec3 viewDirection;

  ${noise}

  void main() {
    vec3 p = normalize(surface);
    float angle = surfacePhase + surfaceShear * p.y * p.y;
    float c = cos(angle);
    float s = sin(angle);
    p.xz = mat2(c, s, -s, c) * p.xz;
    float flow = noise(p * 9.0 + noise(p * 4.0) * 1.6);
    float footprint = length(fwidth(p));
    float fineWeight = 1.0 - smoothstep(0.5, 1.5, footprint * 214.0);
    float coarseWeight = 1.0 - smoothstep(0.5, 1.5, footprint * 105.0);
    float granules = mix(0.5, noise(p * 105.0), coarseWeight) * 0.68
                   + mix(0.5, noise(p * 214.0), fineWeight) * 0.32;
    float plasma = smoothstep(0.18, 0.85, flow * 0.6 + granules * 0.4);
    float center = max(dot(normalize(viewNormal), normalize(viewDirection)), 0.0);
    vec3 color = mix(surfaceDark, surfaceHot, plasma);
    color *= mix(0.57, 1.08, pow(center, 0.45));
    color += surfaceHot * vec3(0.31, 0.10, 0.03) * pow(1.0 - center, 6.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const supergiantFragment = /* glsl */ `
  uniform vec3 surfaceDark;
  uniform vec3 surfaceBright;
  uniform float cellScale;
  uniform float brightness;
  varying vec3 surface;
  varying vec3 viewNormal;
  varying vec3 viewDirection;

  ${noise}

  void main() {
    vec3 p = normalize(surface);
    vec3 warp = vec3(noise(p * 4.2), noise(p * 4.2 + 13.0), noise(p * 4.2 + 29.0));
    vec3 q = p * cellScale + (warp - 0.5) * 1.8;
    float cells = noise(q);
    float substructure = noise(q * 2.7);
    float grain = noise(q * 7.0);
    float textureValue = smoothstep(0.23, 0.78, cells * 0.63 + substructure * 0.25 + grain * 0.12);
    float center = max(dot(normalize(viewNormal), normalize(viewDirection)), 0.0);
    vec3 color = mix(surfaceDark, surfaceBright, textureValue);
    color *= brightness * mix(0.42, 1.0, pow(center, 0.55));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export const coronaVertex = /* glsl */ `
  varying vec2 offset;

  void main() {
    offset = position.xy;
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * (center + vec4(offset, 0.0, 0.0));
  }
`;

export const coronaFragment = /* glsl */ `
  uniform float radius;
  uniform vec3 tint;
  uniform float flowTime;
  uniform float intensity;
  varying vec2 offset;

  void main() {
    float distance = length(offset) / radius;
    float angle = atan(offset.y, offset.x);
    float limb = max(distance - 1.0, 0.0);
    float rays = 0.66 + 0.21 * sin(angle * 8.0 + sin(angle * 3.0 + flowTime * 0.7));
    rays += 0.13 * cos(angle * 21.0 - flowTime * 0.4);
    float filaments = pow(0.5 + 0.5 * sin(angle * 38.0 + limb * 5.0 - flowTime * 1.45), 4.0);
    float glow = 0.37 * exp(-5.0 * limb / rays) + 0.42 * exp(-23.0 * limb);
    glow += (0.11 + 0.10 * filaments) * exp(-3.4 * limb);
    float edge = 1.0 - smoothstep(2.45, 3.15, distance);
    float outside = smoothstep(0.98, 1.025, distance);
    vec3 glowTint = mix(tint, vec3(1.0), 0.48 * exp(-8.0 * limb));
    gl_FragColor = vec4(glowTint, clamp(intensity * glow * edge * outside, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

export const planetVertex = /* glsl */ `
  varying vec3 localPoint;
  varying vec3 viewPoint;
  varying vec3 viewOffset;
  varying vec3 viewNormal;

  void main() {
    localPoint = normalize(position);
    vec4 point = modelViewMatrix * vec4(position, 1.0);
    viewPoint = point.xyz;
    viewOffset = mat3(modelViewMatrix) * position;
    viewNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * point;
  }
`;

export const planetFragment = /* glsl */ `
  uniform vec3 dark;
  uniform vec3 middle;
  uniform vec3 light;
  uniform vec3 lightOffset;
  uniform int style;
  uniform bool redSpot;
  uniform bool polarCaps;

  varying vec3 localPoint;
  varying vec3 viewPoint;
  varying vec3 viewOffset;
  varying vec3 viewNormal;

  ${noise}

  void main() {
    vec3 p = normalize(localPoint);
    float flow = noise(p * 5.0);
    float detail = noise(p * 19.0 + flow * 1.7);
    float grain = noise(p * 69.0);
    float latitude = p.y;
    float bands = 0.5 + 0.29 * sin(latitude * 39.0 + flow * 2.8)
                      + 0.14 * sin(latitude * 83.0 + detail * 2.1);
    vec3 color;

    if (style == 1) {
      float elevation = noise(p * 3.5 + 8.0) * 0.73 + detail * 0.27;
      float land = smoothstep(0.52, 0.56, elevation);
      color = mix(dark, mix(middle, light, smoothstep(0.59, 0.78, elevation)), land);
      float cloud = smoothstep(0.59, 0.76, noise(p * vec3(11.0, 19.0, 11.0) + detail * 3.0));
      float ice = smoothstep(0.88, 0.99, abs(latitude) + detail * 0.07);
      color = mix(color, vec3(0.82, 0.9, 0.97), max(cloud * 0.83, ice));
    } else if (style == 2 || style == 5) {
      color = mix(dark, middle, smoothstep(0.23, 0.68, flow * 0.70 + detail * 0.30));
      color = mix(color, light, grain * grain * 0.48);
      if (polarCaps) color = mix(color, vec3(0.86, 0.83, 0.79), smoothstep(0.92, 1.02, abs(latitude) + detail * 0.07));
      if (style == 5 && p.z < 0.0) {
        vec2 heart = vec2(p.x * 1.7, p.y * 1.7 + 0.25);
        float base = dot(heart, heart) - 0.40;
        float boundary = base * base * base - heart.x * heart.x * heart.y * heart.y * heart.y;
        float frost = 1.0 - smoothstep(-0.008, 0.012, boundary + (detail - 0.5) * 0.02);
        color = mix(color, mix(light, vec3(0.88, 0.84, 0.75), detail), frost * 0.96);
      }
    } else {
      float pattern = style == 0 ? detail * 0.62 + bands * 0.38 : bands * 0.78 + detail * 0.22;
      if (style == 4) pattern = 0.42 + bands * 0.28 + detail * 0.21;
      color = mix(dark, middle, smoothstep(0.12, 0.60, pattern));
      color = mix(color, light, smoothstep(0.43, 0.86, pattern));
      if (redSpot && p.z > 0.0) {
        float spot = length(vec2((p.x - 0.22) * 5.8, (latitude + 0.24) * 12.0));
        color = mix(color, mix(dark, middle, detail), 0.83 * (1.0 - smoothstep(0.73, 1.1, spot)));
      }
    }

    vec3 normal = normalize(viewNormal);
    float sun = max(dot(normal, normalize(mat3(viewMatrix) * lightOffset - viewOffset)), 0.0);
    float rim = pow(1.0 - max(dot(normal, normalize(-viewPoint)), 0.0), 4.0);
    color *= 0.22 + 0.78 * pow(sun, 0.65);
    if (style != 2) color += light * rim * (0.05 + 0.13 * sun);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;
