/**
 * Verwaltet Mikro-Beträge in verschiedenen Dimensionen, 
 * um Präzisionsverluste bei großen Skalenunterschieden zu verhindern.
 */
class TracerSystem {
  private buckets: Map<number, number> = new Map();
  private readonly THRESHOLD = 100;

  constructor(private onOverflow: (value: number, dim: number) => void) { }

  deposit(value: number, dim: number): void {
    if (value === 0) return;
    const current = this.buckets.get(dim) || 0;
    const nextValue = current + value;

    // In D1 sammeln wir einfach, bis es groß genug für den Hauptwert ist
    if (dim === 1) {
      this.buckets.set(dim, nextValue);
      // Optional: Automatisch mergen, wenn der Tracer signifikant wird
      return;
    }

    if (nextValue >= this.THRESHOLD) {
      const promotedS = Math.pow(nextValue, dim / (dim + 1));
      this.buckets.set(dim, 0);
      this.onOverflow(promotedS, dim + 1);
    } else if (nextValue <= -this.THRESHOLD) {
      const demotedS = -Math.pow(Math.abs(nextValue), dim / (dim + 1));
      this.buckets.set(dim, 0);
      this.onOverflow(demotedS, dim + 1);
    } else {
      this.buckets.set(dim, nextValue);
    }
  }

  // Innerhalb der TracerSystem Klasse
  isEmpty(): boolean {
    if (this.buckets.size === 0) return true;

    // Sichergehen, dass nicht nur "leere" Einträge (0) drinstehen
    for (let val of this.buckets.values()) {
      if (val !== 0) return false;
    }
    return true;
  }

  getBuckets() {
    return new Map(this.buckets);
  }

  clear(): void {
    this.buckets.clear();
  }
}

/**
 * Dimensional Number (DNum)
 * Repräsentiert einen Wert als Volumen eines n-dimensionalen Hyperwürfels: V = s^d
 */
export class DNum {
  public s: number; // Seitenlänge
  public d: number; // Dimension
  private tracers: TracerSystem;

  private readonly MIN_S = 1.1;
  private readonly MAX_S = 100;

  constructor(s: number, d: number = 1) {
    this.s = s;
    this.d = d;
    this.tracers = new TracerSystem((val, dim) => this.internalAdd(val, dim));
    this.normalize();
  }

  /** Berechnet den totalen Logarithmus sicher (immer vom Absolutwert) */
  public get totalLog(): number {
    return this.d * Math.log10(Math.abs(this.s) || 1e-15);
  }

  /** Hält s im lesbaren Bereich [1.1, 100] */
  /** Hält d als Ganzzahl und lässt s zwischen einem Startwert und 100 wandern */
  private normalize(): void {
    const absS = Math.abs(this.s);
    if (absS === 0) { this.s = 0; this.d = 1; return; }

    const sign = this.s >= 0 ? 1 : -1;
    let logV = this.d * Math.log10(absS);

    // NEU: In Dimension 1 bleiben wir so lange wie möglich (bis 1e15)
    // Erst darüber hinaus springen wir in das 1.1 - 100 Fenster
    if (this.d === 1 && absS < 1e15 && absS > 1e-10) {
      return; // Alles okay, bleib linear!
    }

    // Wenn wir in hohen Dimensionen sind oder das Limit sprengen:
    while (Math.abs(this.s) >= (this.d === 1 ? 1e15 : 100)) {
      this.d += 1;
      this.s = sign * Math.pow(10, logV / this.d);
    }

    while (Math.abs(this.s) < 1.1 && this.d > 1) {
      this.d -= 1;
      this.s = sign * Math.pow(10, logV / this.d);
    }
  }

