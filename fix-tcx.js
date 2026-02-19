#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'SRC');
const FINAL = path.join(__dirname, 'FINAL');

if (!fs.existsSync(SRC)) {
  console.error('Dossier SRC introuvable :', SRC);
  process.exit(1);
}
if (!fs.existsSync(FINAL)) fs.mkdirSync(FINAL, { recursive: true });

const files = fs.readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.tcx'));
if (files.length === 0) {
  console.log('Aucun fichier .tcx trouvé dans SRC.');
  process.exit(0);
}

files.forEach(file => {
  const srcPath = path.join(SRC, file);
  let s = fs.readFileSync(srcPath, 'utf8');

  // 1) Forcer l'attribut Sport de Activity à "Running"
  s = s.replace(/(<Activity\b[^>]*\bSport=")([^"]*)(")/i, '$1Running$3');

  // 2) Rechercher la valeur maximale de DistanceMeters dans les Trackpoints
  const tpRegex = /<Trackpoint\b[\s\S]*?<DistanceMeters>([\d.]+)<\/DistanceMeters>[\s\S]*?<\/Trackpoint>/gi;
  let m;
  let max = 0;
  while ((m = tpRegex.exec(s)) !== null) {
    const val = parseFloat(m[1]);
    if (!isNaN(val) && val > max) max = val;
  }

  // 3) Mettre à jour (ou ajouter) <Lap> / <DistanceMeters> avec la valeur max détectée
  if (max > 0) {
    const lapDistRegex = /(<Lap\b[^>]*>[\s\S]*?<DistanceMeters>)([\d.]+)(<\/DistanceMeters>[\s\S]*?<\/Lap>)/i;
    if (lapDistRegex.test(s)) {
      s = s.replace(lapDistRegex, function (_, a, _old, b) {
        return a + String(max) + b;
      });
    } else {
      // Insérer juste après l'ouverture de la balise <Lap>
      s = s.replace(/(<Lap\b[^>]*>)/i, function (m0) {
        return m0 + '\n      <DistanceMeters>' + String(max) + '</DistanceMeters>';
      });
    }
  } else {
    // Si on n'a pas trouvé de distances dans les trackpoints, ne pas écraser
    console.warn('Aucune DistanceMeters détectée dans les Trackpoints pour', file);
  }

  // Écrire le fichier corrigé dans FINAL
  const outPath = path.join(FINAL, file);
  fs.writeFileSync(outPath, s, 'utf8');
  console.log('Traité :', file, '| distance max détectée =', max);
});

console.log('Terminé — fichiers écrits dans', FINAL);
