/**
 * Verwaltet Mikro-Beträge in verschiedenen Dimensionen,
 * um Präzisionsverluste bei großen Skalenunterschieden zu verhindern.
 */
class TracerSystem {
    onOverflow;
    buckets = new Map();
    THRESHOLD = 100;
    constructor(onOverflow) {
        this.onOverflow = onOverflow;
    }
    /** Fügt Volumen zu einer spezifischen Dimension hinzu */
    deposit(value, dim) {
        const current = this.buckets.get(dim) || 0;
        const nextValue = current + value;
        if (nextValue >= this.THRESHOLD) {
            // Geometrischer Übertrag: s_next = s_old^(d / d+1)
            const promotedS = Math.pow(nextValue, dim / (dim + 1));
            this.buckets.set(dim, 0);
            this.onOverflow(promotedS, dim + 1);
        }
        else if (nextValue <= -this.THRESHOLD) {
            // Negativer Übertrag für Schulden/Abzüge
            const demotedS = -Math.pow(Math.abs(nextValue), dim / (dim + 1));
            this.buckets.set(dim, 0);
            this.onOverflow(demotedS, dim + 1);
        }
        else {
            this.buckets.set(dim, nextValue);
        }
    }
    getBuckets() {
        return new Map(this.buckets);
    }
}
/**
 * Dimensional Number (DNum)
 * Repräsentiert einen Wert als Volumen eines n-dimensionalen Hyperwürfels: V = s^d
 */
export class DNum {
    s; // Seitenlänge
    d; // Dimension
    tracers;
    MIN_S = 1.1;
    MAX_S = 100;
    constructor(s, d = 1) {
        this.s = s;
        this.d = d;
        this.tracers = new TracerSystem((val, dim) => this.internalAdd(val, dim));
        this.normalize();
    }
    /** Berechnet den totalen Logarithmus zur Basis 10 (für O(1) Vergleiche) */
    get totalLog() {
        return this.d * Math.log10(this.s || 1e-10);
    }
    /** Hält s im lesbaren Bereich [1.1, 100] */
    /** Hält d als Ganzzahl und lässt s zwischen einem Startwert und 100 wandern */
    normalize() {
        if (this.s <= 0) {
            this.s = 0;
            this.d = 1;
            return;
        }
        let logV = this.totalLog;
        // Wenn s die 100 überschreitet: Dimension hoch, s sinkt
        while (this.s >= this.MAX_S) {
            this.d = Math.floor(this.d + 1);
            this.s = Math.pow(10, logV / this.d);
        }
        // Wenn s zu klein wird: Dimension runter, s steigt (für Abzüge)
        while (this.s < this.MIN_S && this.d > 1) {
            this.d = Math.floor(this.d - 1);
            this.s = Math.pow(10, logV / this.d);
        }
    }
    /** Interne Addition für Kaskaden und Tracing */
    internalAdd(amountS, amountD) {
        const logV1 = this.totalLog;
        const logV2 = amountD * Math.log10(Math.abs(amountS));
        // Wenn der Unterschied zu groß ist (> 15 Dekaden), ab in den Tracer
        if (logV1 - logV2 > 15) {
            this.tracers.deposit(amountS, amountD);
            return;
        }
        const maxLog = Math.max(logV1, logV2);
        const sign = amountS >= 0 ? 1 : -1;
        const resLinear = Math.pow(10, logV1 - maxLog) + sign * Math.pow(10, logV2 - maxLog);
        if (resLinear <= 0) {
            this.s = 0;
            this.d = 1;
            return;
        }
        const newLog = maxLog + Math.log10(resLinear);
        this.s = Math.pow(10, newLog / this.d);
        this.normalize();
    }
    // --- Arithmetik ---
    add(other) {
        this.internalAdd(other.s, other.d);
        return this;
    }
    sub(other) {
        this.internalAdd(-other.s, other.d);
        return this;
    }
    mul(other) {
        const newLog = this.totalLog + other.totalLog;
        this.s = Math.pow(10, newLog / this.d);
        this.normalize();
        return this;
    }
    div(other) {
        const newLog = Math.max(0, this.totalLog - other.totalLog);
        this.s = Math.pow(10, newLog / this.d);
        this.normalize();
        return this;
    }
    // --- Utility ---
    toString() {
        if (this.s <= 0)
            return "₀0⁰⁰";
        const subs = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
        const sups = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
        const dStr = Math.floor(this.d).toString().split('').map(c => subs[parseInt(c)]).join('');
        const sMain = Math.floor(this.s);
        const sFrac = Math.floor((this.s % 1) * 100).toString().padStart(2, '0').split('').map(c => sups[parseInt(c)]).join('');
        return `${dStr}${sMain}${sFrac}`;
    }
}
