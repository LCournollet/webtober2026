import * as THREE from 'three';
import gsap from 'gsap';
import { BaseScene, pause } from '../BaseScene';
import { Level, type Direction, type Look, type SceneContext } from '../../core/types';
import { Rain, Splashes } from './Rain';
import { Man } from './Man';
import { rng } from '../../utils/math';
import { softDisc } from '../../utils/textures';
import { translucentMaterial } from '../../shaders/translucent';

const LAMP = new THREE.Vector3(-0.15, 4.55, 0.85);   // la tête du lampadaire
const GROUND_R = 2.7;                                 // rayon de la flaque de lumière au sol
const CAM_BASE = new THREE.Vector3(3.6, 1.85, 11.2);
const CAM_LOOK = new THREE.Vector3(0.1, 1.55, 0.2);
const DROP_AT = new THREE.Vector3(0.95, 2.05, 1.55);  // la goutte que l'on va suivre
/** distance caméra-goutte en fin de travelling : la goutte occupe ~35 % de la hauteur à fov 18 (= ouverture de DropletScene) */
const DROP_FRAME_DIST = 0.0095 / (0.35 * Math.tan(THREE.MathUtils.degToRad(9)));

/**
 * Échelle 0 : un homme attend son bus sous un lampadaire, la nuit, sous la pluie.
 * Le décor est minimal : le cône de lumière chaude, le sol mouillé, et autour une ville froide noyée de brume.
 */
export class StreetScene extends BaseScene {
  readonly level = Level.Street;
  readonly look: Look = { exposure: 1.0, bloom: 0.55, bloomThreshold: 0.72, tint: [0.97, 0.99, 1.04], vignette: 0.5, grain: 0.04 };
  readonly lines = ['Somewhere, someone is waiting.'];
  readonly maskColor = new THREE.Color('#1a2433');

  private rain: Rain;
  private splashes: Splashes;
  private man = new Man();
  private storyTime = 0;
  /** 1 = temps normal ; 0 = arrêté (animé par les transitions) */
  speed = { value: 1 };
  private drop: THREE.Mesh;
  private dropFalling = false;
  private dropVel = 0;
  private reflection: THREE.Mesh;
  private cars: { group: THREE.Group; t: number; dir: number }[] = [];
  private camState = { k: 0 };       // 0 = plan large, 1 = collé à la goutte
  private camFrom = new THREE.Vector3();
  private lookFrom = new THREE.Vector3();
  private finaleRing: THREE.Mesh;