  /**
   * Die Kern-Logik: Erkennt, ob ein Wert direkt addiert werden kann 
   * oder in die Tracer-Verschrottung muss.
   */
  /** Die ultimative Additions-Logik mit Fast-Path für Banken-Präzision */
  private internalAdd(amountS: number, amountD: number): void {
    if (amountS === 0) return;

    // --- LINEARER BEREICH (D1) ---
    if (this.d === 1 && amountD === 1) {
      const currentLog = Math.log10(Math.abs(this.s) || 1e-20);
      const incomingLog = Math.log10(Math.abs(amountS) || 1e-20);

      // Wenn der Unterschied > 15 Dekaden ist (Präzisionsverlust droht)
      if (currentLog - incomingLog > 15) {
        // Wir speichern es einfach LINEAR im Tracer-Bucket 1
        this.tracers.deposit(amountS, 1);
        return;
      }

      this.s += amountS;
      if (Math.abs(this.s) > 1e15) this.normalize();
      return;
    }

    // --- DER "UNIVERSELLE" FAST-PATH ---
    // Wir behandeln ALLES, was linear darstellbar ist, in Dimension 1.
    // Auch Nanometer (1e-9) sind in D1 sicher, solange sie im Tracer liegen.
    if (this.d === 1 && amountD === 1) {
      const logV1 = Math.log10(Math.abs(this.s) || 1e-20);
      const logV2 = Math.log10(Math.abs(amountS) || 1e-20);

      // Wenn der Unterschied zwischen Hauptwert (300 Mrd) und 
      // Korrektur (0.000000001) größer als 15 Dekaden ist:
      if (logV1 - logV2 > 15) {
        this.tracers.deposit(amountS, 1); // Ab in den Tracer-Speicher
        return;
      }

      // Normal addieren, wenn sie nah beieinander liegen
      this.s += amountS;
      if (Math.abs(this.s) > 1e15) this.normalize();
      return;
    }

    // --- DIMENSIONALER PFAD (Der "Galaxie-Modus") ---
    const signA = this.s >= 0 ? 1 : -1;
    const signB = amountS >= 0 ? 1 : -1;

    const logV1 = this.totalLog;
    const logV2 = amountD * Math.log10(Math.abs(amountS) || 1e-15);

    // Wenn der Unterschied zu gewaltig ist, ab in den Tracer
    if (logV1 - logV2 > 15) {
      this.tracers.deposit(amountS, amountD);
      return;
    }

    const maxLog = Math.max(logV1, logV2);

    // Berechnung im linearen Raum relativ zum Maximum
    let resLinear = (signA * Math.pow(10, logV1 - maxLog)) +
      (signB * Math.pow(10, logV2 - maxLog));

    const resultSign = resLinear >= 0 ? 1 : -1;
    resLinear = Math.abs(resLinear);

    if (resLinear < 1e-18) {
      this.s = 0; this.d = 1; return;
    }

    const newLog = maxLog + Math.log10(resLinear);
    this.s = resultSign * Math.pow(10, newLog / this.d);
    this.normalize();
  }

  // --- Arithmetik ---

  add(other: DNum): DNum {
    // 1. Hauptwert addieren
    this.internalAdd(other.s, other.d);
    // 2. Alle Buckets des anderen Objekts übernehmen
    other.tracers.getBuckets().forEach((val, dim) => {
      this.internalAdd(val, dim);
    });
    return this;
  }

  /**
   * Multiplikation skaliert auch die Mikro-Werte (Buckets)
   */
  mul(other: DNum): DNum {
    const factorLog = other.totalLog;

    // Buckets skalieren: Ein Bucket in Dim 1 wird durch Mul mit DNum(100, 1) 
    // zu einem deutlich größeren Wert.
    const currentBuckets = this.tracers.getBuckets();
    this.tracers.clear();
    currentBuckets.forEach((val, dim) => {
      const bucketLog = dim * Math.log10(Math.abs(val));
      const newLog = bucketLog + factorLog;
      // Wir "re-deponieren" den skalierten Bucket
      const newS = Math.pow(10, newLog / dim);
      this.internalAdd(newS, dim);
    });

    const newLog = this.totalLog + factorLog;
    this.s = Math.pow(10, newLog / this.d);
    this.normalize();
    return this;
  }

