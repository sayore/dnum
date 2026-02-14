# 🌌 DNum: Dimensional Numbers for Infinite Scales

**DNum** ist eine TypeScript-Bibliothek für den Umgang mit Zahlen, die herkömmliche Datentypen sprengen. Ob du ein intergalaktisches Idle-Game baust, bei dem Währungen die  Marke überschreiten, oder eine Weltraum-Simulation mit Nanometer-Präzision bei Milliarden Kilometern Entfernung – DNum hält dir den Rücken frei.

## ✨ Features

* **Unendliche Reichweite:** Nutzt das "Dimensionale Modell" (), um Zahlen weit jenseits von `Number.MAX_VALUE` darzustellen.
* **Tracer-System:** Ein intelligenter Akkumulator für Mikro-Beträge, der verhindert, dass kleine Änderungen bei riesigen Skalen einfach "verschluckt" werden (Underflow-Schutz).
* **Banking-Safe Fast-Path:** Rechnet im Bereich bis 1 Billiarde () bit-identisch mit Standard-Fließkommazahlen für maximale Performance und Kompatibilität.
* **Wissenschaftliche Funktionen:** Native Unterstützung für `sqrt()`, `pow(n)`, `div()` und `mul()`, optimiert für logarithmische Stabilität.
* **Deep-Precision String Stitching:** Die Methode `toPreciseString()` umgeht Hardware-Rundungsfehler, um Nanometer neben Milliarden Kilometern korrekt anzuzeigen.
* **Hybrid Formatter:** Intelligente Anzeigeformate – von klassischem Währungsformat über "AA-Notation" bis hin zum "Götter-Modus" (Dimensions-Indizes).

---

## 🚀 Installation

```bash
# In deinem Projektordner
npm install dnum 
# oder
pnpm add dnum

```

---

## 🛠 Usage

### 1. Das "Banking" Szenario (Präzision)

DNum erkennt automatisch, wenn du dich im "menschlichen" Bereich befindest und nutzt den Fast-Path.

```typescript
import { DNum } from 'dnum';

const wallet = DNum.fromAny(1_000_000_000); // 1 Milliarde
wallet.add(DNum.fromAny(0.00000001));      // Ein winziger Staubkorn

// Herkömmliche Floats würden das hier verlieren. 
// DNum speichert es im Tracer!
console.log(wallet.toPreciseString(8)); // "1000000000.00000001"

```

### 2. Der "Idle Game" Modus (Skalierung)

Wenn Zahlen das Universum sprengen:

```typescript
const cookies = DNum.fromLog(1000); // 10^1000 Cookies
const boost = DNum.fromAny(2);
cookies.pow(10); // 10^10000 Cookies!

console.log(cookies.toScientific()); // "1.0000e+10000"

```

---

## 🧠 Wie es funktioniert

### Das Dimensionale Modell

Anstatt eine riesige Mantisse zu speichern, repräsentiert DNum Werte als Volumen eines -dimensionalen Hyperwürfels: .

* *(Seitenlänge):* Gehalten im Bereich  für optimale Präzision.
* *(Dimension):* Die Skalierungsebene.

### Der Tracer (Das Gedächtnis für Kleingeld)

Wenn du  (Goliath) und  (David) addierst, kann die CPU das nicht in einem Schritt. DNum parkt "David" in einem **Tracer-Bucket**. Sobald genug Davids gesammelt wurden, um im Sichtfeld von Goliath relevant zu werden, werden sie automatisch fusioniert.

---

## 📊 Formatter-Logik

Der mitgelieferte `DNumFormatter` schaltet automatisch zwischen verschiedenen Modi um:

| Wert-Bereich | Beispiel-Ausgabe |
| --- | --- |
| < 1.000.000 | `1.250,50` |
| Millionen bis Quadrillionen | `12,50 Quadrillionen` |
| Bis  | `1.50 aa` |
| Jenseits von Gut und Böse | `1.50 [D12]` |

---

## 🧪 Tests

DNum kommt mit einer harten Test-Suite (Vitest/Jest), die unter anderem eine **Asteroiden-Landung** (Bennu-Mission) simuliert:

* 300 Mio. km Anflug.
* 1.000.000 Korrekturen im Nanometer-Bereich.
* **Ergebnis:** 0.000000000m Abweichung.

```bash
npm test

```

---

## 💾 Persistence

Speichere deine DNums einfach als JSON. Die Tracer-Daten werden automatisch mit serialisiert, damit kein Fortschritt verloren geht.

```typescript
const saveGame = playerMoney.serialize();
const loadedMoney = DNum.deserialize(saveGame);

```
