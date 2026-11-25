export const horseheadDensity = /* glsl */ `
  float clumpDist(vec3 p, vec3 center, vec3 axes, float slope) {
    vec3 q = p - center;
    q.x -= slope * q.y;
    return (length(q / axes) - 1.0) * min(axes.x, min(axes.y, axes.z));
  }

  float blendClumps(float a, float b, float width) {
    float overlap = max(width - abs(a - b), 0.0) / width;
    return min(a, b) - overlap * overlap * width * 0.25;
  }

  vec4 density(vec3 p) {
    float grain = noise(p * 42.0);
    float ridges = noise(p * vec3(11.0, 18.0, 12.0));
    float neck = clumpDist(p, vec3(0.43, -0.32, -0.07), vec3(0.60, 0.98, 0.39), 0.24);
    float head = clumpDist(p, vec3(-0.19, 0.40, -0.03), vec3(0.45, 0.38, 0.31), 0.48);
    float muzzle = clumpDist(p, vec3(-0.62, 0.12, 0.17), vec3(0.27, 0.19, 0.23), 0.79);
    float crest = clumpDist(p, vec3(0.05, 0.73, -0.05), vec3(0.21, 0.19, 0.24), -0.10);
    float surface = blendClumps(blendClumps(neck, head, 0.22), blendClumps(muzzle, crest, 0.12), 0.16);
    float veins = noise(p * vec3(24.0, 7.0, 27.0) + ridges * 1.8);
    surface += (ridges - 0.53) * 0.095 + (grain - 0.5) * 0.048 + (veins - 0.5) * 0.046;
    float cloud = (1.0 - smoothstep(-0.08, 0.045, surface)) * (0.55 + 0.45 * ridges);
    float rim = exp(-abs(surface) * 37.0) * (0.38 + 0.62 * grain);
    float lightFacing = smoothstep(-0.40, 0.72, p.y - 0.58 * p.x + 0.16 * p.z);
    float dustLight = rim * (0.35 + lightFacing * 1.55);
    // The illuminated gas follows the same irregular surface as the dust.
    // Its density falls off outward in depth as well as in the image plane.
    float sheath = exp(-max(surface, 0.0) * 8.4) * smoothstep(-0.10, 0.035, surface);
    float ionized = sheath * (0.30 + 0.86 * lightFacing) * (0.42 + 0.58 * veins);
    vec3 shade = mix(vec3(0.009, 0.016, 0.022), vec3(0.13, 0.18, 0.15), max(grain * 0.45, veins * veins));
    float depth = localEye.z < 0.0 ? -p.z : p.z;
    vec2 xy = observedPlane(p, depth);
    vec2 uv = vec2(0.50, 0.51) + xy * vec2(0.47, 0.47);
    vec3 image = observe(uv, 0.45, shade);
    vec3 view = abs(normalize(localEye));
    vec2 imageEdge = min(uv, 1.0 - uv);
    float imageFade = smoothstep(0.02, 0.15, min(imageEdge.x, imageEdge.y));
    float front = mapped ? smoothstep(0.47, 0.98, view.z) * imageFade : 0.0;
    vec2 flank = vec2(p.z + 0.36 * p.x, mix(p.y, p.x, view.y * view.y));
    vec3 flankColor = observe(vec2(0.64, 0.48) + flank * vec2(0.23, 0.36), 0.65, shade);
    shade = mix(shade, flankColor * 0.34, mapped ? 0.32 * (1.0 - front) * veins : 0.0);
    vec3 rimColor = mix(vec3(0.91, 0.58, 0.30), vec3(0.70, 0.87, 0.68), ridges);
    vec3 gasColor = mix(vec3(0.48, 0.16, 0.24), vec3(0.74, 0.32, 0.41), lightFacing);
    vec3 color = shade * cloud * 8.5 + rimColor * dustLight + gasColor * ionized;
    float total = cloud * 8.5 + dustLight + ionized;
    color = mix(color / max(total, 0.0001), image * 1.03, front * 0.70);
    vec3 boundary = vec3(1.0) - smoothstep(vec3(0.70, 0.67, 0.62), vec3(0.99), abs(p));
    float dissolve = 1.0 - smoothstep(0.78, 1.30, length((p + vec3(0.0, 0.11, 0.0)) * vec3(0.89, 0.88, 1.16)) + 0.12 * (ridges - 0.5));
    return vec4(color, total * boundary.x * boundary.y * boundary.z * dissolve);
  }
`;

