export const quintetDensity = /* glsl */ `
  vec2 webbProjection(vec3 p, float faceDepth) {
    vec2 projected = (p.xy - faceDepth * vec2(0.023, 0.029)) / (1.0 - faceDepth / 2.82);
    return vec2(0.50) + projected * vec2(0.48, 0.47);
  }

  float galaxyLayer(vec3 p, vec3 center, vec3 size, float tilt) {
    vec3 q = p - center;
    q.z -= q.y * tilt;
    vec3 offset = q / size;
    return exp(-dot(offset, offset) * 1.25);
  }

  vec4 observedQuintet(vec3 p) {
    // NGC 7320 is placed in front. The other four centers are kept near
    // the same depth; the offsets keep the two central galaxies distinct.
    float foreground = galaxyLayer(p, vec3(-0.30, 0.114, 0.48), vec3(0.29, 0.22, 0.084), 0.31);
    float top = galaxyLayer(p, vec3(0.125, 0.445, -0.11), vec3(0.24, 0.27, 0.12), -0.28);
    float companionA = galaxyLayer(p, vec3(0.159, -0.145, -0.04), vec3(0.22, 0.21, 0.12), -0.09);
    float companionB = galaxyLayer(p, vec3(0.125, -0.012, 0.11), vec3(0.218, 0.23, 0.092), 0.21);
    float bottom = galaxyLayer(p, vec3(-0.036, -0.63, -0.12), vec3(0.21, 0.20, 0.19), 0.18);
    float stars = foreground * 1.16 + top + companionA + companionB + bottom * 0.94;
    float floorDust = noise(p * 22.0);
    float shock = galaxyLayer(p, vec3(0.34, 0.123, -0.01), vec3(0.18, 0.41, 0.09), -0.28);
    float tail = galaxyLayer(p, vec3(-0.29, 0.51, -0.19), vec3(0.35, 0.33, 0.10), 0.48);
    float dust = (shock + tail * 0.65) * (0.42 + 0.58 * floorDust);
    // Project the reverse mosaic along the rear sightline to keep bright
    // knots sharp across the depth of the model.
    vec2 uv = webbProjection(p, p.z);
    if (localEye.z < 0.0) {
      float rearDepth = p.z / min(localEye.z, -1.0);
      vec2 projected = (p.xy - localEye.xy * rearDepth) / (1.0 - rearDepth);
      uv = vec2(0.50) + projected * vec2(0.48, 0.47);
    }
    vec3 reference = vec3(0.63, 0.46, 0.39);
    vec3 image = observe(uv, 0.0, reference);
    float signal = smoothstep(0.022, 0.55, max(image.r, max(image.g, image.b)));
    float stellarDensity = stars * (0.65 + 18.0 * signal);
    float dustDensity = dust * (0.12 + 5.6 * signal);
    vec3 starsColor = mix(reference * 0.39, image * 1.65, 0.90);
    vec3 dustColor = mix(vec3(0.68, 0.23, 0.12), image * 1.5, 0.76);
    float total = stellarDensity + dustDensity;
    return vec4((starsColor * stellarDensity + dustColor * dustDensity) / max(total, 0.0001), total);
  }

  // Pack emitted light and extinction together so overlapping galaxies retain their own color.
  vec4 galaxy(vec3 p, vec3 center, vec3 axes, vec2 heading, vec2 pitch, vec3 tint, float structure) {
    vec3 q = p - center;
    q.xy = vec2(dot(q.xy, heading), dot(q.xy, vec2(-heading.y, heading.x)));
    q.yz = vec2(dot(q.yz, pitch), dot(q.yz, vec2(-pitch.y, pitch.x)));
    vec3 v = q / axes;
    float r2 = dot(v.xy, v.xy);
    if (r2 > 1.56 || abs(v.z) > 3.5) return vec4(0.0);

    float r = sqrt(r2);
    float edge = 1.0 - smoothstep(0.76, 1.24, r);
    float height = v.z / (0.68 + 0.46 * r);
    float stars = exp(-2.7 * r - height * height) * edge;
    float bulge = exp(-6.0 * sqrt(r2 + 0.11 * v.z * v.z));
    float nucleus = exp(-84.0 * (r2 + 0.18 * v.z * v.z));
    float azimuth = atan(v.y, v.x + 0.0001);
    float winding = 2.0 * azimuth - 4.6 * log(r + 0.14) + structure;
    float grain = noise(q * 68.0);
    float cloud = noise(q * 29.0);
    float arms = pow(0.5 + 0.5 * cos(winding + 1.55 * cloud), 4.0) * smoothstep(0.13, 0.37, r);
    float knots = smoothstep(0.53, 0.83, grain * 0.62 + 0.38 * noise(q * 146.0));
    float clusters = knots * (0.20 + 0.80 * arms);
    float dust = pow(0.5 + 0.5 * cos(winding + 0.91 + 0.64 * cloud), 6.0) * exp(-3.1 * height * height);
    // Small local crops tint each tilted disk without stretching the whole
    // photograph through the group at grazing angles.
    vec2 plane = q.x * heading + q.y * vec2(-heading.y, heading.x);
    vec3 detailColor = observe(webbProjection(center, center.z) + plane * 0.39, 0.45, tint);
    float detailSignal = smoothstep(0.055, 0.56, max(detailColor.r, max(detailColor.g, detailColor.b)));
    stars *= mix(1.0, 0.38 + 1.50 * arms + 8.6 * clusters - 0.32 * dust, abs(structure));
    vec3 diskColor = mix(tint * 0.72, vec3(0.63, 0.80, 1.18), clamp(arms * 0.54 + clusters * 1.65, 0.0, 1.0));
    diskColor = mix(diskColor, detailColor * 1.30, mapped ? 0.46 * detailSignal * (0.22 + 0.78 * arms) : 0.0);
    float coreDensity = 8.5 * bulge + 18.0 * nucleus;
    float diskDensity = 6.9 * stars;
    return vec4(diskColor * diskDensity + vec3(1.05, 0.72, 0.48) * coreDensity, diskDensity + coreDensity);
  }

  vec4 modeledQuintet(vec3 p) {
    vec4 light = galaxy(p, vec3(-0.30, 0.114, 0.48), vec3(0.31, 0.22, 0.056), vec2(0.90, 0.44), vec2(0.87, 0.49), vec3(0.60, 0.74, 0.99), 0.99);
    light += galaxy(p, vec3(0.125, 0.445, -0.11), vec3(0.27, 0.21, 0.065), vec2(0.86, -0.51), vec2(0.78, -0.63), vec3(0.94, 0.67, 0.46), 0.91);
    light += galaxy(p, vec3(0.159, -0.145, -0.04), vec3(0.22, 0.18, 0.075), vec2(0.72, 0.69), vec2(0.67, -0.74), vec3(0.92, 0.62, 0.41), 0.22);
    light += galaxy(p, vec3(0.125, -0.012, 0.11), vec3(0.23, 0.17, 0.048), vec2(0.58, -0.81), vec2(0.79, 0.61), vec3(0.61, 0.73, 0.95), -0.85);
    light += galaxy(p, vec3(-0.036, -0.63, -0.12), vec3(0.24, 0.19, 0.081), vec2(0.96, 0.28), vec2(0.92, -0.39), vec3(0.92, 0.70, 0.51), 0.48);

    float t = p.y - 0.065;
    vec2 ridge = p.xz - vec2(0.27 + 0.43 * t * t, -0.03 + 0.38 * t);
    float shock = exp(-dot(ridge / vec2(0.066, 0.086), ridge / vec2(0.066, 0.086)) - 11.0 * t * t);
    float s = p.x - 0.04;
    vec2 curve = (p.yz - vec2(0.38 - 0.43 * s - 1.35 * s * s, -0.15 - 0.41 * s)) / vec2(0.065, 0.075);
    float tail = exp(-dot(curve, curve) - 7.5 * (s + 0.21) * (s + 0.21));
    float filaments = pow(noise(p * 27.0) * noise(p * 64.0), 1.12);
    float strands = 0.28 + 0.72 * pow(0.5 + 0.5 * sin(p.y * 60.0 - p.z * 43.0 + noise(p * 21.0) * 5.0), 3.0);
    float shockDensity = shock * filaments * strands * 12.4;
    float tailDensity = tail * filaments * (0.52 + strands) * 5.4;
    return light + vec4(vec3(0.98, 0.35, 0.19) * shockDensity +
      vec3(0.56, 0.69, 0.99) * tailDensity, shockDensity + tailDensity);
  }

  vec4 density(vec3 p) {
    float imageWeight = mapped ? smoothstep(0.47, 0.985, abs(normalize(localEye).z)) : 0.0;
    if (imageWeight >= 1.0) return observedQuintet(p);
    vec4 model = modeledQuintet(p);
    if (imageWeight > 0.0) {
      vec4 observed = observedQuintet(p);
      model = mix(model, vec4(observed.rgb * observed.a, observed.a), imageWeight);
    }
    return vec4(model.rgb / max(model.a, 0.0001), model.a);
  }
`;