  constructor(ctx: SceneContext) {
    super(ctx, 34, 0.02, 200);
    const s = this.scene, R = rng(3), low = ctx.quality === 'low';
    s.background = new THREE.Color('#070b13');
    s.fog = new THREE.FogExp2('#0a1120', 0.058);

    // --- lumière : le lampadaire (un spot qui projette l'ombre du parapluie) et un ciel de nuit à peine là
    s.add(new THREE.HemisphereLight('#2f4468', '#0a0d12', 0.9));
    const bounce = new THREE.PointLight('#ffb36b', 1.6, 3, 2); bounce.position.set(0.6, 0.35, 1.3); s.add(bounce);   // lumière renvoyée par le sol mouillé
    const spot = new THREE.SpotLight('#ffcf8f', 190, 14, 0.62, 0.75, 1.5);
    spot.position.copy(LAMP); spot.target.position.set(LAMP.x + 0.2, 0, LAMP.z - 0.2);
    spot.castShadow = true; spot.shadow.mapSize.set(low ? 512 : 1024, low ? 512 : 1024); spot.shadow.bias = -0.0005; spot.shadow.radius = 4;
    s.add(spot, spot.target);
    const bulbGlow = new THREE.PointLight('#ffc070', 4, 3.5, 2); bulbGlow.position.copy(LAMP).add(new THREE.Vector3(0, -0.15, 0)); s.add(bulbGlow);
    const moon = new THREE.DirectionalLight('#5d77a8', 0.35); moon.position.set(-6, 10, -8); s.add(moon);

    // --- sol : trottoir, bordure, chaussée mouillée, quelques flaques
    const wet = new THREE.MeshStandardMaterial({ color: '#1a212c', roughness: 0.22, metalness: 0.2 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), wet); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(60, 0.14, 4.6), new THREE.MeshStandardMaterial({ color: '#1a1f27', roughness: 0.55 }));
    walk.position.set(0, 0.07 - 0.14, -0.7); walk.receiveShadow = true; s.add(walk);   // trottoir à peine surélevé (sol à 0)
    const curb = new THREE.Mesh(new THREE.BoxGeometry(60, 0.16, 0.22), new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.6 }));
    curb.position.set(0, 0.0, 1.62); curb.receiveShadow = true; s.add(curb);
    const puddleM = new THREE.MeshStandardMaterial({ color: '#0b1018', roughness: 0.04, metalness: 0.4 });
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(1, 24), puddleM); p.rotation.x = -Math.PI / 2;
      p.position.set(R.range(-5, 6), 0.004, R.range(2.2, 7)); p.scale.set(R.range(0.4, 1.3), R.range(0.25, 0.6), 1); p.receiveShadow = true; s.add(p);
    }
    // marquage au sol, discret
    const lineM = new THREE.MeshStandardMaterial({ color: '#4a4f57', roughness: 0.5 });
    for (let x = -30; x < 30; x += 3.2) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.1), lineM); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.003, 5.2); s.add(l); }

    // reflet du lampadaire sur la chaussée mouillée : une traînée lumineuse tournée vers la caméra
    const reflTex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!;
      const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, 'rgba(255,205,140,0.9)'); gr.addColorStop(0.35, 'rgba(255,190,120,0.35)'); gr.addColorStop(1, 'rgba(255,170,100,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      const side = g.createLinearGradient(0, 0, 64, 0); side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = side; g.fillRect(0, 0, 64, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    this.reflection = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 7), new THREE.MeshBasicMaterial({ map: reflTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
    this.reflection.geometry.translate(0, 3.5, 0); this.reflection.geometry.rotateX(-Math.PI / 2);
    this.reflection.position.set(LAMP.x, 0.01, LAMP.z); s.add(this.reflection);

    // --- le lampadaire
    const ironM = new THREE.MeshStandardMaterial({ color: '#1b1f26', roughness: 0.5, metalness: 0.6 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 4.6, 10), ironM); pole.position.set(-1.05, 2.3, 0.85); pole.castShadow = true; s.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), ironM); arm.rotation.z = Math.PI / 2; arm.position.set(-0.6, 4.62, 0.85); s.add(arm);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 8, 1, true), ironM); hood.position.copy(LAMP).add(new THREE.Vector3(0, 0.1, 0)); s.add(hood);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.5) })); bulb.position.copy(LAMP); s.add(bulb);
    // halo autour de l'ampoule
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(), color: '#ffcf8f', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.position.copy(LAMP); halo.scale.setScalar(1.05); s.add(halo);
    // cône de lumière « volumétrique » : un cône ouvert, plus dense près de la lampe, doux sur les bords
    const cone = new THREE.Mesh(new THREE.ConeGeometry(GROUND_R, LAMP.y, 48, 1, true), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color('#ffc887') } },
      vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV; void main(){ vH = uv.y; vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform vec3 uColor; varying float vH; varying vec3 vN; varying vec3 vV;
        void main(){ float facing = abs(dot(normalize(vN), normalize(vV))); float soft = pow(facing, 1.6);
          float a = soft * pow(vH, 1.4) * 0.11 + soft * 0.012; gl_FragColor = vec4(uColor * a, a); }`,
    }));
    cone.position.set(LAMP.x, LAMP.y / 2, LAMP.z); s.add(cone);

    // --- arrêt de bus, tout simple
    const stopPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6), ironM); stopPole.position.set(1.75, 1.25, 1.0); stopPole.castShadow = true; s.add(stopPole);
    const signTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d')!;
      g.fillStyle = '#2c3d55'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#d9d4c7'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText('BUS', 64, 70); g.font = '28px sans-serif'; g.fillText('N° 12', 64, 120);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.03), [ironM, ironM, ironM, ironM, new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }), ironM]);
    sign.position.set(1.75, 2.35, 1.03); s.add(sign);

    // --- l'homme
    this.man.group.position.set(0.25, 0, 0.35);
    this.man.group.rotation.y = 0.35;
    s.add(this.man.group);

    // --- la ville au loin : volumes sombres, quelques fenêtres, bokeh
    const bM = new THREE.MeshStandardMaterial({ color: '#0d131d', roughness: 0.9 });
    const winGeo = new THREE.PlaneGeometry(0.28, 0.42);
    const winWarm = new THREE.MeshBasicMaterial({ color: '#8a6740' }), winCool = new THREE.MeshBasicMaterial({ color: '#3f5576' });
    for (let i = 0; i < 26; i++) {
      const w = R.range(4, 9), h = R.range(7, 22), d = R.range(4, 8), x = R.range(-34, 30), z = R.range(-20, -36);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bM); b.position.set(x, h / 2, z); s.add(b);
      for (let k = 0; k < 4; k++) if (R.next() < 0.6) { const wi = new THREE.Mesh(winGeo, R.next() < 0.75 ? winWarm : winCool); wi.position.set(x + R.range(-w / 2 + 0.6, w / 2 - 0.6), R.range(2, h - 1), z + d / 2 + 0.01); s.add(wi); }
    }
    const disc = softDisc();
    for (let i = 0; i < 40; i++) {
      const warm = R.next() < 0.6;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: warm ? '#ffb46a' : '#7fa4e0', transparent: true, opacity: R.range(0.05, 0.22), depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      sp.position.set(R.range(-40, 40), R.range(0.5, 9), R.range(-22, -45)); sp.scale.setScalar(R.range(0.8, 2.6)); s.add(sp);
    }
    // une voiture passe de temps en temps : deux phares, deux feux rouges, leur reflet
    for (const dir of [1, -1]) {
      const g = new THREE.Group();
      for (const side of [-0.7, 0.7]) {
        const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: dir > 0 ? '#fff1d8' : '#ff3a2a', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
        head.position.set(0, 0.6, side); head.scale.setScalar(0.55); g.add(head);
        const refl = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: dir > 0 ? '#ffe2b0' : '#ff3a2a', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
        refl.position.set(0, 0.02, side); refl.scale.set(0.6, 1.4, 1); g.add(refl);
      }
      g.position.set(-60, 0, dir > 0 ? 6.4 : 4.1); g.rotation.y = Math.PI / 2; s.add(g);
      this.cars.push({ group: g, t: dir > 0 ? 6 : 19, dir });
    }

    // --- la pluie, les éclaboussures
    this.rain = new Rain(low ? 2200 : 4200, LAMP, GROUND_R + 0.4);
    s.add(this.rain.mesh);
    this.splashes = new Splashes(low ? 24 : 48, new THREE.Vector3(LAMP.x + 0.2, 0, LAMP.z - 0.1), GROUND_R * 0.95);
    s.add(this.splashes.mesh);

    // --- la goutte que l'on suivra (invisible tant qu'elle n'est pas choisie)
    this.drop = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 32, 24), translucentMaterial({ core: '#3a4a60', rim: '#ffdcae', opacity: 1.1 }));   // sur fond sombre, une goutte se lit par son liseré de lumière
    this.drop.scale.set(1, 1.12, 1);
    this.drop.position.copy(DROP_AT);
    this.drop.visible = false;
    s.add(this.drop);
    const dropGlint = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: '#ffe3b6', transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
    dropGlint.scale.setScalar(0.0055); dropGlint.position.set(0.0035, 0.004, 0.007); this.drop.add(dropGlint); this.drop.userData.glint = dropGlint;
    // anneau de l'impact final
    this.finaleRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.finaleRing.position.set(DROP_AT.x, 0.015, DROP_AT.z); s.add(this.finaleRing);

    this.camera.position.copy(CAM_BASE);
    this.camera.lookAt(CAM_LOOK);
  }

  // ------------------------------------------------------------------ transitions
  /**
   * Vers la goutte : le temps ralentit brutalement puis s'arrête (la pluie redevient des perles immobiles),
   * une goutte s'éclaire devant le lampadaire, la caméra fait un long travelling jusqu'à elle.
   */
  outro(dir: Direction) {
    const tl = gsap.timeline();
    if (dir < 0) return pause(0.6);
    this.drop.visible = true;
    this.drop.position.copy(DROP_AT);
    const glint = this.drop.userData.glint as THREE.Sprite;
    tl.to(this.speed, { value: 0, duration: 1.5, ease: 'expo.out' }, 0);
    tl.to(glint.material, { opacity: 0.45, duration: 0.8, ease: 'sine.out' }, 0.3);
    this.camFrom.copy(this.camera.position); this.lookFrom.copy(CAM_LOOK);
    this.camState.k = 0;
    tl.to(this.camState, { k: 1, duration: 3.1, ease: 'power3.inOut' }, 0.7);
    this.fovTo(tl, 18, 3.1, 'power2.inOut', 0.7);
    
    return tl;
  }

  /** En revenant de la goutte (scroll vers le haut) : on recule depuis elle, le temps reprend. */
  intro(dir: Direction) {
    const tl = gsap.timeline();
    if (dir > 0) return pause(0.4);
    this.camState.k = 1;
    tl.to(this.camState, { k: 0, duration: 2.8, ease: 'power3.out' }, 0);
    this.fovTo(tl, 34, 2.8, 'power2.out', 0);
    tl.to(this.speed, { value: 1, duration: 2.2, ease: 'power2.in' }, 1.0);
    tl.call(() => { this.drop.visible = false; }, [], 2.6);
    return tl;
  }

  async enter(dir: Direction) {
    if (dir > 0) { this.speed.value = 1; this.camState.k = 0; this.camera.fov = 34; this.camera.updateProjectionMatrix(); }
    else { this.camFrom.copy(CAM_BASE); this.lookFrom.copy(CAM_LOOK); }
  }

  /** Avant le retour final : tout est exactement comme au début, mais le temps est encore suspendu. */
  prepareReturn() {
    this.speed.value = 0;
    this.camState.k = 0;
    this.camFrom.copy(CAM_BASE); this.lookFrom.copy(CAM_LOOK);
    this.camera.fov = 34; this.camera.updateProjectionMatrix();
    this.drop.visible = true;
    this.drop.position.copy(DROP_AT);
    this.dropFalling = false;
  }

  /** Le temps reprend ; la goutte finit sa chute et touche le sol. */
  finale(onLanded: () => void) {
    gsap.to(this.speed, { value: 1, duration: 1.6, ease: 'power2.in' });
    gsap.delayedCall(0.9, () => { this.dropFalling = true; this.dropVel = 1.5; });
    this.onLanded = onLanded;
  }
  private onLanded: (() => void) | null = null;

  // ------------------------------------------------------------------ boucle
  update(dt: number, elapsed: number) {
    const sp = this.speed.value;
    this.storyTime += dt * sp;
    this.rain.update(dt, sp);
    this.splashes.update(dt, sp);
    this.man.update(this.storyTime, dt, sp);

    // la goutte finale tombe
    if (this.dropFalling) {
      this.dropVel += 9.8 * dt;
      this.drop.position.y -= this.dropVel * dt;
      if (this.drop.position.y <= 0.02) {
        this.dropFalling = false; this.drop.visible = false;
        const m = this.finaleRing.material as THREE.MeshBasicMaterial;
        this.finaleRing.scale.setScalar(0.02); m.opacity = 0.7;
        gsap.to(this.finaleRing.scale, { x: 0.45, y: 0.45, z: 0.45, duration: 1.6, ease: 'power2.out' });
        gsap.to(m, { opacity: 0, duration: 1.6, ease: 'power1.out' });
        this.onLanded?.(); this.onLanded = null;
      }
    }

    // voitures lointaines
    for (const c of this.cars) {
      c.t -= dt * sp;
      if (c.t < 0) { c.t = 22 + Math.random() * 14; c.group.position.x = -60 * c.dir; c.group.userData.v = 13 * c.dir; }
      c.group.position.x += (c.group.userData.v ?? 0) * dt * sp;
    }

    // le reflet regarde toujours la caméra (c'est un reflet !)
    const toCam = new THREE.Vector2(this.camera.position.x - LAMP.x, this.camera.position.z - LAMP.z);
    this.reflection.rotation.y = Math.atan2(toCam.x, toCam.y);

    // caméra : plan large qui respire à peine, ou travelling vers la goutte
    const k = this.camState.k;
    const idle = new THREE.Vector3(Math.sin(elapsed * 0.07) * 0.18 + this.orbit.hoverYaw * 1.2, Math.sin(elapsed * 0.05) * 0.06 + this.orbit.hoverPitch * 0.8, Math.cos(elapsed * 0.06) * 0.12);
    const base = this.camFrom.lengthSq() > 0 ? this.camFrom : CAM_BASE;
    const wide = base.clone().add(idle.multiplyScalar(1 - k));
    const near = this.drop.position.clone().add(new THREE.Vector3(0.06, 0.02, 0.32).normalize().multiplyScalar(DROP_FRAME_DIST));
    this.camera.position.lerpVectors(wide, near, k);
    const look = new THREE.Vector3().lerpVectors(this.lookFrom.lengthSq() > 0 ? this.lookFrom : CAM_LOOK, this.drop.position, Math.min(1, k * 1.4));
    this.camera.lookAt(look);
  }
}
