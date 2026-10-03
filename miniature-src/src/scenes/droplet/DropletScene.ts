import * as THREE from 'three';
import gsap from 'gsap';
import { BaseScene } from '../BaseScene';
import { Level, type Direction, type Look, type SceneContext } from '../../core/types';
import { bokehBackdrop, softDisc } from '../../utils/textures';
import { rng } from '../../utils/math';

/**
 * Échelle 1 : la goutte, suspendue dans le temps.
 * Une sphère d'eau (indice 1,33) qui réfracte et reflète la rue devenue floue : le fond est une toile de
 * bokeh opaque (pour que la transmission ait quelque chose à tordre) et sert aussi de carte d'environnement.
 * La surface ondule à peine (déplacement dans le vertex shader), quelques micro-bulles flottent dedans.
 */
/** distance de raccord : goutte de rayon 1 sur ~35 % de la hauteur à fov 18 */
const DROP_START = 1 / (0.35 * Math.tan(THREE.MathUtils.degToRad(9)));

export class DropletScene extends BaseScene {
  readonly level = Level.Droplet;
  readonly look: Look = { exposure: 1.25, bloom: 0.5, bloomThreshold: 0.7, tint: [0.98, 1, 1.03], vignette: 0.55, grain: 0.035 };
  readonly lines = ['Water.', 'Almost every living thing we know depends on it.', 'Something so ordinary that we barely notice it.'];
  readonly maskColor = new THREE.Color('#bfe0e2');   // on traverse la surface : l'eau éclairée par le lampadaire

  private drop: THREE.Mesh;
  private shader: { uniforms: Record<string, THREE.IUniform> } | null = null;
  private motes: THREE.Points;
  private bubbles: THREE.Group;
  private zoom = { r: 4.2 };
  private glints: { dir: THREE.Vector3; sprite: THREE.Sprite }[];
  private tmp = new THREE.Vector3();

