export const symbioticOutflowDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float z = abs(p.y);
    float side = sign(p.y);
    vec3 shifted = p - vec3(side * z * 0.32, 0.0, 0.09 * sin(p.y * 5.0));
    float angle = atan(shifted.z, shifted.x);
    float radius = length(shifted.xz);
    float opening = 0.05 + z * 0.44 + 0.022 * sin(z * 23.0);
    float filament = cos(angle * 3.0 + side * z * 11.0);
    float wall = (radius - opening - 0.04 * filament) / 0.037;
    float strands = exp(-wall * wall) * (0.14 + 1.45 * pow(0.5 + 0.5 * filament, 4.0));
    float traveling = 0.58 + 0.42 * pow(0.5 + 0.5 * cos(z * 24.0 - motion * 5.0), 3.0);
    float knots = noise(p * vec3(20.0, 35.0, 19.0));
    vec3 giant = p - vec3(-0.022, 0.006, 0.009);
    vec3 dwarf = p - vec3(0.026, -0.008, -0.014);
    float redCore = 8.0 * exp(-dot(giant, giant) * 840.0) * (0.88 + 0.12 * cos(motion * 5.0));
    float blueCore = 6.0 * exp(-dot(dwarf, dwarf) * 2200.0);
    float core = redCore + blueCore;
    float envelope = smoothstep(0.03, 0.24, z) * (1.0 - smoothstep(0.62, 0.95, length(p)));
    float mass = strands * traveling * (0.65 + knots * 3.7) * envelope + core;
    vec3 color = mix(vec3(0.22, 0.84, 0.81), vec3(1.0, 0.30, 0.19), smoothstep(0.18, 0.76, z));
    vec3 stellar = mix(vec3(1.0, 0.49, 0.25), vec3(0.66, 0.84, 1.0), blueCore / max(core, 0.001));
    color = mix(color, stellar, smoothstep(0.16, 1.4, core));
    vec2 uv = 0.5 + vec2(p.y * 0.43, -p.x * 0.46);
    vec3 photo = observe(uv, 0.31, color);
    return vec4(mix(color, photo * 1.65, mapped ? 0.35 * abs(normalize(localEye).z) : 0.0), mass);
  }
`;

export const protostarBowsDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float axial = p.x * 0.95 + p.y * 0.31;
    float crossAxis = p.y * 0.95 - p.x * 0.31;
    float z = abs(axial);
    float radius = length(vec2(crossAxis - axial * axial * sign(axial) * 0.13, p.z));
    float opening = 0.03 + z * 0.36;
    float wall = (radius - opening) / 0.054;
    float shell = exp(-wall * wall) * smoothstep(0.03, 0.26, z);
    float bows = pow(0.5 + 0.5 * cos(z * 29.0 + radius * radius * 25.0 - motion * 5.0), 6.0);
    float beam = exp(-radius * radius / 0.002) * smoothstep(0.02, 0.15, z);
    float knots = noise(p * 22.0);
    float fade = 1.0 - smoothstep(0.66, 0.98, length(p));
    float cavity = shell * (0.55 + 2.5 * bows) * (0.55 + knots * 1.4);
    float core = exp(-dot(p, p) * 380.0) * 3.2;
    float cloud = smoothstep(0.37, 0.88, noise(p * vec3(7.0, 11.0, 9.0)))
      * exp(-3.2 * dot(p, p)) * (0.28 + 0.40 * smoothstep(0.0, 0.5, radius));
    vec3 color = mix(vec3(0.72, 0.29, 0.15), vec3(0.23, 0.54, 0.80), smoothstep(0.1, 0.75, radius));
    color = mix(color, vec3(1.0, 0.87, 0.63), smoothstep(0.1, 1.9, core + beam * bows));
    vec3 photo = observe(0.5 + p.xy * vec2(0.46, 0.40), 0.35, color);
    return vec4(mix(color, photo * 1.2, mapped ? 0.55 * abs(normalize(localEye).z) : 0.0), (cavity + beam * bows + core + cloud) * fade);
  }
`;
