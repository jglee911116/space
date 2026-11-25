export const ngc346Density = /* glsl */ `
  float distanceToRidge(vec3 p, vec3 start, vec3 end) {
    vec3 segment = end - start;
    float progress = clamp(dot(p - start, segment) / dot(segment, segment), 0.0, 1.0);
    return length(p - (start + segment * progress));
  }

  vec4 density(vec3 p) {
    float envelope = 1.0 - smoothstep(0.74, 1.0, length(p * vec3(0.88, 0.92, 1.04)));
    if (envelope <= 0.0) return vec4(0.0);
    float coarse = noise(p * 13.0);
    float grain = noise(p * 46.0);
    vec3 q = p + vec3(noise(p * 16.0 + 4.0), noise(p * 12.0 + 9.0), coarse) * 0.13 - 0.065;

    // Three ridges curl around separate cavities and extend to different depths.
    float ridge = min(
      distanceToRidge(q, vec3(-0.59, -0.39, 0.18), vec3(-0.30, -0.19, 0.06)),
      distanceToRidge(q, vec3(-0.30, -0.19, 0.06), vec3(0.20, -0.22, -0.03))
    );
    ridge = min(ridge, distanceToRidge(q, vec3(0.20, -0.22, -0.03), vec3(0.46, -0.04, -0.19)));
    ridge = min(ridge, distanceToRidge(q, vec3(0.46, -0.04, -0.19), vec3(0.54, 0.35, -0.26)));
    float northern = min(
      distanceToRidge(q, vec3(-0.60, 0.61, -0.33), vec3(-0.35, 0.30, -0.19)),
      distanceToRidge(q, vec3(-0.35, 0.30, -0.19), vec3(-0.08, -0.04, 0.13))
    );
    float bridge = distanceToRidge(q, vec3(-0.08, -0.04, 0.13), vec3(0.36, 0.16, 0.34));
    float core = min(ridge, min(northern * 1.18, bridge * 1.36));
    float tight = exp(-core * (32.0 + 14.0 * grain));
    float spread = exp(-ridge * 10.0) + 0.72 * exp(-northern * 8.0) + 0.57 * exp(-bridge * 8.0);
    float lace = 0.38 + 0.62 * pow(0.5 + 0.5 * sin(dot(q, vec3(31.0, -54.0, 37.0)) + coarse * 7.0), 3.0);
    float knots = smoothstep(0.27, 0.77, 0.57 * coarse + 0.43 * grain);
    float gas = tight * (3.4 + 14.0 * lace * knots) + spread * (0.35 + 2.2 * knots);

    vec3 view = normalize(localEye);
    float depth = view.z < 0.0 ? -p.z : p.z;
    vec2 projected = observedPlane(p, depth);
    vec2 uv = vec2(0.51, 0.50) + projected * vec2(0.64, 0.48);
    vec3 faint = mix(vec3(0.18, 0.065, 0.19), vec3(0.57, 0.21, 0.35), knots);
    vec3 color = mix(faint, vec3(1.0, 0.57, 0.30), clamp(tight * (0.35 + knots), 0.0, 0.91));
    vec3 image = observe(uv, 0.35, color);
    float imageSignal = smoothstep(0.025, 0.56, max(image.r, max(image.g, image.b)));
    vec2 edge = min(uv, 1.0 - uv);
    float face = mapped ? smoothstep(0.40, 0.98, abs(view.z)) * smoothstep(0.0, 0.10, min(edge.x, edge.y)) : 0.0;
    gas *= mix(1.0, 0.34 + 2.0 * imageSignal, face);
    return vec4(mix(color, image * 1.62, 0.81 * face), gas * envelope);
  }
`;
