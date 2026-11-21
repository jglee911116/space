// Value noise shared by the sun and planet surfaces.
export const spatialNoise = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec4 a = vec4(hash(i), hash(i + vec3(1, 0, 0)), hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)));
  i.z += 1.0;
  vec4 b = vec4(hash(i), hash(i + vec3(1, 0, 0)), hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)));
  vec4 n = mix(a, b, f.z);
  return mix(mix(n.x, n.y, f.x), mix(n.z, n.w, f.x), f.y);
}
`;

export const surfaceVertex = /* glsl */ `
  varying vec3 surface;
  varying vec2 starUv;
  varying vec3 viewNormal;
  varying vec3 viewDirection;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    surface = position;
    starUv = uv;
    viewNormal = normalMatrix * normal;
    viewDirection = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const surfaceFragment = /* glsl */ `
  uniform float surfacePhase;
  uniform sampler2D surfaceMap;
  uniform bool hasSurfaceMap;
  uniform float surfaceShear;
  uniform vec3 surfaceDark;
  uniform vec3 surfaceHot;
  uniform vec3 photosphere;
  uniform float convectionPhase;
  varying vec3 surface;
  varying vec2 starUv;
  varying vec3 viewNormal;
  varying vec3 viewDirection;

  ${spatialNoise}

  void main() {
    vec3 p = normalize(surface);
    float angle = surfacePhase + surfaceShear * p.y * p.y;
    if (hasSurfaceMap) {
      vec3 image = texture2D(surfaceMap, starUv - vec2(angle / 6.2831853, 0.0)).rgb;
      float limb = max(dot(normalize(viewNormal), normalize(viewDirection)), 0.0);
      vec3 color = image * mix(0.63, 1.0, pow(limb, 0.46));
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
      return;
    }
    float c = cos(angle);
    float s = sin(angle);
    p.xz = mat2(c, s, -s, c) * p.xz;
    float center = max(dot(normalize(viewNormal), normalize(viewDirection)), 0.0);
    if (photosphere.x > 0.0) {
      if (photosphere.y == 0.0) {
        vec3 color = mix(surfaceDark, surfaceHot, 0.28 + 0.72 * pow(center, 0.44));
        gl_FragColor = vec4(color, 1.0);
        return;
      }
      vec3 q = p + vec3(0.34, 0.19, -0.24) * photosphere.x;
      float footprint = length(fwidth(p));
      float scale = photosphere.y;
      float cells = noise(q * scale + noise(q * 18.0) * 1.8);
      float granular = mix(0.56, smoothstep(0.24, 0.73, cells), 1.0 - smoothstep(0.5, 1.6, footprint * scale));
      float convection = noise(q * 13.0 + vec3(sin(convectionPhase * 22.0), 0.0, cos(convectionPhase * 22.0)) * 0.32);
      float activity = noise(q * 5.0) * 0.75 + noise(q * 16.0) * 0.25;
      float spots = smoothstep(0.65, 0.81, activity) * photosphere.z;
      float faculae = (smoothstep(0.53, 0.67, activity) - smoothstep(0.67, 0.80, activity)) * (1.0 - center);
      float plasma = 0.28 + 0.46 * granular + 0.26 * convection;
      vec3 color = mix(surfaceDark, surfaceHot, plasma + faculae * 0.19);
      color *= (1.0 - 0.78 * spots) * mix(0.53, 1.18, pow(center, 0.40));
      gl_FragColor = vec4(color, 1.0);
      return;
    }
    float flow = noise(p * 9.0 + noise(p * 4.0) * 1.6);
    float footprint = length(fwidth(p));
    float fineWeight = 1.0 - smoothstep(0.5, 1.5, footprint * 214.0);
    float coarseWeight = 1.0 - smoothstep(0.5, 1.5, footprint * 105.0);
    float granules = mix(0.5, noise(p * 105.0), coarseWeight) * 0.68
                   + mix(0.5, noise(p * 214.0), fineWeight) * 0.32;
    float plasma = smoothstep(0.18, 0.85, flow * 0.6 + granules * 0.4);
    vec3 color = mix(surfaceDark, surfaceHot, plasma);
    color *= mix(0.57, 1.08, pow(center, 0.45));
    color += surfaceHot * vec3(0.31, 0.10, 0.03) * pow(1.0 - center, 6.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const supergiantFragment = /* glsl */ `
  uniform vec3 surfaceDark;
  uniform vec3 surfaceBright;
  uniform float cellScale;
  uniform float brightness;
  varying vec3 surface;
  varying vec3 viewNormal;
  varying vec3 viewDirection;

  ${spatialNoise}

  void main() {
    vec3 p = normalize(surface);
    vec3 warp = vec3(noise(p * 4.2), noise(p * 4.2 + 13.0), noise(p * 4.2 + 29.0));
    vec3 q = p * cellScale + (warp - 0.5) * 1.8;
    float cells = noise(q);
    float substructure = noise(q * 2.7);
    float grain = noise(q * 7.0);
    float textureValue = smoothstep(0.23, 0.78, cells * 0.63 + substructure * 0.25 + grain * 0.12);
    float center = max(dot(normalize(viewNormal), normalize(viewDirection)), 0.0);
    vec3 color = mix(surfaceDark, surfaceBright, textureValue);
    color *= brightness * mix(0.42, 1.0, pow(center, 0.55));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export const coronaVertex = /* glsl */ `
  varying vec2 offset;

  void main() {
    offset = position.xy;
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * (center + vec4(offset, 0.0, 0.0));
  }
`;

export const coronaFragment = /* glsl */ `
  uniform float radius;
  uniform vec3 tint;
  uniform float flowTime;
  uniform float intensity;
  uniform bool solar;
  varying vec2 offset;

  ${spatialNoise}

  void main() {
    float distance = length(offset) / radius;
    float angle = atan(offset.y, offset.x);
    float limb = max(distance - 1.0, 0.0);
    float rays = 0.66 + 0.21 * sin(angle * 8.0 + sin(angle * 3.0 + flowTime * 0.7));
    rays += 0.13 * cos(angle * 21.0 - flowTime * 0.4);
    float filaments = pow(0.5 + 0.5 * sin(angle * 38.0 + limb * 5.0 - flowTime * 1.45), 4.0);
    float glow = 0.37 * exp(-5.0 * limb / rays) + 0.42 * exp(-23.0 * limb);
    glow += (0.11 + 0.10 * filaments) * exp(-3.4 * limb);
    float edge = 1.0 - smoothstep(2.45, 3.15, distance);
    float outside = smoothstep(0.98, 1.025, distance);
    vec3 glowTint = mix(tint, vec3(1.0), 0.48 * exp(-8.0 * limb));
    if (solar) {
      // Sample on the circumference so radial strands stay continuous at the seam.
      vec2 direction = offset / max(length(offset), 0.0001);
      float spread = limb / (0.55 + limb);
      vec2 tangent = vec2(-direction.y, direction.x);
      float deflection = (noise(vec3(direction * 2.7, flowTime * 0.037)) - 0.5) * spread;
      vec2 streamerDirection = normalize(direction + tangent * deflection * 0.24);
      float envelope = smoothstep(0.38, 0.77, noise(vec3(streamerDirection * 4.0, flowTime * 0.035)));
      float strands = smoothstep(0.30, 0.70, noise(vec3(streamerDirection * 44.0, 7.0)));
      float plumes = smoothstep(0.37, 0.76, noise(vec3(direction * 21.0, 15.0)));
      float outward = noise(vec3(streamerDirection * 13.0, limb * 5.4 - flowTime * 0.43));
      glow = 0.26 * exp(-limb * 27.0) + 0.15 * plumes * exp(-limb * 8.5);
      glow += envelope * (0.05 + 0.38 * strands) * (0.42 + 0.58 * outward) * exp(-limb * 3.3);
      edge = 1.0 - smoothstep(1.76, 2.55, distance);
      glowTint = mix(vec3(0.81, 0.82, 0.84), vec3(1.0, 0.53, 0.27), 0.56 * exp(-limb * 8.5));
    }
    gl_FragColor = vec4(glowTint, clamp(intensity * glow * edge * outside, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

export const planetVertex = /* glsl */ `
  varying vec3 localPoint;
  varying vec2 surfaceUv;
  varying vec3 viewPoint;
  varying vec3 viewOffset;
  varying vec3 viewNormal;

  void main() {
    localPoint = normalize(position);
    surfaceUv = uv;
    vec4 point = modelViewMatrix * vec4(position, 1.0);
    viewPoint = point.xyz;
    viewOffset = mat3(modelViewMatrix) * position;
    viewNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * point;
  }
`;

export const JUPITER_RED_SPOT_LATITUDE = -22;

export const planetFragment = /* glsl */ `
  uniform vec3 dark;
  uniform vec3 middle;
  uniform vec3 light;
  uniform vec3 lightOffset;
  uniform int style;
  uniform int surfaceFeatures;
  uniform sampler2D surfaceMap;
  uniform bool hasSurfaceMap;
  uniform float mapOffset;
  uniform bool fillMissingMap;
  uniform bool polarCaps;
  uniform vec4 rockSurface;
  uniform vec4 cloudBands;

  varying vec3 localPoint;
  varying vec2 surfaceUv;
  varying vec3 viewPoint;
  varying vec3 viewOffset;
  varying vec3 viewNormal;

  ${spatialNoise}

  vec3 saturnClouds(vec3 p, vec3 color, float detail) {
    if (p.y < 0.90) return color;
    float radius = length(p.xz);
    float angle = atan(p.z, p.x + 0.00001);
    float sector = mod(angle + 0.5235988, 1.0471976) - 0.5235988;
    float hexagon = radius * cos(sector) + (detail - 0.5) * 0.009;
    // The jet's vertices reach about 78° north; blend the cloud bank across its edges.
    float interior = 1.0 - smoothstep(0.171, 0.194, hexagon);
    float jet = 1.0 - smoothstep(0.004, 0.018, abs(hexagon - 0.181));
    color = mix(color, mix(vec3(0.25, 0.36, 0.38), vec3(0.53, 0.62, 0.59), detail), interior * 0.86);
    return mix(color, vec3(0.77, 0.66, 0.39), jet * 0.72);
  }

  vec3 marsLandmarks(vec3 p, vec3 color, float detail) {
    // Planetocentric latitude and east longitude (USGS Gazetteer).
    float lat = degrees(asin(clamp(p.y, -1.0, 1.0)));
    float lon = mod(degrees(atan(p.z, p.x + 0.00001)) + 360.0, 360.0);
    float volcano = length(vec2((lon - 226.2) * 0.95, lat - 18.65));
    float shield = 1.0 - smoothstep(0.5, 5.5, volcano + detail * 0.8);
    float caldera = 1.0 - smoothstep(0.45, 1.1, volcano);
    color = mix(color, vec3(0.67, 0.30, 0.14), shield * 0.83);
    color = mix(color, vec3(0.21, 0.074, 0.041), caldera * 0.78);
    float east = lon - 301.4;
    float floorLat = -14.0 - east * 0.12 + 1.2 * sin(east * 0.18);
    float valleys = length(vec2(east / 33.0, (lat - floorLat) / (4.4 + 1.5 * sin(east * 0.24))));
    float canyon = 1.0 - smoothstep(0.68, 1.05, valleys + (detail - 0.5) * 0.31);
    return mix(color, mix(vec3(0.14, 0.048, 0.034), vec3(0.40, 0.16, 0.072), detail), canyon * 0.88);
  }

  vec3 neptuneClouds(vec3 p, vec3 color, float detail) {
    vec3 center = vec3(0.0, -0.37461, 0.92718);
    if (dot(p, center) < 0.96) return color;
    float meridian = dot(p, vec3(0.0, 0.92718, 0.37461));
    vec2 point = vec2(p.x / 0.23, meridian / 0.108);
    float edge = length(point) + (detail - 0.5) * 0.16;
    float spot = 1.0 - smoothstep(0.73, 1.04, edge);
    float brightCompanion = 1.0 - smoothstep(0.34, 1.0, length(vec2((point.x + 0.19) * 1.1, (point.y + 1.14) * 3.5)));
    color = mix(color, vec3(0.038, 0.080, 0.16), spot * 0.87);
    return mix(color, vec3(0.73, 0.87, 0.96), brightCompanion * smoothstep(0.24, 0.67, detail) * 0.83);
  }

  vec3 ioDeposits(vec3 p, vec3 color) {
    float sulphurFrost = smoothstep(0.55, 0.78, noise(p * 8.0 + 7.0));
    color = mix(color, vec3(0.94, 0.80, 0.51), sulphurFrost * 0.83);
    float deposit = noise(p * 13.0 + 19.0);
    color = mix(color, vec3(0.49, 0.084, 0.025), smoothstep(0.65, 0.79, deposit) * 0.88);
    return mix(color, vec3(0.082, 0.034, 0.023), smoothstep(0.81, 0.92, deposit));
  }

  vec3 europaFractures(vec3 p, float detail) {
    vec3 ice = mix(vec3(0.43, 0.39, 0.34), vec3(0.88, 0.83, 0.72), smoothstep(0.2, 0.77, detail));
    float warp = (noise(p * 5.0) - 0.5) * 2.6;
    float mainBand = sin(dot(p, vec3(13.0, 22.0, 8.0)) + warp);
    float crossBand = sin(dot(p, vec3(18.0, -11.0, -17.0)) + warp * 0.82);
    float width = max(fwidth(mainBand), fwidth(crossBand));
    float fractures = (1.0 - smoothstep(0.02, 0.18 + width, min(abs(mainBand), abs(crossBand)))) * (1.0 - smoothstep(0.14, 0.78, width));
    return mix(ice, vec3(0.29, 0.098, 0.044), fractures * (0.46 + detail * 0.40));
  }

  vec2 rockTerrain(vec3 p, float seed, float craterStrength) {
    float terrain = 0.65 * noise(p * 4.4 + seed) + 0.25 * noise(p * 14.0 + seed)
      + 0.10 * noise(p * 47.0 - seed);
    float impacts = 0.0;
    if (craterStrength > 0.30) {
      for (int i = 0; i < 16; i++) {
        float index = float(i);
        vec3 key = vec3(seed, index, index + seed);
        float latitude = 2.0 * hash(key) - 1.0;
        float longitude = 6.2831853 * hash(key + 7.0);
        float horizontal = sqrt(max(0.0, 1.0 - latitude * latitude));
        vec3 center = vec3(horizontal * cos(longitude), latitude, horizontal * sin(longitude));
        float radius = mix(0.065, 0.32, pow(hash(key + 14.0), 1.6));
        float distance = length(p - center) / radius;
        float floorDepth = 1.0 - smoothstep(0.35, 0.87, distance);
        float raisedRim = 1.0 - smoothstep(0.03, 0.16, abs(distance - 0.9));
        impacts += radius * (raisedRim * 0.39 - floorDepth);
      }
    }
    return vec2(terrain, impacts * craterStrength);
  }

  vec3 reliefNormal(vec3 normal, vec3 point, float height) {
    vec3 dx = dFdx(point);
    vec3 dy = dFdy(point);
    vec3 u = cross(dy, normal);
    vec3 v = cross(normal, dx);
    float determinant = dot(dx, u);
    vec3 gradient = dFdx(height) * u + dFdy(height) * v;
    return normalize(max(abs(determinant), 1e-12) * normal - sign(determinant) * gradient);
  }

  void main() {
    vec3 p = normalize(localPoint);
    float flow = noise(p * 5.0);
    float detail = noise(p * 19.0 + flow * 1.7);
    float grain = noise(p * 69.0);
    float latitude = p.y;
    float bands = 0.5 + 0.29 * sin(latitude * 39.0 + flow * 2.8)
                      + 0.14 * sin(latitude * 83.0 + detail * 2.1);
    vec3 color;
    float relief = 0.0;

    vec3 mapped = hasSurfaceMap ? texture2D(surfaceMap, surfaceUv + vec2(mapOffset, 0.0)).rgb : vec3(0.0);
    float coverage = hasSurfaceMap ? (fillMissingMap ? smoothstep(0.003, 0.025, max(mapped.r, max(mapped.g, mapped.b))) : 1.0) : 0.0;
    if (coverage >= 1.0) {
      color = surfaceFeatures == 2 ? saturnClouds(p, mapped, detail) : mapped;
    } else if (cloudBands.x > 0.0) {
      vec3 weather = p * vec3(4.0, 15.0, 4.0) + cloudBands.x;
      float shear = (noise(weather) - 0.5) * cloudBands.z;
      float phase = p.y * cloudBands.y + shear;
      float bandsDetail = sin(phase) * 0.29 + sin(phase * 2.39 + 1.4) * 0.12;
      float filaments = noise(weather * vec3(4.0, 2.6, 4.0) + shear) - 0.5;
      float pattern = 0.5 + cloudBands.w * (bandsDetail + filaments * 0.35);
      color = mix(dark, middle, smoothstep(0.08, 0.59, pattern));
      color = mix(color, light, smoothstep(0.48, 0.92, pattern));
    } else if (rockSurface.x > 0.0) {
      vec2 terrain = rockTerrain(p, rockSurface.x, rockSurface.w);
      float contrast = rockSurface.z;
      float brightTerrain = smoothstep(0.38, 0.69, terrain.x + 0.34 * (rockSurface.y - 0.5));
      color = mix(middle, dark, contrast * (1.0 - smoothstep(0.24, 0.63, terrain.x)));
      color = mix(color, light, 0.52 * brightTerrain + 0.38 * rockSurface.y);
      color *= 1.0 + 0.48 * terrain.y + 0.22 * contrast * (grain - 0.5);
      relief = contrast * 0.041 * (terrain.x - 0.5) + 0.19 * terrain.y;
    } else if (style == 1) {
      float elevation = noise(p * 3.5 + 8.0) * 0.73 + detail * 0.27;
      float land = smoothstep(0.52, 0.56, elevation);
      color = mix(dark, mix(middle, light, smoothstep(0.59, 0.78, elevation)), land);
      float cloud = smoothstep(0.59, 0.76, noise(p * vec3(11.0, 19.0, 11.0) + detail * 3.0));
      float ice = smoothstep(0.88, 0.99, abs(latitude) + detail * 0.07);
      color = mix(color, vec3(0.82, 0.9, 0.97), max(cloud * 0.83, ice));
    } else if (style == 2 || style == 5) {
      color = mix(dark, middle, smoothstep(0.23, 0.68, flow * 0.70 + detail * 0.30));
      color = mix(color, light, grain * grain * 0.48);
      if (surfaceFeatures == 3) color = marsLandmarks(p, color, detail);
      if (surfaceFeatures == 5) color = ioDeposits(p, color);
      if (surfaceFeatures == 6) color = europaFractures(p, detail);
      if (polarCaps) color = mix(color, vec3(0.86, 0.83, 0.79), smoothstep(0.92, 1.02, abs(latitude) + detail * 0.07));
      if (style == 5 && p.z < 0.0) {
        vec2 heart = vec2(p.x * 1.7, p.y * 1.7 + 0.25);
        float base = dot(heart, heart) - 0.40;
        float boundary = base * base * base - heart.x * heart.x * heart.y * heart.y * heart.y;
        float frost = 1.0 - smoothstep(-0.008, 0.012, boundary + (detail - 0.5) * 0.02);
        color = mix(color, mix(light, vec3(0.88, 0.84, 0.75), detail), frost * 0.96);
      }
    } else {
      float pattern = style == 0 ? detail * 0.62 + bands * 0.38 : bands * 0.78 + detail * 0.22;
      if (style == 4) pattern = 0.42 + bands * 0.28 + detail * 0.21;
      color = mix(dark, middle, smoothstep(0.12, 0.60, pattern));
      color = mix(color, light, smoothstep(0.43, 0.86, pattern));
      if (surfaceFeatures == 2) color = saturnClouds(p, color, detail);
      if (surfaceFeatures == 4) color = neptuneClouds(p, color, detail);
    }

    if (coverage < 1.0) color = mix(color, mapped, coverage);

    vec3 normal = normalize(viewNormal);
    vec3 lightDirection = normalize(mat3(viewMatrix) * lightOffset - viewOffset);
    vec3 viewDirection = normalize(-viewPoint);
    if (rockSurface.x > 0.0) {
      vec3 roughNormal = reliefNormal(normal, viewPoint, relief * length(viewOffset));
      float reliefVisibility = smoothstep(0.08, 0.48, dot(normal, viewDirection)) *
        smoothstep(-0.05, 0.31, dot(normal, lightDirection));
      normal = normalize(mix(normal, roughNormal, reliefVisibility));
    }
    float sun = max(dot(normal, lightDirection), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 4.0);
    color *= 0.22 + 0.78 * pow(sun, 0.65);
    if (style != 2) color += light * rim * (0.05 + 0.13 * sun);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;
