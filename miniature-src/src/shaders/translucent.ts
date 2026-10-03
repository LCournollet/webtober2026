import * as THREE from 'three';

export interface TranslucentOptions {
  core?: THREE.ColorRepresentation;   // teinte du corps
  rim?: THREE.ColorRepresentation;    // teinte du bord (là où la membrane est vue de profil)
  opacity?: number;
  /** motif de stries (diatomées) : nombre de stries le long de l'axe X local, 0 = aucune */
  stripes?: number;
  /** motif rayonnant (diatomées centriques) : nombre de rayons, 0 = aucun */
  rays?: number;
  instanced?: boolean;
}

/**
 * Membrane translucide éclairée par l'arrière : presque invisible de face, lumineuse sur les bords
 * (effet de Fresnel), comme les organismes vus en lumière transmise. Rendu additif doux, sans profondeur écrite.
 * Optionnellement, des stries ou des rayons gravés dans la paroi (la silice des diatomées).
 */
export function translucentMaterial(o: TranslucentOptions = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: {
      uCore: { value: new THREE.Color(o.core ?? '#6f9f8f') },
      uRim: { value: new THREE.Color(o.rim ?? '#cfe8de') },
      uOpacity: { value: o.opacity ?? 1 },
      uStripes: { value: o.stripes ?? 0 },
      uRays: { value: o.rays ?? 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vLocal;
      void main() {
        vLocal = position;
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
        vec4 wp = m * vec4(position, 1.0);
        vN = normalize(mat3(m) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCore, uRim; uniform float uOpacity, uStripes, uRays, uTime;
      varying vec3 vN; varying vec3 vV; varying vec3 vLocal;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float fres = pow(f, 2.4);
        float pattern = 0.0;
        if (uStripes > 0.0) pattern += smoothstep(0.55, 0.95, sin(vLocal.x * uStripes) * 0.5 + 0.5) * 0.35;
        if (uRays > 0.0) { float a = atan(vLocal.z, vLocal.x); float r = length(vLocal.xz); pattern += smoothstep(0.6, 0.95, sin(a * uRays) * 0.5 + 0.5) * 0.3 * smoothstep(0.15, 0.5, r); pattern += smoothstep(0.02, 0.0, abs(fract(r * 4.0) - 0.5) - 0.46) * 0.25; }
        vec3 col = uCore * (0.05 + pattern * 0.6) + uRim * fres * 0.9;
        float a = (0.04 + fres * 0.8 + pattern * 0.25) * uOpacity;
        gl_FragColor = vec4(col * a, a);
      }`,
  });
}