  private glint(color: string, size: number, opacity: number) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(), color, transparent: true, opacity, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(size); sp.renderOrder = 5; this.scene.add(sp);
    return sp;
  }

  constructor(ctx: SceneContext) {
    super(ctx, 32, 0.01, 200);
    const s = this.scene, R = rng(21);
    const backdrop = bokehBackdrop(2048, 1024, 9);
    backdrop.mapping = THREE.EquirectangularReflectionMapping;
    s.background = new THREE.Color('#05080f');
    // fond opaque : une grande sphère vue de l'intérieur (la transmission la réfracte)
    const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.MeshBasicMaterial({ map: backdrop, side: THREE.BackSide, fog: false, color: new THREE.Color(0.45, 0.45, 0.5) }));
    sky.rotation.y = -0.9; s.add(sky);
    // derrière la goutte, la rue floue en grand : c'est elle que la goutte renverse et concentre (comme en photo macro)
    const flat = bokehBackdrop(2048, 1024, 13);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(46, 23), new THREE.MeshBasicMaterial({ map: flat, fog: false }));
    wall.position.set(-2, 1.5, -13); s.add(wall);
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    s.environment = pmrem.fromEquirectangular(backdrop).texture;
    s.environmentIntensity = 1.0;
    pmrem.dispose();

    // lumières : le lampadaire (chaud, en haut à droite) et un liseré froid
    // (pas de vraies lumières : leurs reflets spéculaires sont des points HDR que le bloom transforme en carrés ;
    //  on pose à la place des reflets doux, orientés à chaque image entre la caméra et la source)
    this.glints = [
      { dir: new THREE.Vector3(4, 4.5, 3).normalize(), sprite: this.glint('#ffd9a0', 0.16, 0.9) },
      { dir: new THREE.Vector3(-5, 1, -4).normalize(), sprite: this.glint('#9fbfe8', 0.1, 0.45) },
    ];

    // la goutte
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#f4faff', roughness: 0.05, metalness: 0, transmission: 1, thickness: 1.2, ior: 1.333,
      attenuationColor: new THREE.Color('#b9dbe4'), attenuationDistance: 8, specularIntensity: 1, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: 0.08,
    });
    mat.onBeforeCompile = shader => {
      shader.uniforms.uTime = { value: 0 };
      this.shader = shader as unknown as { uniforms: Record<string, THREE.IUniform> };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uTime;
          float wob(vec3 p) { return sin(p.x * 3.1 + uTime * 0.9) * sin(p.y * 2.7 - uTime * 0.7) * sin(p.z * 3.3 + uTime * 0.5); }`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float w = wob(position) * 0.018 + sin(position.y * 9.0 + uTime * 1.3) * 0.004;
          transformed += normal * w;`);
    };
    this.drop = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), mat);
    this.drop.scale.set(1, 1.04, 1);
    s.add(this.drop);

    // micro-bulles, petites imperfections
    this.bubbles = new THREE.Group();
    const bubM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transmission: 0.6, thickness: 0.02, ior: 1.0, envMapIntensity: 1.5 });
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(R.range(0.012, 0.045), 16, 12), bubM);
      const v = new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize().multiplyScalar(R.range(0.2, 0.75)); b.position.copy(v); this.bubbles.add(b);
    }
    this.drop.add(this.bubbles);
    // poussières en suspension, à peine visibles (la vie qu'on ne voit pas encore)
    const n = 90, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize().multiplyScalar(Math.cbrt(R.next()) * 0.85); pos.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ map: softDisc(), size: 0.022, color: '#cfe6e8', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.drop.add(this.motes);

    // orbite : la goutte reste à droite, le texte respire à gauche
    this.orbit.target.set(-0.75, 0, 0);
    this.orbit.radius = 4.2; this.orbit.yaw = 0.25; this.orbit.pitch = 0.08;
    this.orbit.hoverRange = [0.22, 0.12]; this.orbit.dragLimit = [1.1, 0.5];
  }

  async enter(dir: Direction) {
    // en descendant : même cadrage que la fin du travelling dans la rue (goutte centrée, 35 % de l'écran, fov 18)
    this.zoom.r = dir > 0 ? DROP_START : 0.35;
    this.camera.fov = dir > 0 ? 18 : 60; this.camera.updateProjectionMatrix();
    this.orbit.dragYaw = this.orbit.dragPitch = 0;
  }

  /** En descendant, le travelling de la rue continue : on s'approche de la goutte, qui glisse à droite. En remontant, on sort de sa surface. */
  intro(dir: Direction) {
    const tl = gsap.timeline();
    tl.to(this.zoom, { r: 4.2, duration: dir > 0 ? 4.2 : 3.4, ease: dir > 0 ? 'power2.out' : 'power3.out' }, 0);
    this.fovTo(tl, 32, dir > 0 ? 4.2 : 3.4, 'power2.out', 0);
    return tl;
  }

  /** Descente : on fonce vers la surface, elle devient immense, on la traverse. Montée : on recule dans la nuit. */
  outro(dir: Direction) {
    const tl = gsap.timeline();
    if (dir > 0) {
      tl.to(this.zoom, { r: 1.18, duration: 1.8, ease: 'power2.inOut' }, 0);   // la surface remplit l'écran
      tl.to(this.zoom, { r: 0.15, duration: 1.0, ease: 'power3.in' }, 1.8);     // on passe à travers
      this.fovTo(tl, 62, 2.8, 'power2.in', 0);
    } else {
      tl.to(this.zoom, { r: DROP_START, duration: 2.4, ease: 'power2.inOut' }, 0);   // on revient au cadrage de raccord avec la rue
      this.fovTo(tl, 18, 2.4, 'power2.inOut', 0);
    }
    return tl;
  }

  update(dt: number, elapsed: number) {
    if (this.shader) this.shader.uniforms.uTime.value = elapsed;
    this.drop.rotation.y += dt * 0.03;
    this.bubbles.rotation.x = Math.sin(elapsed * 0.1) * 0.2;
    this.motes.rotation.y = elapsed * 0.02;
    // quand on se colle à la goutte, l'orbite se recentre sur elle
    // et au raccord avec la rue (de loin) elle est centrée, puis glisse à droite en approchant
    const near = THREE.MathUtils.clamp((4.2 - this.zoom.r) / 3, 0, 1);
    const far = THREE.MathUtils.smoothstep(this.zoom.r, 4.2, DROP_START);
    this.orbit.target.set(-0.75 * (1 - near) * (1 - far), 0, 0);
    this.orbit.radius = this.zoom.r;
    this.applyOrbit(dt);
    // reflet : point de la sphère dont la normale est la bissectrice caméra / lumière
    const toCam = this.tmp.copy(this.camera.position).normalize();
    for (const g of this.glints) {
      const h = g.dir.clone().add(toCam).normalize();
      g.sprite.position.copy(h).multiplyScalar(1.01);
      g.sprite.visible = h.dot(toCam) > 0.15;
    }
  }
}
