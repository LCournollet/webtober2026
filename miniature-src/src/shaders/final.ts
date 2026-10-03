import * as THREE from 'three';

/**
 * Passe finale, en espace écran (après tone mapping). Toutes les transitions passent par elle :
 *  - uBlur      : flou « profondeur de champ » hors d'un disque net central (rayon uFocus)
 *  - uZoom      : flou radial (zoom / travelling très rapide) ; signe < 0 = on recule
 *  - uFade      : fondu vers uFadeColor (le masque pendant lequel on change de scène)
 *  - uExposure  : exposition additionnelle (éblouissement en traversant la surface de l'eau)
 *  - uChroma    : aberration chromatique sur les bords
 *  - uTint / uVignette / uGrain : étalonnage de l'échelle courante
 */
export const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uBlur: { value: 0 },
    uFocus: { value: 0.35 },
    uZoom: { value: 0 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color('#05070d') },
    uExposure: { value: 1 },
    uChroma: { value: 0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uTime, uBlur, uFocus, uZoom, uFade, uExposure, uChroma, uVignette, uGrain;
    uniform vec3 uFadeColor, uTint;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    vec3 tap(vec2 uv) {
      // aberration chromatique : les canaux s'écartent vers les bords
      vec2 d = (uv - 0.5) * uChroma * 0.012;
      return vec3(texture2D(tDiffuse, uv + d).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d).b);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      c.x *= uRes.x / uRes.y;
      float r = length(c);
      vec3 col = tap(uv);

      // flou de profondeur de champ (disque de Vogel), nul au centre
      float amount = uBlur * smoothstep(uFocus * 0.6, uFocus + 0.35, r) + uBlur * 0.15;
      if (amount > 0.001) {
        vec3 acc = col; float w = 1.0;
        float rad = amount * 22.0 / uRes.y;
        float rot = hash(uv * uRes) * 6.2831;
        for (int i = 0; i < 20; i++) {
          float fi = float(i) + 0.5;
          float a = fi * 2.39996 + rot;
          vec2 o = vec2(cos(a), sin(a)) * sqrt(fi / 20.0) * rad;
          o.x *= uRes.y / uRes.x;
          acc += tap(uv + o); w += 1.0;
        }
        col = acc / w;
      }

      // flou radial de zoom : on échantillonne le long du rayon vers le centre
      if (abs(uZoom) > 0.001) {
        vec3 acc = col; float w = 1.0;
        vec2 dir = (uv - 0.5);
        float jit = hash(uv * uRes + uTime);
        for (int i = 1; i <= 14; i++) {
          float s = (float(i) + jit) / 14.0;
          acc += tap(uv - dir * s * uZoom * 0.22); w += 1.0;
        }
        col = acc / w;
      }

      col *= uExposure * uTint;
      col = mix(col, uFadeColor, clamp(uFade, 0.0, 1.0));
      col *= 1.0 - uVignette * smoothstep(0.35, 1.1, r * 1.25);
      col += (hash(uv * uRes + fract(uTime) * 91.7) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};
