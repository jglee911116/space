export const hourglassDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float height = abs(p.y);
    if (height > 0.97) return vec4(0.0);
    vec2 crossSection = vec2(p.x - 0.045 * p.y, p.z * 1.28);
    float radial = length(crossSection);
    float knots = noise(p * 13.0);
    float opening = 0.07 + 0.91 * pow(height, 1.45);
    float rim = (radial - opening - 0.032 * (knots - 0.5)) / (0.045 + 0.10 * height);
    float edge = exp(-rim * rim) * smoothstep(0.035, 0.16, height) * (1.0 - smoothstep(0.73, 0.96, height));
    float interior = exp(-pow(radial / max(0.06, opening), 2.0) * 3.0) * smoothstep(0.10, 0.32, height) * (1.0 - smoothstep(0.62, 0.95, height));
    float veins = 0.46 + 0.54 * noise(vec3(crossSection / (0.27 + height), height * 0.4) * 24.0);
    float disk = exp(-pow(p.y / 0.043, 2.0) - pow(radial / 0.36, 2.0) * 2.0);
    float core = exp(-dot(p * vec3(15.0, 42.0, 18.0), p * vec3(15.0, 42.0, 18.0)));
    vec3 base = p.y > 0.0 ? vec3(0.95, 0.29, 0.070) : vec3(0.11, 0.47, 0.78);
    vec2 uv = 0.5 + vec2(p.x + p.z * 0.17, p.y) * 0.47;
    vec3 image = observe(uv, 1.2, base);
    vec3 color = mix(base, image * 1.65, 0.47);
    color = mix(color, vec3(0.14, 0.038, 0.017), clamp(disk - core, 0.0, 1.0));
    color += core * vec3(1.0, 0.50, 0.19);
    return vec4(color, (edge * 5.6 + interior * 2.0) * veins + disk * 4.4 + core * 6.2);
  }
`;

export const bipolarJetDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec2 axis = mat2(0.91, -0.414, 0.414, 0.91) * p.xy;
    float distance = abs(axis.x);
    if (distance > 0.96) return vec4(0.0);
    float bend = 0.054 * sin(distance * 18.0) * distance;
    float radial = length(vec2(axis.y - bend, p.z * 1.27));
    float width = 0.035 + 0.035 * distance;
    float jet = exp(-pow(radial / width, 2.0)) * (1.0 - smoothstep(0.76, 0.96, distance));
    float knots = pow(0.5 + 0.5 * cos(61.0 * distance - motion * 5.0), 5.0);
    float shellDistance = distance + 2.75 * radial * radial;
    float bow = exp(-pow((shellDistance - 0.77) / 0.045, 2.0));
    bow += 0.64 * exp(-pow((shellDistance - 0.57) / 0.037, 2.0));
    bow += 0.40 * exp(-pow((shellDistance - 0.40) / 0.028, 2.0));
    bow *= (1.0 - smoothstep(0.16, 0.31, radial)) * smoothstep(0.21, 0.41, distance);
    float turbulence = noise(p * 23.0);
    vec3 base = mix(vec3(0.98, 0.36, 0.12), vec3(0.37, 0.77, 1.0), smoothstep(0.14, 0.62, distance));
    base = mix(base, vec3(0.99, 0.36, 0.56), smoothstep(0.58, 0.92, distance));
    vec3 image = observe(0.5 + (p.xy + vec2(0.10, -0.15) * p.z) * 0.48, 1.4, base);
    float dust = exp(-length(p * vec3(4.2, 8.0, 6.0)) * 3.6) * 2.2;
    return vec4(mix(base, image * 1.8, 0.43), jet * (3.7 + 7.8 * knots) + bow * (2.4 + turbulence * 5.3) + dust);
  }
`;

export const shockedShellDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float growth = 1.0 + 0.075 * smoothstep(0.0, 18.0, motion);
    vec3 q = p / growth;
    float r = length(q / vec3(0.94, 0.87, 0.77));
    if (r > 1.03) return vec4(0.0);
    float clumps = noise(q * 13.0);
    float threads = 1.0 - smoothstep(0.02, 0.18, abs(noise(q * 22.0) - 0.52));
    float warp = noise(q * 5.2) - 0.5;
    float outer = exp(-pow((r - 0.85 - warp * 0.16) / 0.058, 2.0));
    float inner = exp(-pow((r - 0.66 - warp * 0.26) / 0.14, 2.0));
    float fragments = smoothstep(0.46, 0.83, clumps) * (0.35 + 0.65 * threads);
    vec3 color = mix(vec3(1.0, 0.31, 0.076), vec3(0.91, 0.25, 0.53), clamp(inner, 0.0, 1.0));
    vec3 image = observe(0.5 + (q.xy + q.z * vec2(0.16, -0.12)) * 0.48, 1.1, color);
    color = mix(color, image * 1.63, 0.57);
    return vec4(color, outer * (0.7 + 7.5 * fragments) + inner * (0.22 + 5.8 * fragments));
  }
