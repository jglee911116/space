export const homunculusDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = vec3(p.x - 0.24 * p.y, p.y + 0.18 * p.z, p.z - 0.18 * p.y);
    float side = sign(q.y);
    float grain = noise(q * 33.0);
    float knitted = noise(q * 14.0 + grain);
    vec3 lobe = (q - vec3(0.0, side * 0.43, 0.0)) / vec3(0.39, 0.43, 0.34);
    float r = length(lobe) + 0.12 * (knitted - 0.5);
    float waist = smoothstep(0.04, 0.20, abs(q.y));
    float skin = exp(-pow((r - 0.88) / 0.13, 2.0)) * waist;
    float interior = (1.0 - smoothstep(0.47, 0.85, r)) * waist;
    float disk = exp(-abs(q.y) / 0.041) * exp(-pow((length(q.xz) - 0.22) / 0.20, 2.0));
    vec3 base = mix(vec3(0.34, 0.068, 0.037), vec3(1.0, 0.48, 0.25), grain * 0.65 + knitted * 0.35);
    vec3 image = observe(vec2(0.57, 0.49) + p.xy * vec2(0.42, 0.43), 0.7, base);
    vec3 color = mix(base, image * 1.45, 0.54);
    return vec4(color, skin * (9.0 + 13.0 * grain * knitted) + interior * 0.95 + disk * 8.0);
  }
`;

export const lightEchoDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = p + vec3(0.08, -0.03, 0.0);
    float r = length(q / vec3(0.90, 0.80, 1.04));
    if (r > 1.04) return vec4(0.0);
    float detail = noise(q * 39.0);
    float structure = noise(q * 7.4 + detail * 0.22);
    float ripple = 29.0 * r + 7.0 * structure + q.z * 3.5 - q.x * 2.1 + 2.0 * detail;
    float sheet = 0.5 + 0.5 * sin(ripple);
    float folds = 0.5 + 0.5 * sin(18.0 * length(q.yz + vec2(q.x * 0.20, 0.13)) - q.x * 5.0 + 8.0 * structure);
    float dust = smoothstep(0.23, 0.76, structure * 0.59 + detail * 0.41)
      * (0.22 + 0.64 * sheet * sheet + 0.25 * folds * folds) * smoothstep(0.10, 0.29, r)
      * (1.0 - smoothstep(0.78, 1.03, r));
    // Extra light-travel distance along a fixed reference sightline.
    float progress = motion / 14.0;
    float delay = length(p) - p.z;
    float front = 0.08 + 1.81 * progress;
    float echoOffset = (delay - front) / 0.16;
    float pulse = exp(-echoOffset * echoOffset) *
      smoothstep(0.0, 0.13, progress) * (1.0 - smoothstep(0.77, 1.0, progress));
    vec3 base = mix(vec3(0.11, 0.23, 0.38), vec3(0.88, 0.39, 0.18), smoothstep(0.28, 0.72, structure));
    vec2 projected = observedPlane(p, p.z);
    vec3 image = observe(vec2(0.56, 0.56) + projected * vec2(0.45, 0.43), 0.7, base);
    float imageWeight = mapped ? 0.51 * smoothstep(0.35, 0.98, normalize(localEye).z) : 0.0;
    vec3 color = mix(base, min(image * 1.75, vec3(0.73)), imageWeight);
    return vec4(color * (0.62 + 0.61 * pulse + 0.21 * detail), dust * (2.35 + (9.0 + 8.0 * sheet) * pulse));
  }
`;

export const catsEyeDensity = /* glsl */ `
  float shell(float radius, float rim, float width) {
    return exp(-pow((radius - rim) / width, 2.0));
  }

  vec4 density(vec3 p) {
    vec3 q = vec3(p.x + 0.38 * p.y, p.y - 0.09 * p.z, p.z + 0.12 * p.y);
    float fine = noise(q * 44.0);
    float coarse = noise(q * 15.0);
    float roughness = (0.70 * coarse + 0.30 * fine - 0.5);
    vec3 eye = vec3(q.x + 0.10 * q.y, q.y + 0.025, q.z);
    float innerRadius = length(eye / vec3(0.30, 0.48, 0.29));
    float inner = shell(innerRadius + roughness * 0.09, 0.83, 0.049);
    float innerFilament = shell(innerRadius + roughness * 0.17, 0.66, 0.033);
    float upper = length((q - vec3(-0.043, 0.23, -0.11)) / vec3(0.41, 0.47, 0.35));
    float lower = length((q - vec3(0.016, -0.22, 0.10)) / vec3(0.44, 0.51, 0.36));
    float lobes = shell(upper + roughness * 0.17, 0.88, 0.082)
      + shell(lower + roughness * 0.15, 0.87, 0.081);
    float haloRadius = length(p / vec3(0.92, 1.0, 0.76));
    float ripple = pow(0.5 + 0.5 * cos((haloRadius - 0.021 * coarse) * 96.0), 5.0);
    float halo = ripple * smoothstep(0.55, 0.73, haloRadius) * (1.0 - smoothstep(0.86, 1.05, haloRadius));
    vec2 axis = vec2(-0.09 * q.y, 0.11 * sign(q.y));
    float knots = shell(length(q.xz - axis), 0.0, 0.071)
      * (shell(abs(q.y), 0.66, 0.10) + 0.55 * shell(abs(q.y), 0.84, 0.075))
      * (0.42 + 0.58 * fine);

    // Register the image to the default observation view. The shell geometry
    // still determines where gas is visible as the camera moves around it.
    vec2 projection = observedPlane(p, p.z);
    vec3 image = observe(vec2(0.485, 0.455) + projection * vec2(0.49, 0.46), 0.0, vec3(0.0));
    float signal = smoothstep(0.012, 0.58, max(image.r, max(image.g, image.b)));
    vec3 blue = mix(vec3(0.12, 0.28, 0.58), vec3(0.57, 0.75, 1.0), 0.32 + 0.68 * fine);
    vec3 red = vec3(0.88, 0.18, 0.092);
    float shellDensity = inner * 10.0 + innerFilament * 2.9 + lobes * (1.5 + 6.4 * fine);
    shellDensity *= mapped ? 0.24 + 1.43 * signal : 1.0;
    float haloDensity = halo * (mapped ? 0.13 + 0.72 * signal : 0.33);
    float knotDensity = knots * 8.4;
    vec3 gas = mapped ? mix(blue * 0.55, image * 1.52, 0.79) : blue;
    float total = shellDensity + haloDensity + knotDensity;
    vec3 color = (gas * shellDensity + red * (0.36 * haloDensity + knotDensity)) / max(total, 0.0001);
    return vec4(color, total);
  }
`;
