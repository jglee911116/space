export const debrisDiskDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float r = length(p.xz);
    float grain = noise(p * 28.0);
    float outer = 1.0 - smoothstep(0.62, 1.0, r);
    float inner = smoothstep(0.035, 0.25, r);
    float mainDisk = exp(-abs(p.y) / (0.013 + 0.024 * r)) * outer * inner;
    float secondary = exp(-abs(p.y - 0.092 * p.x) / (0.022 + 0.037 * r)) * outer * inner;
    float y = p.y;
    vec2 tailAxis = vec2(0.29 + 0.40 * sqrt(max(0.0, y)) + 0.052 * sin(y * 10.0), -0.10 - 0.36 * y);
    float tailRadius = length((p.xz - tailAxis) / vec2(0.095, 0.17));
    float tail = exp(-tailRadius * tailRadius) * smoothstep(-0.01, 0.13, y) * (1.0 - smoothstep(0.48, 0.68, y));
    vec2 uv = vec2(0.507, 0.448) + p.xy * vec2(0.50, 0.72);
    vec3 image = observe(uv, 0.4, vec3(0.0));
    // The dark coronagraph and the star icon are not features of the dust disk.
    float masked = smoothstep(0.09, 0.14, length((uv - vec2(0.507, 0.448)) * vec2(1.0, 0.63)));
    float signal = max(image.r, max(image.g, image.b));
    float warm = mainDisk * (2.7 + 4.2 * grain);
    float cool = secondary * (0.62 + 1.9 * grain) + tail * (0.95 + 4.1 * grain + 4.0 * signal * masked);
    float total = warm + cool;
    vec3 color = (warm * vec3(1.0, 0.32, 0.11) + cool * vec3(0.38, 0.67, 0.89)) / max(total, 0.0001);
    return vec4(mix(color, image * 1.32, 0.58 * masked * smoothstep(0.015, 0.42, signal)), total);
  }
`;

export const butterflyDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = vec3(p.x - 0.43 * p.y, p.y + 0.05 * p.z, p.z - 0.14 * p.y);
    float h = abs(q.y);
    float fine = noise(q * 32.0);
    float coarse = noise(q * 11.0);
    float width = 0.075 + 0.57 * pow(h, 0.73);
    vec2 section = vec2(q.x - 0.09 * h * h, q.z * (1.14 + 0.15 * h));
    float angle = atan(section.y, section.x + 0.0001);
    float sectionRadius = length(section) / width;
    float folds = 0.09 * sin(5.0 * angle + h * 11.0) + 0.07 * sin(9.0 * angle - q.y * 14.0);
    float rimOffset = (sectionRadius - 0.83 + folds + 0.23 * (coarse - 0.5)) / 0.18;
    float rim = exp(-rimOffset * rimOffset);
    float grooves = 0.5 + 0.5 * sin(12.0 * angle + h * 17.0 + coarse * 7.0);
    float web = 0.28 + 0.72 * grooves * grooves;
    float knots = smoothstep(0.40, 0.82, fine + 0.20 * noise(q * 53.0));
    float envelope = smoothstep(0.018, 0.17, h) * (1.0 - smoothstep(0.76, 1.01, h));
    float dustLane = exp(-abs(q.y + q.x * 0.17) / 0.033) * (1.0 - smoothstep(0.065, 0.25, length(q.xz)));
    vec3 view = normalize(localEye);
    // Project the observation from both faces. The rear camera supplies the
    // screen-space reflection while the projection stays on the 3D gas.
    float faceDepth = view.z < 0.0 ? -p.z : p.z;
    vec2 projected = (p.xy - faceDepth * vec2(0.023, 0.063)) / (1.0 - faceDepth / 2.87);
    vec3 base = mix(vec3(0.54, 0.13, 0.052), vec3(0.63, 0.63, 0.88), 1.0 - smoothstep(0.09, 0.56, h));
    vec3 image = observe(vec2(0.525, 0.54) + projected * vec2(0.49, 0.48), 0.25, base);
    float signal = smoothstep(0.014, 0.56, max(image.r, max(image.g, image.b)));
    float faceWeight = smoothstep(0.39, 0.97, abs(view.z));
    float imageWeight = mapped ? faceWeight : 0.0;
    vec3 filaments = mix(base * 0.63, mix(vec3(1.0, 0.35, 0.13), vec3(0.66, 0.76, 1.0), 1.0 - smoothstep(0.25, 0.69, h)), knots);
    float original = envelope * (rim * (1.5 + 15.0 * web * knots) + 0.67 * exp(-sectionRadius * sectionRadius) * coarse);
    float photoGas = original * (0.34 + 1.8 * signal);

    // Wrap filament detail around the lobes, so side and polar views still
    // resolve thin folds, wisps and the dark waist as separate structures.
    vec2 sideUV = vec2(0.525, 0.54) + vec2(q.z * 1.32 + 0.44 * q.y, q.y) * vec2(0.49, 0.48);
    vec3 sideImage = observe(sideUV, 0.60, filaments);
    float sideSignal = smoothstep(0.045, 0.64, max(sideImage.r, max(sideImage.g, sideImage.b)));
    float twist = angle + q.y * 1.7 + 0.14 * sin(h * 24.0 + 6.0 * angle);
    float threads = pow(0.5 + 0.5 * sin(18.0 * twist + coarse * 8.0), 4.0);
    float ribbons = pow(0.5 + 0.5 * sin(44.0 * h - 5.0 * angle + fine * 4.2), 5.0);
    float shell = exp(-0.76 * rimOffset * rimOffset);
    float innerOffset = (sectionRadius - 0.61 - 0.69 * folds + 0.11 * (coarse - 0.5)) / 0.085;
    float innerShell = exp(-innerOffset * innerOffset);
    float shellGas = envelope * ((0.55 + 13.0 * threads * knots + 3.4 * ribbons * fine) * shell +
      (0.15 + 6.6 * ribbons * knots) * innerShell);
    shellGas *= mapped ? 0.60 + 1.28 * sideSignal : 1.0;
    vec3 lateral = mix(filaments * 0.78, sideImage * 1.59, mapped ? 0.62 * smoothstep(0.04, 0.53, sideSignal) : 0.0);
    lateral = mix(lateral, vec3(0.90, 0.86, 1.0), ribbons * knots * 0.42);
    float waistRadius = length(vec2(q.x, q.z * 1.1));
    float waist = exp(-abs(q.y + q.x * 0.17) / 0.043) * exp(-30.0 * abs(waistRadius - 0.16));
    vec3 face = mix(filaments, image * 1.57, 0.76);
    vec3 color = mix(lateral, face, imageWeight);
    float gas = mix(shellGas + 0.62 * waist * coarse, photoGas, imageWeight);
    return vec4(mix(color, vec3(0.030, 0.015, 0.013), dustLane), gas + dustLane * 10.0);
  }
`;

