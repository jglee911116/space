export const galaxyMergerDensity = /* glsl */ `
  vec2 component(vec3 p, float tilt, float phase) {
    vec3 q = vec3(p.x, p.y * cos(tilt) - p.z * sin(tilt), p.y * sin(tilt) + p.z * cos(tilt));
    float r = length(q.xy * vec2(1.0, 1.35));
    float angle = atan(q.y, q.x);
    float core = exp(-dot(q * vec3(1.0, 1.15, 1.5), q) * 94.0);
    float spiral = pow(0.5 + 0.5 * cos(2.0 * angle - 5.0 * log(r + 0.09) + phase), 3.0);
    float disk = exp(-abs(q.z) * 12.0 - r * 4.8) * (0.31 + spiral);
    return vec2(core, disk * (0.4 + 1.5 * noise(q * 32.0)));
  }
  vec4 density(vec3 p) {
    vec2 a = component(p - vec3(-0.21, -0.06, 0.04), 0.39, 0.1);
    vec2 b = component(p - vec3(0.28, 0.12, -0.09), -0.54, 2.1);
    float displacedY = p.y - 0.28 * sin(p.x * 4.3);
    float tail = exp(-17.0 * abs(displacedY) - 8.0 * abs(p.z + 0.12 * sin(p.x * 5.0)))
      * (0.26 + 1.25 * noise(p * 24.0)) * 0.42;
    float haze = (1.0 - smoothstep(0.52, 0.98, length(p)));
    float knots = pow(noise(p * vec3(34.0, 37.0, 27.0)), 2.0);
    float mass = (a.x * 7.3 + b.x * 6.2 + (a.y * 3.0 + b.y * 2.7 + tail) * (0.70 + knots * 1.6)) * haze;
    vec3 color = mix(vec3(0.75, 0.51, 0.38), vec3(0.44, 0.56, 0.91), smoothstep(-0.35, 0.42, p.x));
    color = mix(color, vec3(1.0, 0.88, 0.71), smoothstep(0.06, 0.68, a.x + b.x));
    vec3 photo = observe(0.5 + p.xy * vec2(0.47, 0.57), 0.27, color);
    float facing = smoothstep(0.23, 0.86, abs(normalize(localEye).z));
    return vec4(mix(color, photo * 1.8, mapped ? 0.59 * facing : 0.0), mass);
  }
`;