`;

export const southernRingDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = vec3(p.x, 0.966 * p.y + 0.259 * p.z, 0.966 * p.z - 0.259 * p.y);
    float radial = length(q.xy / vec2(0.90, 0.79));
    float height = abs(q.z);
    if (radial > 1.0 || height > 0.84) return vec4(0.0);
    float knots = noise(q * 15.0);
    float collar = radial - (0.28 + 0.69 * height) - 0.08 * (knots - 0.5);
    float bowl = exp(-pow(collar / 0.077, 2.0)) * (1.0 - smoothstep(0.53, 0.80, height));
    float outer = length(q / vec3(0.90, 0.79, 0.86));
    float bands = pow(0.5 + 0.5 * cos(58.0 * outer + knots * 2.3), 5.0);
    float shells = bands * smoothstep(0.48, 0.61, outer) * (1.0 - smoothstep(0.84, 1.0, outer));
    float angle = atan(q.y, q.x + 0.00001);
    float rays = pow(0.5 + 0.5 * cos(angle * 32.0 + 1.7 * sin(angle * 11.0)), 8.0)
      * smoothstep(0.24, 0.46, radial) * (1.0 - smoothstep(0.61, 0.97, radial)) * exp(-height * 6.0);
    vec3 base = mix(vec3(0.10, 0.52, 0.74), vec3(0.92, 0.42, 0.14), smoothstep(0.41, 0.84, outer));
    vec3 image = observe(0.5 + (q.xy + q.z * vec2(0.11, 0.14)) * 0.48, 1.5, base);
    return vec4(mix(base, image * 1.52, 0.47), bowl * (0.45 + 2.5 * knots) + 2.8 * shells * knots + 0.9 * rays);
  }
`;
export const apepDustDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = vec3(p.x + 0.075, p.y - 0.055, p.z * 1.55);
    float r = length(q);
    if (r > 1.04) return vec4(0.0);
    float azimuth = atan(q.y, q.x + 0.00001);
    float drift = 0.055 * smoothstep(0.0, 16.0, motion);
    float spiralRadius = r - 0.042 * azimuth - drift;
    float grain = noise(q * 17.0);
    float dust = 0.0;
    for (int i = 0; i < 4; ++i) {
      float layer = float(i);
      float shape = spiralRadius - (0.20 + 0.21 * layer) - 0.025 * sin(2.0 * azimuth + layer);
      float gap = smoothstep(-0.93, -0.33, cos(azimuth - 0.55 - 0.16 * layer));
      float openEnd = 1.0 - smoothstep(2.44 + layer * 0.11, 3.13, abs(azimuth));
      dust += exp(-pow(shape / (0.022 + 0.005 * layer), 2.0)) * mix(0.14, 1.0, gap) * openEnd * exp(-0.27 * layer);
    }
    float latitudes = (1.0 - smoothstep(0.20, 0.90, abs(q.z) / max(r, 0.001)));
    vec3 base = mix(vec3(1.0, 0.74, 0.34), vec3(0.80, 0.15, 0.050), smoothstep(0.25, 0.94, r));
    vec3 image = observe(vec2(0.50, 0.49) + vec2(p.x * 0.43, p.y * 0.48) + p.z * vec2(0.06, -0.06), 1.5, base);
    return vec4(mix(base, image * 1.6, 0.42), dust * (3.2 + 4.0 * grain) * latitudes * (1.0 - smoothstep(0.89, 1.02, r)));
  }