  /**
   * Subtrahiert einen anderen DNum.
   * Berücksichtigt sowohl den Hauptwert als auch alle Tracer-Buckets des Gegners.
   */
  sub(other: DNum): DNum {
    // 1. Den Hauptwert von 'other' mit umgekehrtem Vorzeichen addieren
    this.internalAdd(-other.s, other.d);

    // 2. Die Buckets von 'other' ebenfalls mit umgekehrtem Vorzeichen übernehmen
    other.tracers.getBuckets().forEach((val, dim) => {
      this.internalAdd(-val, dim);
    });

    return this;
  }
  /**
    * Berechnet die Quadratwurzel (sqrt).
   */
  sqrt(): DNum {
    if (this.s < 0) throw new Error("DNum: Square root of negative number is not supported.");
    if (this.s === 0) return new DNum(0, 1);

    // Der Fast-Path für einfaches Geld/kleine Distanzen
    if (this.d === 1 && this.s < 1e15) {
      return DNum.fromAny(Math.sqrt(this.s));
    }

    // Die Log-Logik: log(sqrt(x)) = 0.5 * log(x)
    const newLog = 0.5 * this.totalLog;
    return DNum.fromLog(newLog);
  }

  /**
   * Erhebt den DNum in die Potenz n.
   */
  pow(n: number): DNum {
    if (this.s === 0) return new DNum(0, 1);
    if (n === 0) return DNum.fromAny(1);
    if (n === 1) return DNum.deserialize(this.serialize());

    // Die Log-Logik: log(x^n) = n * log(x)
    const newLog = n * this.totalLog;

    // Vorzeichen-Logik (bei geraden Potenzen wird alles positiv)
    const resultSign = (this.s < 0 && n % 2 !== 0) ? -1 : 1;

    const res = DNum.fromLog(newLog);
    res.s *= resultSign;
    return res;
  }

  /**
   * Berechnet den absoluten Abstand zwischen zwei DNums als DNum.
   * (Entspricht mathematisch |a - b|)
   */
  static getDistance(a: DNum, b: DNum): DNum {
    const logA = a.totalLog;
    const logB = b.totalLog;

    // Wenn beide identisch sind oder der Unterschied unendlich klein
    if (Math.abs(logA - logB) < 1e-15) return new DNum(0, 1);

    const maxLog = Math.max(logA, logB);
    const minLog = Math.min(logA, logB);

    // Wenn der Abstand so groß ist, dass die kleinere Zahl keine Rolle spielt
    if (maxLog - minLog > 15) return DNum.fromLog(maxLog);

    // Präzise Differenz im Log-Raum
    const diffLinear = 1 - Math.pow(10, minLog - maxLog);
    const resLog = maxLog + Math.log10(diffLinear);

    return DNum.fromLog(resLog);
  }

  /** Erzeugt ein DNum direkt aus einem totalLog-Wert */
  static fromLog(logV: number): DNum {
    if (logV <= -15) return new DNum(0, 1);
    // Wir wählen eine passende Dimension für die Darstellung
    const targetD = Math.max(1, Math.ceil(logV / 2));
    const s = Math.pow(10, logV / targetD);
    return new DNum(s, targetD);
  }

  div(other: DNum): DNum {
    const divisorLog = other.totalLog;
    const currentBuckets = this.tracers.getBuckets();
    this.tracers.clear();
    currentBuckets.forEach((val, dim) => {
      const bucketLog = dim * Math.log10(Math.abs(val));
      const newLog = Math.max(0, bucketLog - divisorLog);
      const newS = Math.pow(10, newLog / dim);
      this.internalAdd(newS, dim);
    });

    const newLog = Math.max(0, this.totalLog - divisorLog);
    this.s = Math.pow(10, newLog / this.d);
    this.normalize();
    return this;
  }

  /**
   * Prüft, ob die Zahl absolut Null ist.
   * Berücksichtigt den Hauptwert UND alle versteckten Tracer-Buckets.
   */
  isZero(): boolean {
    // 1. Der Hauptwert muss 0 sein
    if (this.s !== 0) return false;

    // 2. Die Tracer müssen leer sein
    return this.tracers.isEmpty();
  }

