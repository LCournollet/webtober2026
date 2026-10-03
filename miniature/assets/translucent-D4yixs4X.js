import{S as t,A as i,D as r,C as e}from"./index-CSCHxmRk.js";function n(a={}){return new t({transparent:!0,depthWrite:!1,blending:i,side:r,uniforms:{uCore:{value:new e(a.core??"#6f9f8f")},uRim:{value:new e(a.rim??"#cfe8de")},uOpacity:{value:a.opacity??1},uStripes:{value:a.stripes??0},uRays:{value:a.rays??0},uTime:{value:0}},vertexShader:`
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
      }`,fragmentShader:`
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
      }`})}export{n as t};