`;

export const edgeOnDiskDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float height = abs(p.y);
    float radial = length(p.xz / vec2(1.0, 0.83));
    if (height > 0.98 || abs(p.x) > 0.92) return vec4(0.0);
    bool upper = p.y > 0.0;
    float grain = noise(p * 25.0);
    float dustLane = exp(-pow(p.y / (0.012 + radial * 0.019), 2.0)) * (1.0 - smoothstep(0.25, 0.38, radial));
    float diskSurface = 0.045 + radial * radial * (upper ? 0.94 : 0.60);
    float scattering = exp(-pow((height - diskSurface) / (0.047 + radial * 0.045), 2.0))
      * (1.0 - smoothstep(0.22, 0.44, radial)) * (0.65 + 0.35 * grain);

    float jetRadius = length(vec2(p.x - 0.020 * height * sin(height * 10.0), p.z)) / (0.018 + height * 0.027);
    float jet = exp(-jetRadius * jetRadius) * smoothstep(0.055, 0.15, height)
      * (1.0 - smoothstep(upper ? 0.77 : 0.37, upper ? 0.98 : 0.68, height)) * (upper ? 1.0 : 0.30);
    float knots = pow(0.5 + 0.5 * cos(height * 38.0 - motion * 5.0), 3.0);
    float windWall = radial - (0.05 + height * 0.40);
    float wind = exp(-pow(windWall / (0.032 + height * 0.054), 2.0)) * smoothstep(0.10, 0.21, height)
      * (1.0 - smoothstep(upper ? 0.36 : 0.49, upper ? 0.63 : 0.79, height));
    vec2 tailAxis = vec2(-1.23 * height - 0.034 * sin(height * 12.0), -0.22 * height);
    vec2 tailOffset = (p.xz - tailAxis) / vec2(0.064 + 0.055 * height, 0.13);
    float tail = upper ? 0.0 : exp(-dot(tailOffset, tailOffset))
      * smoothstep(0.11, 0.23, height) * (1.0 - smoothstep(0.55, 0.69, height));

    vec3 base = mix(vec3(0.075, 0.33, 0.83), vec3(0.93, 0.67, 0.42), min(1.0, scattering));
    base = mix(base, mix(vec3(0.86, 0.055, 0.32), vec3(0.28, 0.04, 0.76), height), min(1.0, jet));
    base = mix(base, vec3(0.014, 0.19, 0.79), tail);
    vec3 image = observe(vec2(0.50, 0.50) + (p.xy + p.z * vec2(0.075, -0.035)) * 0.48, 0.65, base);
    float infrared = smoothstep(0.01, 0.48, max(image.r, max(image.g, image.b)));
    vec3 color = mix(base, image * 1.8, mapped ? 0.32 + 0.34 * infrared : 0.0);
    color = mix(color, vec3(0.15, 0.048, 0.009), dustLane);
    float gas = scattering * (4.0 + infrared * 5.4) + wind * (0.40 + infrared * 1.35)
      + jet * (7.2 + 4.3 * knots) + tail * (2.1 + infrared * 9.0) * (0.50 + 0.50 * grain);
    return vec4(color, gas * (1.0 - 0.88 * dustLane) + dustLane * 10.0);
  }
`;

export const cartwheelDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec2 major = vec2(0.54, 0.842);
    vec2 minor = vec2(-major.y, major.x);
    vec2 plane = vec2(dot(p.xy, major) / 0.91, dot(p.xy, minor) / 0.73);
    float r = length(plane);
    if (r > 1.13 || abs(p.z) > 0.29) return vec4(0.0);
    float angle = atan(plane.y, plane.x + 0.00001);
    float grain = noise(vec3(p.xy * 44.0, p.z * 12.0));
    float rimRadius = 0.95 + 0.034 * sin(3.0 * angle + 0.7) + 0.023 * sin(7.0 * angle - 1.2);
    float rim = exp(-pow((r - rimRadius) / 0.102, 2.0));
    vec2 coreOffset = p.xy - vec2(-0.18, -0.064);
    float coreRadius = length(vec2(dot(coreOffset, major) / 0.26, dot(coreOffset, minor) / 0.17));
    float inner = exp(-pow((coreRadius - 0.73) / 0.31, 2.0));
    float bulge = exp(-coreRadius * coreRadius * 2.6 - pow(p.z / 0.105, 2.0));
    float edge = 1.0 - smoothstep(0.98, 1.12, r);
    float thinDisk = exp(-pow((p.z - 0.026 * sin(2.0 * angle) * r) / (0.037 + rim * 0.041), 2.0));
    vec3 base = mix(vec3(0.72, 0.16, 0.11), vec3(0.15, 0.34, 0.83), smoothstep(0.26, 0.79, grain));
    vec2 uv = vec2(0.635, 0.472) + p.xy * vec2(0.30, 0.326);
    vec3 image = observe(uv, 0.0, base * 0.24);
    float brightness = dot(image, vec3(0.36, 0.36, 0.28));
    float signal = smoothstep(0.008, 0.39, brightness);
    float foregroundStar = smoothstep(0.011, 0.032, length(uv - vec2(0.864, 0.551)));
    float observedStructure = (0.20 + 0.80 * foregroundStar) * signal * (0.63 + 0.37 * grain);
    float fallbackSpokes = pow(0.5 + 0.5 * sin(9.0 * angle - 10.5 * r + 1.9 * sin(angle * 3.0)), 8.0);
    float disk = mapped
      ? 41.0 * observedStructure + 4.5 * rim + 4.1 * inner
      : rim * (11.0 + 11.0 * grain) + 11.0 * inner + 5.0 * fallbackSpokes;
    vec3 color = mapped ? mix(base * 0.30, image * 1.55, 0.89) : base;
    color = mix(color, vec3(0.77, 0.47, 0.30), 0.37 * bulge);
    return vec4(color, (thinDisk * disk + 10.0 * bulge) * edge);
  }
`;