  /**
   * Erweiterte toString Methode mit variabler Präzision.
   */
  toString(precision: number = 2): string {
    const isNegative = this.s < 0;
    const absS = Math.abs(this.s);

    if (absS === 0) return "₀0" + "⁰".repeat(precision);

    const subs = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
    const sups = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

    const dStr = Math.floor(this.d).toString().split('').map(c => subs[parseInt(c)] || c).join('');
    const sMain = Math.floor(absS);

    const fracPart = (absS % 1).toFixed(precision).substring(2);
    const sFrac = fracPart.split('').map(c => sups[parseInt(c)] || c).join('');

    return `${isNegative ? '-' : ''}${dStr}${sMain}${sFrac}`;
  }

  /**
   * Erstellt einen Bericht über die Stabilität im Vergleich zu einem Referenzwert.
   */
  getStabilityReport(reference: DNum): string {
    const drift = DNum.getDistance(this, reference);

    // Der "Sicherheitsabstand" in Dekaden (Größenordnungen)
    // Je höher dieser Wert, desto weniger spürbar ist der Fehler.
    const gap = this.totalLog - drift.totalLog;

    let quality = "UNSICHER";
    if (gap > 15) quality = "PERFEKT (FP-Limit)";
    else if (gap > 12) quality = "EXZELLENT";
    else if (gap > 8) quality = "STABIL";
    else if (gap > 0) quality = "DRIVING";

    return `Wert: ${this.toString()} | Drift: ${drift.toString()} | Gap: ${gap.toFixed(2)} (${quality})`;
  }

  /**
 * Zwingt alle Tracer-Inhalte in den Hauptwert, 
 * auch wenn der Präzisions-Abstand eigentlich zu groß ist.
 */
  collapse(): void {
    const buckets = this.tracers.getBuckets();
    const sortedDims = Array.from(buckets.keys()).sort((a, b) => a - b);

    for (const dim of sortedDims) {
      const val = buckets.get(dim);
      if (val && val !== 0) {
        // Wir umgehen hier die internalAdd Logik, 
        // um den Loop zu verhindern
        if (this.d === 1 && dim === 1) {
          this.s += val;
        } else {
          // Für andere Dimensionen nutzen wir die normale Logik
          this.internalAdd(val, dim);
        }
        buckets.delete(dim);
      }
    }
    this.normalize();
  }

  static fromStyledString(styled: string): DNum {
    const subMap: any = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
    const supMap: any = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };

    let dimStr = "";
    let mainStr = "";
    let fracStr = "";
    let mode = 'dim'; // dim, main, frac

    for (const char of styled) {
      if (subMap[char] !== undefined) {
        dimStr += subMap[char];
      } else if (supMap[char] !== undefined) {
        fracStr += supMap[char];
      } else {
        mainStr += char;
      }
    }

