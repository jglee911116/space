export const jewelBugDensity = /* glsl */ `
  float shell(float radius, float center, float width) {
    float offset = (radius - center) / width;
    return exp(-offset * offset);
  }

  vec4 density(vec3 p) {
    float extent = length(p);
    if (extent >= 1.04) return vec4(0.0);

    vec3 tilt = vec3(0.87 * p.x - 0.49 * p.y, 0.49 * p.x + 0.87 * p.y, p.z);
    float cloud = noise(p * 10.0);
    float filaments = noise(p * vec3(29.0, 24.0, 30.0));
    float roughness = (cloud - 0.5) * 0.13;
    float haloRadius = length(tilt * vec3(1.13, 0.96, 1.05));
    float halo = 0.64 * shell(haloRadius, 0.62 + roughness, 0.044)
      + 0.38 * shell(haloRadius, 0.72 + roughness, 0.028)
      + 0.23 * shell(haloRadius, 0.84 + roughness, 0.032);
    halo *= 0.59 + 0.72 * cloud;

    float coreRadius = length(tilt * vec3(2.65, 1.80, 2.24));
    float inner = 4.7 * shell(coreRadius, 0.74 + roughness * 2.0, 0.25) * (0.48 + 0.62 * filaments);
    float hydrogen = 3.3 * shell(coreRadius, 0.99 + roughness * 1.7, 0.10) * (0.38 + 0.81 * cloud);
    vec3 jetAxis = normalize(vec3(0.80, 0.60, 0.22));
    float along = dot(p, jetAxis);
    float jetWidth = 0.055 + 0.12 * abs(along);
    float crossSection = length(p - along * jetAxis) / jetWidth;
    float jets = 1.5 * exp(-crossSection * crossSection) * smoothstep(0.25, 0.40, abs(along))
      * (1.0 - smoothstep(0.55, 0.85, abs(along))) * (0.31 + filaments);

    float gas = inner + hydrogen + halo + jets;
    vec3 gasColor = (inner * vec3(0.41, 0.75, 0.92) + hydrogen * vec3(0.88, 0.26, 0.53)
      + halo * vec3(0.08, 0.33, 0.67) + jets * vec3(0.14, 0.56, 0.76)) / max(gas, 0.0001);
    vec3 photo = observe(vec2(0.50, 0.50) + vec2(0.32, 0.44) * p.xy, 0.4, gasColor);
    float face = smoothstep(0.38, 0.97, abs(normalize(localEye).z));
    gasColor = mix(gasColor, photo * 1.55, mapped ? 0.57 * face : 0.0);
    return vec4(gasColor, gas * (1.0 - smoothstep(0.93, 1.04, extent)));
  }
`;