export const wolfRayetDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = p * vec3(1.14, 0.90, 1.13);
    float r = length(q);
    if (r > 1.0 || r < 0.085) return vec4(0.0);
    vec3 radial = q / r;
    float grain = noise(p * 43.0);
    float crowd = noise(p * 15.0 + radial * 2.1);
    float lobes = noise(radial * 4.1 + vec3(1.7, -3.0, 6.0));
    float filaments = noise(radial * 31.0 + vec3(r * 9.0, 1.4, 2.7));
    float buckets = smoothstep(0.37, 0.84, crowd * 0.72 + grain * 0.28);
    float clumps = buckets * buckets * (0.30 + 0.70 * filaments);
    float brokenShell = exp(-abs(r - 0.56 - 0.25 * (lobes - 0.5)) * 5.7);
    float range = smoothstep(0.09, 0.25, r) * (1.0 - smoothstep(0.76, 1.0, r));
    float gas = range * (0.18 + clumps * 15.5 + 1.9 * filaments * brokenShell) * (0.58 + 0.42 * abs(radial.y));
    vec3 base = mix(vec3(0.39, 0.075, 0.26), vec3(1.0, 0.67, 0.36), clamp(0.72 * (1.0 - smoothstep(0.19, 0.78, r)) + clumps * 0.65, 0.0, 1.0));
    float depth = localEye.z < 0.0 ? -p.z : p.z;
    vec2 xy = observedPlane(p, depth);
    vec3 image = observe(vec2(0.515, 0.493) + xy * 0.45, 0.65, base);
    vec3 view = abs(normalize(localEye));
    float front = mapped ? smoothstep(0.42, 0.98, view.z) : 0.0;
    vec2 flank = vec2(p.z + 0.18 * p.x, mix(p.y, p.x, view.y * view.y));
    vec3 secondary = observe(vec2(0.51, 0.50) + flank * vec2(0.37, 0.38), 0.8, base);
    float lateral = mapped ? 0.53 * (1.0 - front) : 0.0;
    image = mix(image, secondary, 1.0 - front);
    float outsideStar = smoothstep(0.12, 0.33, length(p.xy));
    float signal = smoothstep(0.025, 0.56, max(image.r, max(image.g, image.b)));
    float nebularColor = 1.0 - 0.86 * smoothstep(0.03, 0.18, image.b - image.r);
    float textureWeight = (front + lateral) * outsideStar * nebularColor;
    gas *= mix(1.0, 0.26 + 1.9 * signal, textureWeight);
    vec3 color = mix(base * (0.49 + 0.69 * filaments), image * 1.39, 0.76 * textureWeight);
    return vec4(color, gas);
  }
`;

export const tychoShellDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = p * vec3(0.97, 1.04, 1.0);
    float r = length(q);
    if (r > 1.03 || r < 0.23) return vec4(0.0);
    vec3 dir = q / r;
    float rough = noise(dir * 8.0) - 0.5;
    float knots = noise(p * 37.0);
    float cells = noise(p * 13.0 + knots * 0.23);
    float shellOffset = (r - 0.88 - 0.12 * rough) / (0.024 + 0.028 * cells);
    float shock = exp(-shellOffset * shellOffset) * (0.61 + 1.55 * knots);
    float fingers = smoothstep(0.32, 0.70, noise(dir * 18.0 + r * 2.5));
    float stripes = pow(0.5 + 0.5 * sin(dot(p, vec3(37.0, -18.0, 20.0)) + rough * 2.1), 7.0);
    float debris = smoothstep(0.36, 0.55, r) * (1.0 - smoothstep(0.78, 0.89, r));
    debris *= smoothstep(0.29, 0.80, cells) * (0.27 + 0.73 * knots) * (0.30 + 0.70 * fingers);
    float filament = shock * (0.65 + 0.67 * stripes);
    float depth = localEye.z < 0.0 ? -p.z : p.z;
    vec2 xy = observedPlane(p, depth);
    vec3 image = observe(vec2(0.497, 0.498) + xy * 0.47, 0.22, vec3(0.54, 0.14, 0.46));
    vec3 view = abs(normalize(localEye));
    float front = mapped ? smoothstep(0.38, 0.98, view.z) : 0.0;
    vec2 flank = vec2(p.z + 0.16 * p.x, mix(p.y, p.x, view.y * view.y));
    vec3 secondary = observe(vec2(0.497, 0.498) + flank * 0.45, 0.50, image);
    image = mix(image, secondary, 1.0 - front);
    vec3 ultraviolet = mix(vec3(0.18, 0.20, 0.78), vec3(0.50, 0.68, 1.0), knots);
    vec3 hot = mix(vec3(0.48, 0.052, 0.11), vec3(0.94, 0.25, 0.30), cells);
    float gas = filament * 3.8 + debris * 8.6;
    vec3 color = (ultraviolet * filament * 3.8 + hot * debris * 8.6) / max(gas, 0.0001);
    float photoWeight = mapped ? mix(0.57, 0.77, front) : 0.0;
    return vec4(mix(color, image * 1.55, photoWeight), gas);
  }
`;