    const d = parseInt(dimStr) || 1;
    const s = parseFloat(mainStr + "." + fracStr) || 0;
    return new DNum(s, d);
  }

  /**
   * Versucht die Zahl in die derzeitige Dimension zu rechnen, auch wenn das Präzisionsverlust bedeutet.
   * @param amountS 
   * @param amountD 
   * @returns 
   */
  private forceAdd(amountS: number, amountD: number): void {
    if (amountS === 0) return;
    const logV1 = this.totalLog;
    const logV2 = amountD * Math.log10(Math.abs(amountS));
    const maxLog = Math.max(logV1, logV2);
    const sign = amountS >= 0 ? 1 : -1;
    const resLinear = Math.pow(10, logV1 - maxLog) + sign * Math.pow(10, logV2 - maxLog);
    if (resLinear <= 0) { this.s = 0; this.d = 1; return; }
    const newLog = maxLog + Math.log10(resLinear);
    this.s = Math.pow(10, newLog / this.d);
    this.normalize();
  }

  /**
   * Gibt die Zahl in klassischer wissenschaftlicher Notation zurück.
   * Beispiel: "2.77e+25"
   */
  toScientific(): string {
    const logV = this.totalLog;
    if (logV < -10) return "0.00e+0";

    const exponent = Math.floor(logV);
    const mantissa = Math.pow(10, logV - exponent);

    return `${mantissa.toFixed(4)}e+${exponent}`;
  }

  /**
 * Erzeugt einen String mit maximaler Präzision, indem Hauptwert und 
 * Tracer-Buckets getrennt verarbeitet werden. Verhindert 64-Bit Rundungsfehler.
 */
  toPreciseString(decimalPlaces: number = 10): string {
    if (this.d !== 1) return this.toFullString(decimalPlaces);

    const absS = Math.abs(this.s);
    // 1. Ganzzahl-Teil sicher als BigInt extrahieren
    let integerPart = BigInt(Math.floor(absS));

    // 2. Alle fraktionalen Reste sammeln
    // Wir nehmen den Rest von s UND alle Werte aus dem Tracer
    let fractionalAccumulator = absS % 1;

    const buckets = this.tracers.getBuckets();
    for (const val of buckets.values()) {
      fractionalAccumulator += val;
    }

    // 3. Überlauf vom Akkumulator in die Ganzzahl prüfen (falls Tracer > 1)
    const carry = Math.floor(fractionalAccumulator);
    integerPart += BigInt(carry);
    const finalFraction = Math.abs(fractionalAccumulator - carry);

    // 4. String-Zusammenbau ohne wissenschaftliche Notation
    const sign = this.s < 0 ? "-" : "";
    const fractionStr = finalFraction.toFixed(decimalPlaces).split(".")[1];

    return `${sign}${integerPart.toString()}.${fractionStr}`;
  }

  /**
   * Versucht die Zahl als volle Ganzzahl auszuschreiben.
   * ACHTUNG: Bei sehr hohen Dimensionen wird der String gigantisch!
   */
  /**
   * Gibt die Zahl als vollen String aus. 
   * Beachtet Nachkommastellen im D1 Bereich.
   */
  toFullString(precision: number = 10): string {
    if (this.d === 1) {
      // Im D1 Bereich nutzen wir die native Präzision
      return this.s.toFixed(precision);
    }

    const logV = this.totalLog;
    if (logV < 0) return "0." + "0".repeat(precision);
    if (logV > 100) return this.toScientific(); // Schutz vor String-Explosion

    // Für Werte > D1, aber noch darstellbar
    const val = (this.s >= 0 ? 1 : -1) * Math.pow(10, logV);
    return val.toFixed(precision);
  }

  /**
   * Analysiert den theoretischen Informationsverlust durch die FP-Limitierung.
   */
  getLossAnalysis(): string {
    const logV = this.totalLog;
    const totalDigits = Math.floor(logV) + 1;
    const precisionDigits = 15; // Standard für IEEE 754 Double

    if (totalDigits <= precisionDigits) {
      return `Präzision: 100%. Die Zahl passt voll in den 64-Bit Speicher.`;
    }

    const lostDigits = totalDigits - precisionDigits;
    return `Verlust-Analyse: Von ${totalDigits} Stellen sind ${precisionDigits} sicher. ` +
      `Die hinteren ${lostDigits} Stellen sind "verschwommen" (Nullen/Rundungsrauschen).`;
  }

  getDetailedLossAnalysis(): string {
    const logMain = this.totalLog;
    const mainDigits = Math.floor(logMain) + 1;

    let report = `--- PRÄZISIONS-AUDIT ---\n`;
    report += `Hauptwert: ${this.toString()} (${mainDigits} Stellen)\n`;

    const buckets = this.tracers.getBuckets();
    if (buckets.size === 0) {
      report += `Tracer: Keine aktiven Mikro-Informationen.\n`;
    } else {
      report += `Tracer-Status:\n`;
      buckets.forEach((val, dim) => {
        if (val !== 0) {
          const logBucket = dim * Math.log10(Math.abs(val));
          const abstand = logMain - logBucket;

          report += `  - Dim ${dim}: Wert ${val.toFixed(2)} `;
          if (abstand > 15) {
            report += `[SICHER] (Abstand ${abstand.toFixed(1)} Dekaden - Hauptwert "sieht" dies nicht)\n`;
          } else {
            report += `[RELEVANT] (Wird bald den Hauptwert beeinflussen)\n`;
          }
        }
      });
    }

    const precisionLimit = 15;
    if (mainDigits > precisionLimit) {
      const lost = mainDigits - precisionLimit;
      report += `\nFAZIT: Der Hauptwert hat ${lost} Stellen "Rundungsrauschen" am Ende.\n`;
      report += `ABER: Die Tracer speichern Mikro-Änderungen verlustfrei ab.`;
    } else {
      report += `\nFAZIT: Das System arbeitet aktuell absolut verlustfrei.`;
    }

    return report;
  }

  /**
   * Erstellt ein DNum aus einer beliebigen Zahl oder einem E-Notation String.
   * Beispiel: DNum.fromAny("2.77e+25") oder DNum.fromAny(22000)
   */
  /** Erstellt ein DNum sicher aus jeder Zahl (auch negativ!) */
  static fromAny(input: string | number): DNum {
    let val: number;
    if (typeof input === "string") {
      val = parseFloat(input);
    } else {
      val = input;
    }

    if (val === 0) return new DNum(0, 1);

    const sign = val >= 0 ? 1 : -1;
    const absVal = Math.abs(val);
    const logV = Math.log10(absVal);

    // Wir bleiben in Dimension 1, solange wir unter 1 Billiarde sind
    if (absVal < 1e15) {
      return new DNum(val, 1);
    }

    let targetDim = Math.max(1, Math.ceil(logV / 2));
    let s = Math.pow(10, logV / targetDim);
    return new DNum(sign * s, targetDim);
  }

  /**
   * EXPORT: Erstellt ein flaches JSON-Objekt inklusive aller Buckets.
   */
  serialize(): string {
    return JSON.stringify({
      s: this.s,
      d: this.d,
      buckets: Array.from(this.tracers.getBuckets().entries())
    });
  }

  /**
   * IMPORT: Rekonstruiert ein DNum-Objekt inklusive Tracer-Status.
   */
  static deserialize(json: string): DNum {
    const data = JSON.parse(json);
    const instance = new DNum(data.s, data.d);
    if (data.buckets) {
      data.buckets.forEach(([dim, val]: [number, number]) => {
        instance.tracers.deposit(val, dim);
      });
    }
    return instance;
  }
}

