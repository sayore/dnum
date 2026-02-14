/**
 * Manages micro-amounts in different dimensions to prevent precision loss 
 * when dealing with large differences in scale.
 */
class TracerSystem {
  private buckets: Map<number, number> = new Map();
  private readonly THRESHOLD = 100;

  /**
   * @param onOverflow Callback triggered when a bucket exceeds the threshold and should be promoted to the next dimension.
   */
  constructor(private onOverflow: (value: number, dim: number) => void) { }

  /**
   * Deposits a value into a specific dimension bucket.
   * @param value The amount to deposit.
   * @param dim The dimension of the amount.
   */
  deposit(value: number, dim: number): void {
    if (value === 0) return;
    const current = this.buckets.get(dim) || 0;
    const nextValue = current + value;

    // In D1, we simply accumulate until it's large enough for the main value.
    if (dim === 1) {
      this.buckets.set(dim, nextValue);
      // Optional: Automatically merge if the tracer becomes significant.
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

  /**
   * Checks if all buckets are empty (or contain only 0).
   */
  isEmpty(): boolean {
    if (this.buckets.size === 0) return true;

    for (let val of this.buckets.values()) {
      if (val !== 0) return false;
    }
    return true;
  }

  /**
   * Returns a copy of the current buckets.
   */
  getBuckets() {
    return new Map(this.buckets);
  }

  /**
   * Clears all tracer buckets.
   */
  clear(): void {
    this.buckets.clear();
  }
}

/**
 * Dimensional Number (DNum)
 * Represents a value as the volume of an n-dimensional hypercube: V = s^d
 * This allows for representing extremely large numbers while maintaining precision 
 * for tiny changes via a "Tracer" system.
 */
export class DNum {
  public s: number; // Side length (mantissa-like)
  public d: number; // Dimension (exponent-like)
  private tracers: TracerSystem;

  private readonly MIN_S = 1.1;
  private readonly MAX_S = 100;

  /**
   * @param s The side length of the hypercube.
   * @param d The dimension of the hypercube. Defaults to 1 (linear).
   */
  constructor(s: number, d: number = 1) {
    this.s = s;
    this.d = d;
    this.tracers = new TracerSystem((val, dim) => this.internalAdd(val, dim));
    this.normalize();
  }

  /** 
   * Safely calculates the total base-10 logarithm of the value.
   * Uses the absolute value to handle negative numbers.
   */
  public get totalLog(): number {
    return this.d * Math.log10(Math.abs(this.s) || 1e-15);
  }

  /** 
   * Normalizes the number to keep 's' within a readable range [1.1, 100] 
   * while keeping 'd' as an integer.
   */
  private normalize(): void {
    const absS = Math.abs(this.s);
    if (absS === 0) { this.s = 0; this.d = 1; return; }

    const sign = this.s >= 0 ? 1 : -1;
    let logV = this.d * Math.log10(absS);

    // In Dimension 1, we stay as long as possible (up to 1e15)
    // beyond that, we jump into the 1.1 - 100 window of higher dimensions.
    if (this.d === 1 && absS < 1e15 && absS > 1e-10) {
      return; // All good, stay linear!
    }

    // If we are in high dimensions or exceed the limit:
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
   * Core addition logic. Determines if a value can be added directly 
   * or if it needs to be stored in the Tracer system to avoid precision loss.
   */
  private internalAdd(amountS: number, amountD: number): void {
    if (amountS === 0) return;

    // --- LINEAR RANGE (D1) ---
    if (this.d === 1 && amountD === 1) {
      const currentLog = Math.log10(Math.abs(this.s) || 1e-20);
      const incomingLog = Math.log10(Math.abs(amountS) || 1e-20);

      // If the difference is > 15 decades (precision loss imminent)
      if (currentLog - incomingLog > 15) {
        // We store it LINEARLY in Tracer-Bucket 1
        this.tracers.deposit(amountS, 1);
        return;
      }

      this.s += amountS;
      if (Math.abs(this.s) > 1e15) this.normalize();
      return;
    }

    // --- UNIVERSAL FAST-PATH ---
    // Handle everything that can be represented linearly in D1.
    if (this.d === 1 && amountD === 1) {
      const logV1 = Math.log10(Math.abs(this.s) || 1e-20);
      const logV2 = Math.log10(Math.abs(amountS) || 1e-20);

      // If the gap between main value and correction is > 15 decades:
      if (logV1 - logV2 > 15) {
        this.tracers.deposit(amountS, 1); // Store in Tracer
        return;
      }

      this.s += amountS;
      if (Math.abs(this.s) > 1e15) this.normalize();
      return;
    }

    // --- DIMENSIONAL PATH ("Galaxy Mode") ---
    const signA = this.s >= 0 ? 1 : -1;
    const signB = amountS >= 0 ? 1 : -1;

    const logV1 = this.totalLog;
    const logV2 = amountD * Math.log10(Math.abs(amountS) || 1e-15);

    // If the difference is too massive, move to Tracer
    if (logV1 - logV2 > 15) {
      this.tracers.deposit(amountS, amountD);
      return;
    }

    const maxLog = Math.max(logV1, logV2);

    // Calculation in linear space relative to the maximum
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

  // --- Arithmetic ---

  /**
   * Adds another DNum to this instance.
   * @returns This instance (for chaining).
   */
  add(other: DNum): DNum {
    // 1. Add the main value
    this.internalAdd(other.s, other.d);
    // 2. Transfer all buckets from the other object
    other.tracers.getBuckets().forEach((val, dim) => {
      this.internalAdd(val, dim);
    });
    return this;
  }

  /**
   * Multiplies this instance by another DNum.
   * Also scales micro-values (Tracer buckets).
   * @returns This instance (for chaining).
   */
  mul(other: DNum): DNum {
    const factorLog = other.totalLog;

    const currentBuckets = this.tracers.getBuckets();
    this.tracers.clear();
    currentBuckets.forEach((val, dim) => {
      const bucketLog = dim * Math.log10(Math.abs(val));
      const newLog = bucketLog + factorLog;
      // Re-deposit the scaled bucket
      const newS = Math.pow(10, newLog / dim);
      this.internalAdd(newS, dim);
    });

    const newLog = this.totalLog + factorLog;
    this.s = Math.pow(10, newLog / this.d);
    this.normalize();
    return this;
  }

  /**
   * Subtracts another DNum from this instance.
   * Accounts for both the main value and all Tracer buckets of the subtrahend.
   * @returns This instance (for chaining).
   */
  sub(other: DNum): DNum {
    // 1. Add the main value with reversed sign
    this.internalAdd(-other.s, other.d);

    // 2. Transfer buckets with reversed sign
    other.tracers.getBuckets().forEach((val, dim) => {
      this.internalAdd(-val, dim);
    });

    return this;
  }

  /**
   * Calculates the square root of the value.
   */
  sqrt(): DNum {
    if (this.s < 0) throw new Error("DNum: Square root of negative number is not supported.");
    if (this.s === 0) return new DNum(0, 1);

    // Fast-path for simple linear values
    if (this.d === 1 && this.s < 1e15) {
      return DNum.fromAny(Math.sqrt(this.s));
    }

    // Log logic: log(sqrt(x)) = 0.5 * log(x)
    const newLog = 0.5 * this.totalLog;
    return DNum.fromLog(newLog);
  }

  /**
   * Raises this instance to the power of 'n'.
   */
  pow(n: number): DNum {
    if (this.s === 0) return new DNum(0, 1);
    if (n === 0) return DNum.fromAny(1);
    if (n === 1) return DNum.deserialize(this.serialize());

    // Log logic: log(x^n) = n * log(x)
    const newLog = n * this.totalLog;

    // Sign logic: even powers result in positive values
    const resultSign = (this.s < 0 && n % 2 !== 0) ? -1 : 1;

    const res = DNum.fromLog(newLog);
    res.s *= resultSign;
    return res;
  }

  /**
   * Calculates the absolute distance between two DNums as a new DNum.
   * Mathematically equivalent to |a - b|.
   */
  static getDistance(a: DNum, b: DNum): DNum {
    const logA = a.totalLog;
    const logB = b.totalLog;

    // If identical or the difference is infinitely small
    if (Math.abs(logA - logB) < 1e-15) return new DNum(0, 1);

    const maxLog = Math.max(logA, logB);
    const minLog = Math.min(logA, logB);

    // If the gap is so large that the smaller number is irrelevant
    if (maxLog - minLog > 15) return DNum.fromLog(maxLog);

    // Precise difference in log-space
    const diffLinear = 1 - Math.pow(10, minLog - maxLog);
    const resLog = maxLog + Math.log10(diffLinear);

    return DNum.fromLog(resLog);
  }

  /** 
   * Factory method: Creates a DNum directly from a totalLog value.
   */
  static fromLog(logV: number): DNum {
    if (logV <= -15) return new DNum(0, 1);
    // Choose an appropriate dimension for representation
    const targetD = Math.max(1, Math.ceil(logV / 2));
    const s = Math.pow(10, logV / targetD);
    return new DNum(s, targetD);
  }

  /**
   * Divides this instance by another DNum.
   * @returns This instance (for chaining).
   */
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
   * Checks if the number is absolutely zero.
   * Accounts for both the main value AND all hidden Tracer buckets.
   */
  isZero(): boolean {
    if (this.s !== 0) return false;
    return this.tracers.isEmpty();
  }

  /**
   * Enhanced toString method with variable precision.
   * Uses subscript for dimension and superscript for decimal fraction.
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
   * Generates a stability report compared to a reference value.
   * Useful for auditing precision and drift.
   */
  getStabilityReport(reference: DNum): string {
    const drift = DNum.getDistance(this, reference);

    // The "safety margin" in decades (orders of magnitude).
    // The higher the value, the less noticeable the error.
    const gap = this.totalLog - drift.totalLog;

    let quality = "UNSAFE";
    if (gap > 15) quality = "PERFECT (FP-Limit)";
    else if (gap > 12) quality = "EXCELLENT";
    else if (gap > 8) quality = "STABLE";
    else if (gap > 0) quality = "DRIFTING";

    return `Value: ${this.toString()} | Drift: ${drift.toString()} | Gap: ${gap.toFixed(2)} (${quality})`;
  }

  /**
   * Forces all Tracer contents into the main value, 
   * even if the precision gap is normally too large.
   */
  collapse(): void {
    const buckets = this.tracers.getBuckets();
    const sortedDims = Array.from(buckets.keys()).sort((a, b) => a - b);

    for (const dim of sortedDims) {
      const val = buckets.get(dim);
      if (val && val !== 0) {
        // Bypass internalAdd logic to prevent recursive loops
        if (this.d === 1 && dim === 1) {
          this.s += val;
        } else {
          // Use normal logic for other dimensions
          this.internalAdd(val, dim);
        }
        buckets.delete(dim);
      }
    }
    this.normalize();
  }

  /**
   * Parses a DNum from its styled string representation (using sub/superscripts).
   */
  static fromStyledString(styled: string): DNum {
    const subMap: any = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
    const supMap: any = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };

    let dimStr = "";
    let mainStr = "";
    let fracStr = "";

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
   * Attempts to add a value into the current dimension even if it causes precision loss.
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
   * Returns the value in classic scientific notation.
   * Example: "2.77e+25"
   */
  toScientific(): string {
    const logV = this.totalLog;
    if (logV < -10) return "0.00e+0";

    const exponent = Math.floor(logV);
    const mantissa = Math.pow(10, logV - exponent);

    return `${mantissa.toFixed(4)}e+${exponent}`;
  }

  /**
   * Generates a string with maximum precision by processing main value 
   * and Tracer buckets separately. Prevents 64-bit rounding errors.
   */
  toPreciseString(decimalPlaces: number = 10): string {
    if (this.d !== 1) return this.toFullString(decimalPlaces);

    const absS = Math.abs(this.s);
    // 1. Extract integer part safely as BigInt
    let integerPart = BigInt(Math.floor(absS));

    // 2. Accumulate all fractional remainders
    let fractionalAccumulator = absS % 1;

    const buckets = this.tracers.getBuckets();
    for (const val of buckets.values()) {
      fractionalAccumulator += val;
    }

    // 3. Check for overflow from accumulator into integer part
    const carry = Math.floor(fractionalAccumulator);
    integerPart += BigInt(carry);
    const finalFraction = Math.abs(fractionalAccumulator - carry);

    // 4. Assemble string without scientific notation
    const sign = this.s < 0 ? "-" : "";
    const fractionStr = finalFraction.toFixed(decimalPlaces).split(".")[1];

    return `${sign}${integerPart.toString()}.${fractionStr}`;
  }

  /**
   * Returns the value as a full string. 
   * Respects decimal places in the D1 range.
   * Caution: String can become massive for very high dimensions!
   */
  toFullString(precision: number = 10): string {
    if (this.d === 1) {
      return this.s.toFixed(precision);
    }

    const logV = this.totalLog;
    if (logV < 0) return "0." + "0".repeat(precision);
    if (logV > 100) return this.toScientific(); // Protection against string explosion

    const val = (this.s >= 0 ? 1 : -1) * Math.pow(10, logV);
    return val.toFixed(precision);
  }

  /**
   * Analyzes theoretical information loss due to FP limitation.
   */
  getLossAnalysis(): string {
    const logV = this.totalLog;
    const totalDigits = Math.floor(logV) + 1;
    const precisionDigits = 15; // Standard for IEEE 754 Double

    if (totalDigits <= precisionDigits) {
      return `Precision: 100%. The value fits fully within 64-bit memory.`;
    }

    const lostDigits = totalDigits - precisionDigits;
    return `Loss Analysis: Out of ${totalDigits} digits, ${precisionDigits} are safe. ` +
      `The remaining ${lostDigits} digits are "blurry" (zeros/rounding noise).`;
  }

  /**
   * Detailed audit of precision and Tracer status.
   */
  getDetailedLossAnalysis(): string {
    const logMain = this.totalLog;
    const mainDigits = Math.floor(logMain) + 1;

    let report = `--- PRECISION AUDIT ---\n`;
    report += `Main Value: ${this.toString()} (${mainDigits} digits)\n`;

    const buckets = this.tracers.getBuckets();
    if (buckets.size === 0) {
      report += `Tracer: No active micro-information.\n`;
    } else {
      report += `Tracer Status:\n`;
      buckets.forEach((val, dim) => {
        if (val !== 0) {
          const logBucket = dim * Math.log10(Math.abs(val));
          const distance = logMain - logBucket;

          report += `  - Dim ${dim}: Value ${val.toFixed(2)} `;
          if (distance > 15) {
            report += `[SAFE] (Distance ${distance.toFixed(1)} decades - main value does not "see" this)\n`;
          } else {
            report += `[RELEVANT] (Will soon affect the main value)\n`;
          }
        }
      });
    }

    const precisionLimit = 15;
    if (mainDigits > precisionLimit) {
      const lost = mainDigits - precisionLimit;
      report += `\nCONCLUSION: The main value has ${lost} digits of "rounding noise" at the end.\n`;
      report += `BUT: The Tracers store micro-changes losslessly.`;
    } else {
      report += `\nCONCLUSION: The system is currently working absolutely losslessly.`;
    }

    return report;
  }

  /**
   * Safely creates a DNum from any number or E-notation string.
   */
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

    // Stay in Dimension 1 as long as we are under 1 quadrillion
    if (absVal < 1e15) {
      return new DNum(val, 1);
    }

    let targetDim = Math.max(1, Math.ceil(logV / 2));
    let s = Math.pow(10, logV / targetDim);
    return new DNum(sign * s, targetDim);
  }

  /**
   * Serializes the DNum instance into a JSON string, including Tracer status.
   */
  serialize(): string {
    return JSON.stringify({
      s: this.s,
      d: this.d,
      buckets: Array.from(this.tracers.getBuckets().entries())
    });
  }

  /**
   * Reconstructs a DNum instance from a serialized JSON string.
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

/**
 * Utility for formatting DNums with human-readable suffixes.
 */
class DNumFormatter {
    // Suffixes for the named range
    private static namedSuffixes = ["", "k", "Mio", "Mrd", "Bio", "Brd", "Trill", "Trard"];
    
    /**
     * Generates alphabetical suffixes for values beyond the named range (aa, ab, ac...).
     */
    private static getLetterSuffix(logV: number): string {
        const index = Math.floor((logV - 24) / 3);
        if (index < 0) return "";
        
        const firstLetter = String.fromCharCode(97 + Math.floor(index / 26));
        const secondLetter = String.fromCharCode(97 + (index % 26));
        return firstLetter + secondLetter;
    }

    /**
     * Formats a DNum into a readable string with appropriate suffixes.
     * @param num The DNum to format.
     * @param precision Number of decimal places.
     */
    public static format(num: DNum, precision: number = 2): string {
        const logV = num.totalLog;

        // 1. God Mode (Dimensions)
        // Used when the number is so large that suffixes lose their meaning.
        if (num.d > 10 || logV > 3000) {
            return `${num.s.toFixed(precision)} [D${num.d}]`;
        }

        // 2. Alphabetical Mode (aa, ab, ac...)
        if (logV >= 24) {
            const displayS = Math.pow(10, logV % 3);
            return `${displayS.toFixed(precision)} ${this.getLetterSuffix(logV)}`;
        }

        // 3. Named Mode
        if (logV >= 3) {
            const suffixIndex = Math.floor(logV / 3);
            const displayS = Math.pow(10, logV % 3);
            const suffix = this.namedSuffixes[suffixIndex] || "e" + logV;
            return `${displayS.toFixed(precision)} ${suffix}`;
        }

        // 4. Human Mode (with Tracer precision!)
        return num.toPreciseString(precision);
    }
}
