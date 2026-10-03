import { Experience } from './core/Experience';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const experience = new Experience(canvas);
void experience.start();

// accès console, pratique pour régler les transitions : experience.goToLevel(3)
declare global { interface Window { experience: Experience } }
window.experience = experience;
