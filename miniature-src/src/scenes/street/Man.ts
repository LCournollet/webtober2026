import * as THREE from 'three';
import gsap from 'gsap';

/**
 * L'homme qui attend : une silhouette stylisée (facettes, matières mates), manteau long, écharpe ocre,
 * parapluie noir à huit pans. Animation d'attente quasi imperceptible : respiration, un frisson de temps
 * en temps, un regard vers la route d'où le bus devrait venir.
 */
/** inclinaison du parapluie vers la tête (le dôme vient au-dessus de lui) */
const UMB_TILT = 0.16;

export class Man {
  readonly group = new THREE.Group();
  private chest: THREE.Group;
  private head: THREE.Group;
  private umbrella: THREE.Group;
  private shiver = 0;
  private lookTimer = 0;

  constructor() {
    const mat = (color: string, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });
    const coatM = mat('#2b3342'), trouserM = mat('#1a1f2a'), shoeM = mat('#111318', 0.5), skinM = mat('#b89479'), hairM = mat('#1b1714'), scarfM = mat('#8d6136');
    const add = (m: THREE.Mesh, parent: THREE.Object3D = this.group) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

    // jambes
    for (const s of [-1, 1]) {
      const leg = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.62, 3, 8), trouserM)); leg.position.set(s * 0.1, 0.42, 0);
      const shoe = add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.28), shoeM)); shoe.position.set(s * 0.1, 0.04, 0.05);
    }
    // buste (respire)
    this.chest = new THREE.Group(); this.chest.position.y = 0.72; this.group.add(this.chest);
    const coatProfile = [[0.0, 0], [0.3, 0], [0.27, 0.25], [0.24, 0.55], [0.23, 0.75], [0.2, 0.86], [0.08, 0.92], [0, 0.92]].map(([r, y]) => new THREE.Vector2(r, y));
    add(new THREE.Mesh(new THREE.LatheGeometry(coatProfile, 9), coatM), this.chest).scale.set(1, 1, 0.78);
    const shoulders = add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 9, 6), coatM), this.chest); shoulders.position.y = 0.78; shoulders.scale.set(1.15, 0.45, 0.75);
    const scarf = add(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 6, 10), scarfM), this.chest); scarf.position.y = 0.92; scarf.rotation.x = Math.PI / 2;
    const tail = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.03), scarfM), this.chest); tail.position.set(0.07, 0.78, 0.2); tail.rotation.z = 0.12;
    // bras gauche, main dans la poche
    const armL = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.5, 3, 8), coatM), this.chest); armL.position.set(-0.27, 0.5, 0.02); armL.rotation.z = -0.12;
    // bras droit, tient le parapluie
    // (coordonnées du buste) épaule → coude le long du corps → main relevée devant la poitrine, qui serre le manche
    const shoulder = new THREE.Vector3(0.24, 0.8, 0.0), elbow = new THREE.Vector3(0.3, 0.5, 0.07), grip = new THREE.Vector3(0.2, 0.58, 0.25);
    const limb = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
      const d = b.clone().sub(a), m = add(new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 3, 8), coatM), this.chest);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    };
    limb(shoulder, elbow, 0.068);
    limb(elbow, grip, 0.06);
    const hand = add(new THREE.Mesh(new THREE.SphereGeometry(0.052, 6, 5), skinM), this.chest); hand.position.copy(grip).add(new THREE.Vector3(0, 0, 0.02));
    // tête (regarde la route de temps en temps)
    this.head = new THREE.Group(); this.head.position.y = 1.72; this.group.add(this.head);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), skinM), this.head).scale.set(0.92, 1.06, 0.98);
    const hair = add(new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM), this.head); hair.position.set(0, 0.02, -0.012);
    const nose = add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), skinM), this.head); nose.position.set(0, -0.01, 0.12); nose.rotation.x = Math.PI / 2;
    // parapluie : manche, mât, toile à 8 pans légèrement creusés
    // le manche passe dans la main (crosse juste en dessous), le mât monte à côté de la tête, pas devant le visage
    this.umbrella = new THREE.Group(); this.umbrella.position.set(0.2, 0.72 + 0.58 - 0.07, 0.25 + 0.02); this.group.add(this.umbrella);
    const canopyM = new THREE.MeshStandardMaterial({ color: '#141922', roughness: 0.45, metalness: 0.05, flatShading: true, side: THREE.DoubleSide });
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.15, 6), shoeM), this.umbrella).position.y = 0.57;
    const handle = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.013, 5, 10, Math.PI), shoeM), this.umbrella); handle.position.set(0.05, 0, 0); handle.rotation.z = Math.PI;
    const canopyProfile = [[0.0, 0.34], [0.25, 0.3], [0.5, 0.2], [0.72, 0.05], [0.8, -0.04]].map(([r, y]) => new THREE.Vector2(r, y));
    const canopy = add(new THREE.Mesh(new THREE.LatheGeometry(canopyProfile, 8), canopyM), this.umbrella); canopy.position.y = 0.95;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const tip = add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), shoeM), this.umbrella); tip.position.set(Math.cos(a) * 0.8, 0.9, Math.sin(a) * 0.8); }
    this.umbrella.rotation.set(-0.2, 0, UMB_TILT);
  }

  /** time : temps « de l'histoire » (s'arrête quand le temps s'arrête) */
  update(time: number, dt: number, speed: number) {
    const breath = Math.sin(time * 1.55) * 0.5 + 0.5;
    this.chest.scale.set(1 + breath * 0.012, 1 + breath * 0.008, 1 + breath * 0.016);
    this.head.position.y = 1.72 + breath * 0.006;
    // il a un peu froid : un frisson rare
    this.shiver = Math.max(0, this.shiver - dt * speed * 1.5);
    if (speed > 0.5 && Math.random() < dt * 0.04) this.shiver = 1;
    this.group.rotation.z = Math.sin(time * 38) * 0.004 * this.shiver;
    this.umbrella.rotation.z = UMB_TILT + Math.sin(time * 0.7) * 0.012 + Math.sin(time * 41) * 0.006 * this.shiver;
    // un regard vers la route, puis retour
    this.lookTimer -= dt * speed;
    if (this.lookTimer <= 0 && speed > 0.5) {
      this.lookTimer = 7 + Math.random() * 6;
      gsap.timeline()
        .to(this.head.rotation, { y: -0.75, x: 0.05, duration: 1.4, ease: 'sine.inOut' })
        .to(this.head.rotation, { y: -0.1 + Math.random() * 0.2, x: -0.03, duration: 1.8, ease: 'sine.inOut' }, '+=1.6');
    }
  }
}
