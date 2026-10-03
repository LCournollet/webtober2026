import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FinalShader } from '../shaders/final';
import type { ExperienceScene, Look, Quality } from './types';

/** Valeurs de post-traitement animées par les transitions (GSAP écrit directement dedans). */
export interface PostState {
  blur: number; focus: number; zoom: number; fade: number; exposure: number; chroma: number;
  fadeColor: THREE.Color;
}

/**
 * Un seul WebGLRenderer et une seule chaîne de post-traitement pour toutes les échelles :
 * on change simplement la scène et la caméra du RenderPass. C'est ce qui rend les coupes invisibles.
 */
export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly post: PostState = { blur: 0, focus: 0.35, zoom: 0, fade: 1, exposure: 1, chroma: 0, fadeColor: new THREE.Color('#05070d') };
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloom: UnrealBloomPass;
  private final: ShaderPass;
  private look: Look | null = null;
  private maxPixelRatio: number;

  constructor(canvas: HTMLCanvasElement, public quality: Quality) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance', stencil: false });
    this.maxPixelRatio = quality === 'high' ? 1.6 : 1;
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
    this.gl.setSize(window.innerWidth, window.innerHeight, false);
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;

    this.composer = new EffectComposer(this.gl);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.6, 0.85);
    if (quality === 'low') this.bloom.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);
    this.resize();
  }

  /** La scène affichée, et son étalonnage. */
  show(s: ExperienceScene) {
    this.renderPass.scene = s.scene;
    this.renderPass.camera = s.camera;
    this.look = s.look;
    this.gl.toneMappingExposure = s.look.exposure;
    this.bloom.strength = s.look.bloom;
    this.bloom.threshold = s.look.bloomThreshold;
    const u = this.final.uniforms;
    u.uTint.value.set(...s.look.tint);
    u.uVignette.value = s.look.vignette;
    u.uGrain.value = s.look.grain;
  }

  render(elapsed: number) {
    const u = this.final.uniforms, p = this.post;
    u.uTime.value = elapsed;
    u.uBlur.value = p.blur;
    u.uFocus.value = p.focus;
    u.uZoom.value = p.zoom;
    u.uFade.value = p.fade;
    u.uFadeColor.value.copy(p.fadeColor);
    u.uExposure.value = p.exposure;
    u.uChroma.value = p.chroma;
    if (this.look) this.gl.toneMappingExposure = this.look.exposure;
    this.composer.render();
  }

  /** Dégradation douce si la machine peine : on baisse d'abord la résolution. */
  degrade() {
    if (this.maxPixelRatio <= 1) return false;
    this.maxPixelRatio = Math.max(1, this.maxPixelRatio - 0.3);
    this.resize();
    return true;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
    this.gl.setSize(w, h, false);
    this.composer.setPixelRatio(this.gl.getPixelRatio());
    this.composer.setSize(w, h);
    this.final.uniforms.uRes.value.set(w * this.gl.getPixelRatio(), h * this.gl.getPixelRatio());
  }
}
