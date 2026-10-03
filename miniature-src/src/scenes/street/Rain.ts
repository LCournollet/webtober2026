import * as THREE from 'three';
import { rng } from '../../utils/math';

/**
 * La pluie : des milliers de traits instanciés qui tombent dans un cylindre autour du lampadaire.
 * Le shader ne les rend visibles QUE dans le cône de lumière (comme dans la vraie vie, on ne voit la pluie
 * que là où elle est éclairée). La longueur du trait suit la vitesse du temps : quand le temps s'arrête,
 * les traits redeviennent de petites gouttes rondes suspendues.
 */
export class Rain {
  readonly mesh: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;
  time = 0;

  constructor(count: number, lamp: THREE.Vector3, coneRadiusAtGround: number, area = 3.6, height = 6.5) {
    const R = rng(11);
    const base = new THREE.PlaneGeometry(1, 1);
    base.translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry().copy(base as unknown as THREE.InstancedBufferGeometry);
    geo.instanceCount = count;
    const off = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const a = R.next() * Math.PI * 2, r = Math.sqrt(R.next()) * area;
      off.set([lamp.x + Math.cos(a) * r, R.next() * height, lamp.z + Math.sin(a) * r, R.range(0.75, 1.25)], i * 4);
    }
    geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    this.uniforms = {
      uTime: { value: 0 }, uSpeed: { value: 1 }, uHeight: { value: height },
      uLamp: { value: lamp.clone() }, uGroundR: { value: coneRadiusAtGround },
      uColor: { value: new THREE.Color('#ffe2b0') },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec4 aOff;
        uniform float uTime, uSpeed, uHeight, uGroundR;
        uniform vec3 uLamp;
        varying float vLight; varying vec2 vUv;
        void main() {
          vUv = uv;
          float y = mod(aOff.y - uTime * 7.5 * aOff.w, uHeight);
          vec3 p = vec3(aOff.x, y, aOff.z);
          // dans le cône ? rayon du cône à cette hauteur, proportionnel à la distance sous la lampe
          float below = uLamp.y - p.y;
          float rCone = uGroundR * clamp(below / uLamp.y, 0.0, 1.0);
          float d = length(p.xz - uLamp.xz);
          vLight = smoothstep(rCone, rCone * 0.35, d) * smoothstep(0.0, 0.6, below) * (1.0 - smoothstep(uLamp.y * 0.55, uLamp.y, below) * 0.5);
          // trait vertical, face à la caméra autour de l'axe Y ; longueur = vitesse du temps
          vec3 camR = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
          float len = mix(0.018, 0.32, clamp(uSpeed, 0.0, 1.0));
          float w = 0.0065;
          vec3 pos = p + camR * (position.x * w) + vec3(0.0, position.y * len, 0.0);
          gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vLight; varying vec2 vUv;
        void main() {
          float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float a = vLight * edge * (0.25 + 0.75 * vUv.y);
          if (a < 0.003) discard;
          gl_FragColor = vec4(uColor * a * 0.9, a);
        }`,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  /** speed : 1 = temps normal, 0 = temps arrêté */
  update(dt: number, speed: number) {
    this.time += dt * speed;
    this.uniforms.uTime.value = this.time;
    this.uniforms.uSpeed.value = speed;
  }
}

/**
 * Éclaboussures au sol, dans la lumière : de petits anneaux qui s'ouvrent et disparaissent.
 */
export class Splashes {
  readonly mesh: THREE.InstancedMesh;
  private life: Float32Array;
  private pos: THREE.Vector3[];
  private dummy = new THREE.Object3D();
  private R = rng(5);

  constructor(private count: number, private center: THREE.Vector3, private radius: number) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color('#ffd79a') } },
      vertexShader: `attribute float aLife; varying float vLife; varying vec2 vUv; void main(){ vUv = uv; vLife = aLife; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vLife; varying vec2 vUv;
        void main(){ float r = length(vUv - 0.5) * 2.0; float ring = smoothstep(0.75, 0.9, r) * (1.0 - smoothstep(0.9, 1.0, r));
          float a = ring * (1.0 - vLife) * 0.55; if (a < 0.002) discard; gl_FragColor = vec4(uColor * a, a); }`,
    });
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const life = new Float32Array(count).map(() => this.R.next());
    geo.setAttribute('aLife', new THREE.InstancedBufferAttribute(life, 1));
    this.life = life;
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.pos = Array.from({ length: count }, () => this.randomPos());
  }

  private randomPos() {
    const a = this.R.next() * Math.PI * 2, r = Math.sqrt(this.R.next()) * this.radius;
    return new THREE.Vector3(this.center.x + Math.cos(a) * r, 0.012, this.center.z + Math.sin(a) * r);
  }

  update(dt: number, speed: number) {
    const attr = this.mesh.geometry.getAttribute('aLife') as THREE.InstancedBufferAttribute;
    for (let i = 0; i < this.count; i++) {
      this.life[i] += dt * speed * 1.8;
      if (this.life[i] >= 1) { this.life[i] = 0; this.pos[i] = this.randomPos(); }
      const s = 0.02 + this.life[i] * 0.16;
      this.dummy.position.copy(this.pos[i]);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    attr.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