class DNumFormatter {
    // Suffixe für den benannten Bereich
    private static namedSuffixes = ["", "k", "Mio", "Mrd", "Bio", "Brd", "Trill", "Trard"];
    
    // Alphabetische Suffixe für den Bereich danach (aa, ab, ac...)
    private static getLetterSuffix(logV: number): string {
        const index = Math.floor((logV - 24) / 3);
        if (index < 0) return "";
        
        const firstLetter = String.fromCharCode(97 + Math.floor(index / 26));
        const secondLetter = String.fromCharCode(97 + (index % 26));
        return firstLetter + secondLetter;
    }

    public static format(num: DNum, precision: number = 2): string {
        const logV = num.totalLog;

        // 1. Götter-Modus (Dimensionen)
        // Wenn die Zahl so groß ist, dass Suffixe keinen Sinn mehr ergeben
        if (num.d > 10 || logV > 3000) {
            return `${num.s.toFixed(precision)} [D${num.d}]`;
        }

        // 2. Alphabetischer Modus (aa, ab, ac...)
        if (logV >= 24) {
            const displayS = Math.pow(10, logV % 3);
            return `${displayS.toFixed(precision)} ${this.getLetterSuffix(logV)}`;
        }

        // 3. Benannter Modus
        if (logV >= 3) {
            const suffixIndex = Math.floor(logV / 3);
            const displayS = Math.pow(10, logV % 3);
            const suffix = this.namedSuffixes[suffixIndex] || "e" + logV;
            return `${displayS.toFixed(precision)} ${suffix}`;
        }

        // 4. Menschlicher Modus (mit Tracer-Präzision!)
        return num.toPreciseString(precision);
    }
}