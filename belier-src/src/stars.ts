/*
 * Étoiles réelles de la région du Bélier (positions J2000 arrondies, magnitude visuelle, type spectral).
 * Ascension droite en heures, déclinaison en degrés.
 */
export interface Star { id?: string; name: string; ra: number; dec: number; mag: number; sp: string; info?: string }

export const ARIES: Star[] = [
  { id: 'hamal', name: 'Hamal', ra: 2.1194, dec: 23.4624, mag: 2.0, sp: 'K', info: 'α Arietis · géante orange · 66 années-lumière' },
  { id: 'sheratan', name: 'Sheratan', ra: 1.9107, dec: 20.808, mag: 2.64, sp: 'A', info: 'β Arietis · étoile blanche · 60 années-lumière' },
  { id: 'mesarthim', name: 'Mesarthim', ra: 1.892, dec: 19.2958, mag: 3.88, sp: 'A', info: 'γ Arietis · étoile double · 164 années-lumière' },
  { id: 'bharani', name: 'Bharani', ra: 2.833, dec: 27.2606, mag: 3.63, sp: 'B', info: '41 Arietis · étoile bleu-blanc · 166 années-lumière' },
];
/** Les traits de la constellation (ordre libre) */
export const EDGES: [string, string][] = [['mesarthim', 'sheratan'], ['sheratan', 'hamal'], ['hamal', 'bharani']];

export const FIELD: Star[] = [
  // reste du Bélier
  { name: '35 Ari', ra: 2.724, dec: 27.7072, mag: 4.65, sp: 'B' }, { name: '39 Ari', ra: 2.7979, dec: 29.2471, mag: 4.52, sp: 'K' },
  { name: 'Botein', ra: 3.1938, dec: 19.7266, mag: 4.35, sp: 'K' }, { name: 'ε Ari', ra: 2.9852, dec: 21.3404, mag: 4.63, sp: 'A' },
  { name: 'ζ Ari', ra: 3.2533, dec: 21.0447, mag: 4.89, sp: 'A' }, { name: 'ι Ari', ra: 1.9578, dec: 17.8175, mag: 5.1, sp: 'G' },
  { name: 'λ Ari', ra: 1.9776, dec: 23.5961, mag: 4.79, sp: 'F' }, { name: 'ν Ari', ra: 2.6493, dec: 21.9614, mag: 5.43, sp: 'A' },
  // Triangle
  { name: 'Mothallah', ra: 1.8847, dec: 29.5788, mag: 3.42, sp: 'F' }, { name: 'β Tri', ra: 2.1592, dec: 34.9873, mag: 3.0, sp: 'A' }, { name: 'γ Tri', ra: 2.2886, dec: 33.8472, mag: 4.01, sp: 'A' },
  // Poissons, Baleine
  { name: 'Alpherg', ra: 1.5249, dec: 15.3458, mag: 3.62, sp: 'G' }, { name: 'ο Psc', ra: 1.7565, dec: 9.1577, mag: 4.26, sp: 'K' }, { name: 'Alrescha', ra: 2.034, dec: 2.7638, mag: 3.82, sp: 'A' },
  { name: 'Menkar', ra: 3.038, dec: 4.0897, mag: 2.53, sp: 'M' }, { name: 'γ Cet', ra: 2.7213, dec: 3.2358, mag: 3.47, sp: 'A' }, { name: 'δ Cet', ra: 2.6581, dec: 0.3285, mag: 4.07, sp: 'B' },
  { name: 'ε Psc', ra: 1.0491, dec: 7.8901, mag: 4.27, sp: 'K' }, { name: 'δ Psc', ra: 0.8114, dec: 7.5851, mag: 4.43, sp: 'K' },
  // Andromède, Persée
  { name: 'Almach', ra: 2.065, dec: 42.3297, mag: 2.1, sp: 'K' }, { name: 'Mirach', ra: 1.1622, dec: 35.6206, mag: 2.05, sp: 'M' },
  { name: 'μ And', ra: 0.9456, dec: 38.4993, mag: 3.87, sp: 'A' }, { name: 'Mirfak', ra: 3.4054, dec: 49.8612, mag: 1.79, sp: 'F' },
  { name: 'Algol', ra: 3.1361, dec: 40.9556, mag: 2.12, sp: 'B' }, { name: 'ε Per', ra: 3.9642, dec: 40.0102, mag: 2.89, sp: 'B' },
  { name: 'ζ Per', ra: 3.9022, dec: 31.8836, mag: 2.85, sp: 'B' }, { name: 'δ Per', ra: 3.7155, dec: 47.7876, mag: 3.01, sp: 'B' },
  { name: 'ο Per', ra: 3.7385, dec: 32.2883, mag: 3.83, sp: 'B' }, { name: 'ρ Per', ra: 3.0848, dec: 38.8403, mag: 3.39, sp: 'M' },
  // Pléiades et Taureau
  { name: 'Alcyone', ra: 3.7914, dec: 24.1051, mag: 2.87, sp: 'B' }, { name: 'Atlas', ra: 3.8193, dec: 24.0534, mag: 3.62, sp: 'B' },
  { name: 'Electra', ra: 3.7479, dec: 24.1133, mag: 3.7, sp: 'B' }, { name: 'Maia', ra: 3.7636, dec: 24.3678, mag: 3.87, sp: 'B' },
  { name: 'Merope', ra: 3.7721, dec: 23.9483, mag: 4.18, sp: 'B' }, { name: 'Taygeta', ra: 3.7535, dec: 24.4672, mag: 4.29, sp: 'B' },
  { name: 'Pleione', ra: 3.8196, dec: 24.1367, mag: 5.05, sp: 'B' }, { name: 'Celaeno', ra: 3.7457, dec: 24.2894, mag: 5.45, sp: 'B' },
  { name: 'Aldebaran', ra: 4.5987, dec: 16.5093, mag: 0.87, sp: 'M' }, { name: 'Ain', ra: 4.4769, dec: 19.1804, mag: 3.53, sp: 'K' },
  { name: 'γ Tau', ra: 4.3297, dec: 15.6276, mag: 3.65, sp: 'K' }, { name: 'δ Tau', ra: 4.3823, dec: 17.5425, mag: 3.76, sp: 'K' },
  { name: 'θ² Tau', ra: 4.4778, dec: 15.8709, mag: 3.4, sp: 'A' }, { name: 'λ Tau', ra: 4.0109, dec: 12.4903, mag: 3.47, sp: 'B' },
  { name: 'Elnath', ra: 5.4382, dec: 28.6075, mag: 1.65, sp: 'B' }, { name: 'Capella', ra: 5.2782, dec: 45.998, mag: 0.08, sp: 'G' },
];

/** couleur apparente selon le type spectral (température) */
export const SPECTRAL: Record<string, [number, number, number]> = {
  O: [0.62, 0.71, 1.0], B: [0.7, 0.78, 1.0], A: [0.85, 0.89, 1.0], F: [0.99, 0.98, 1.0], G: [1.0, 0.94, 0.85], K: [1.0, 0.82, 0.62], M: [1.0, 0.72, 0.48],
};
