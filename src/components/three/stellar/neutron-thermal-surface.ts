export const neutronThermalFragment = /* glsl */ `
  uniform float phase;
  varying vec3 surface;
  varying vec3 viewNormal;
  varying vec3 viewDirection;

  void main() {
    vec3 p = normalize(surface);
    vec3 pole = normalize(vec3(0.62 * cos(phase), 0.82, 0.62 * sin(phase)));
    float a = dot(p, pole);
    float cap = 0.43 * pow(max(a, 0.0), 10.0) + 0.20 * pow(max(-a, 0.0), 8.0);
    float viewAngle = max(dot(normalize(viewNormal), normalize(viewDirection)), 0.0);
    vec3 color = mix(vec3(0.12, 0.25, 0.52), vec3(0.87, 0.95, 1.0), 0.20 + cap + 0.13 * a * a);
    color *= 0.33 + 0.67 * pow(viewAngle, 0.66);
    color += vec3(0.08, 0.15, 0.25) * pow(1.0 - viewAngle, 5.0);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;
