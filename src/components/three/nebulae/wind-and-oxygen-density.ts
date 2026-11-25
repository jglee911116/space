export const windBubbleDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float noiseValue = noise(p * 18.0);
    vec3 q = (p - vec3(0.09, 0.04, 0.02)) * vec3(1.02, 1.12, 1.03);
    float radius = length(q);
    float rim = (radius - 0.59 - 0.037 * (noiseValue - 0.5)) / 0.045;
    float shell = exp(-rim * rim) * (0.65 + 3.4 * smoothstep(-0.46, 0.64, -q.x + 0.65 * q.y));
    float clouds = noise(p * vec3(9.0, 13.0, 10.0));
    float envelope = 1.0 - smoothstep(0.68, 1.0, length(p));
    float bank = smoothstep(-0.18, 0.69, -p.x + p.y * 0.58 + p.z * 0.31);
    float gas = envelope * bank * smoothstep(0.48, 0.76, clouds) * smoothstep(0.50, 0.76, radius) * 2.3;
    float mass = (shell + gas) * envelope;
    vec3 color = (shell * vec3(0.18, 0.67, 0.76) + gas * vec3(0.77, 0.32, 0.19)) / max(shell + gas, 0.0001);
    vec3 photo = observe(0.5 + p.xy * vec2(0.42, 0.45), 0.32, color);
    float face = smoothstep(0.30, 0.94, abs(normalize(localEye).z));
    return vec4(mix(color, photo * 1.35, mapped ? 0.58 * face : 0.0), mass);
  }
`;

export const oxygenRemnantDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float radius = length(p * vec3(1.04, 1.02, 1.12));
    if (radius > 1.02) return vec4(0.0);
    float coarse = noise(p * 8.0);
    float strands = noise(p * vec3(29.0, 24.0, 31.0));
    float rim = (radius - 0.77 - 0.17 * (coarse - 0.5)) / 0.076;
    float shock = exp(-rim * rim) * (0.55 + 1.65 * strands);
    float cage = smoothstep(0.23, 0.51, radius) * (1.0 - smoothstep(0.70, 0.92, radius));
    float knots = cage * smoothstep(0.36, 0.76, 0.52 * coarse + 0.48 * strands) * 5.4;
    float plane = 13.0 * (p.y + p.x * 0.13 - 0.09 * (coarse - 0.5));
    float belt = exp(-plane * plane) * (1.0 - smoothstep(0.56, 0.86, length(p.xz))) * (0.65 + 2.0 * strands);
    float mass = shock + knots + belt;
    vec3 color = (shock * vec3(0.61, 0.12, 0.12) + knots * mix(vec3(0.10, 0.57, 0.29), vec3(0.17, 0.46, 0.92), strands)
      + belt * vec3(0.68, 0.47, 0.19)) / max(mass, 0.0001);
    vec3 photo = observe(0.5 + p.xy * 0.49, 0.30, color);
    float face = smoothstep(0.32, 0.95, abs(normalize(localEye).z));
    return vec4(mix(color, photo * 1.47, mapped ? 0.60 * face : 0.0), mass);
  }
`;
