export const helixDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float extent = length(p);
    if (extent > 1.0) return vec4(0.0);

    vec3 inner = vec3(p.x, 0.94 * p.y + 0.34 * p.z, -0.34 * p.y + 0.94 * p.z);
    vec3 outer = vec3(0.79 * p.x + 0.61 * p.z, p.y, -0.61 * p.x + 0.79 * p.z);
    float innerR = length(inner.xy);
    float outerR = length(outer.xy * vec2(1.12, 1.0));
    float cloud = noise(p * 9.0);
    float roughness = (cloud - 0.5) * 0.11;
    vec2 knotsAxis = inner.xy / max(innerR, 0.001);
    float knots = smoothstep(0.30, 0.76, noise(vec3(knotsAxis * 43.0, inner.z * 9.0)));
    float ring = exp(-pow(abs(innerR - 0.56 - roughness) / 0.15, 2.0) - pow(abs(inner.z) / 0.19, 2.0));
    float strands = ring * (0.28 + 0.72 * knots) * 5.2;
    float outerRing = exp(-pow(abs(outerR - 0.75 + roughness) / 0.12, 2.0) - pow(abs(outer.z) / 0.15, 2.0));
    float halo = outerRing * (0.48 + 0.74 * cloud) * 1.5;
    float core = exp(-5.6 * (dot(inner.xy, inner.xy) + 2.9 * inner.z * inner.z)) * 0.68;
    float gas = strands + halo + core;
    vec3 color = (vec3(0.70, 0.20, 0.076) * strands + vec3(0.59, 0.17, 0.071) * halo + vec3(0.064, 0.55, 0.64) * core) / max(gas, 0.0001);
    vec3 photo = observe(0.5 + 0.48 * p.xy, 0.35, color);
    float view = smoothstep(0.36, 0.97, abs(normalize(localEye).z));
    color = mix(color, photo * 1.5, mapped ? 0.58 * view : 0.0);
    return vec4(color, gas * (1.0 - smoothstep(0.85, 1.0, extent)));
  }
`;

export const sn1006ShellDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = p * vec3(1.0, 1.03, 1.05);
    float r = length(q);
    if (r < 0.28 || r > 1.02) return vec4(0.0);

    vec3 dir = q / r;
    float cap = smoothstep(0.42, 0.90, abs(dot(dir, normalize(vec3(-0.69, 0.70, 0.14)))));
    float roughness = noise(dir * 10.0) - 0.5;
    float texture = noise(p * 34.0);
    float shockDistance = (r - 0.86 - roughness * 0.069) / (0.027 + 0.012 * texture);
    float shock = exp(-shockDistance * shockDistance) * (0.68 + 6.3 * cap) * (0.55 + 0.75 * texture);
    float clumps = smoothstep(0.26, 0.72, noise(p * 12.0 + 0.8 * texture));
    float ejecta = smoothstep(0.30, 0.56, r) * (1.0 - smoothstep(0.70, 0.89, r));
    ejecta *= clumps * (0.48 + 0.85 * texture) * 2.15;
    float gas = shock + ejecta;
    vec3 rim = mix(vec3(0.47, 0.25, 0.64), vec3(0.26, 0.47, 1.0), cap);
    vec3 interior = mix(vec3(0.56, 0.10, 0.10), vec3(0.87, 0.34, 0.14), texture);
    vec3 color = (rim * shock + interior * ejecta) / max(gas, 0.0001);
    vec3 photo = observe(0.5 + p.xy * 0.49, 0.4, color);
    float view = smoothstep(0.35, 0.96, abs(normalize(localEye).z));
    return vec4(mix(color, photo * 1.5, mapped ? view * 0.49 : 0.0), gas);
  }
`;
