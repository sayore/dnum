/**
 * Dimensional Number (DNum)
 * Repräsentiert einen Wert als Volumen eines n-dimensionalen Hyperwürfels: V = s^d
 */
export declare class DNum {
    s: number;
    d: number;
    private tracers;
    private readonly MIN_S;
    private readonly MAX_S;
    constructor(s: number, d?: number);
    /** Berechnet den totalen Logarithmus zur Basis 10 (für O(1) Vergleiche) */
    private get totalLog();
    /** Hält s im lesbaren Bereich [1.1, 100] */
    /** Hält d als Ganzzahl und lässt s zwischen einem Startwert und 100 wandern */
    private normalize;
    /** Interne Addition für Kaskaden und Tracing */
    private internalAdd;
    add(other: DNum): DNum;
    sub(other: DNum): DNum;
    mul(other: DNum): DNum;
    div(other: DNum): DNum;
    toString(): string;
}
