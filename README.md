# DNum Library

Eine mathematische Bibliothek für multidimensionale Arithmetik, die Präzisionsverluste bei großen Skalenunterschieden durch ein Tracer-System verhindert.

## Installation

```bash
npm install
```

## Verwendung

```typescript
import { DNum } from './src/index';

const vermoegen = new DNum(90, 12); // Dimension 12, Wert 90
const kosten = new DNum(50, 1);    // Winzige Kosten in Dimension 1

vermoegen.sub(kosten); 
console.log(vermoegen.toString()); // Output fast unverändert, Rest im Tracer

const gewinn = new DNum(100, 11);
vermoegen.add(gewinn);
console.log(vermoegen.toString()); // Sichtbare Änderung
```

## Entwicklung

- `npm run build`: Kompiliert das Projekt nach `dist/`.
- `npm test`: Führt die Tests mit Vitest aus.