export const velaWindDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 direction = normalize(vec3(0.76, 0.58, 0.29));
    float axial = dot(p, direction);
    vec3 side = vec3(-direction.y, direction.x, 0.0);
    vec3 height = normalize(cross(direction, side));
    vec2 plane = vec2(dot(p, side), dot(p, height));
    float rad = length(plane);
    float ripple = noise(p * 28.0);
    float arcRadius = 0.22 + 0.05 * sin(atan(plane.y, plane.x + 0.0001));
    float bows = exp(-pow(abs(rad - arcRadius) / 0.044, 2.0)) * exp(-pow(abs(axial - 0.13) / 0.075, 2.0))
      + 0.79 * exp(-pow(abs(rad - 0.34) / 0.053, 2.0)) * exp(-pow(abs(axial - 0.27) / 0.088, 2.0));
    float jetPhase = axial * 13.0 - motion * 5.0;
    vec2 axis = (0.018 + 0.126 * max(axial, 0.0)) * vec2(sin(jetPhase), cos(jetPhase));
    float jet = exp(-pow(length(plane - axis) / (0.033 + 0.037 * max(axial, 0.0)), 2.0))
      * smoothstep(0.04, 0.12, axial) * (1.0 - smoothstep(0.65, 0.95, axial));
    float knots = pow(0.5 + 0.5 * cos(jetPhase * 2.0), 3.0);
    float wind = exp(-dot(p * vec3(2.9, 2.2, 3.3), p * vec3(2.9, 2.2, 3.3))) * (0.25 + 0.75 * ripple);
    vec3 base = mix(vec3(0.035, 0.24, 0.62), vec3(0.53, 0.84, 1.0), clamp(bows + jet, 0.0, 0.93));
    vec3 image = observe(vec2(0.373, 0.486) + p.xy * vec2(0.38, 0.42), 0.7, base);
    float signal = max(image.b, image.g);
    float gas = bows * (5.0 + signal * 11.0) + jet * (4.2 + knots * 8.2) + wind * 2.2;
    return vec4(mix(base, image * 1.32, 0.45), gas);
  }
`;
