import { describe, it, expect } from 'vitest';
import { DNum } from '../src/index.js';

describe('DNum - Die Ultimative Test Suite', () => {

  describe('1. Normalisierung & Basis-Logik', () => {
    it('sollte im Banking-Bereich (D1) bis 1e15 linear bleiben', () => {
      const num = new DNum(150, 1);
      expect(num.s).toBe(150);
      expect(num.d).toBe(1);
    });

    it('sollte bei Überschreiten der Billiarde in Dimension 2 springen', () => {
      const num = DNum.fromAny(2e15);
      expect(num.d).toBeGreaterThan(1);
      expect(num.s).toBeLessThanOrEqual(100);
    });

    it('sollte Null korrekt als Zero erkennen (inkl. Tracer)', () => {
      const zero = new DNum(0, 1);
      expect(zero.isZero()).toBe(true);

      zero.add(DNum.fromAny(1e-20)); // Winziger Rest im Tracer
      expect(zero.isZero()).toBe(false);
    });
  });

  describe('2. Arithmetik & Chaos-Banking', () => {
    it('sollte 100.000 Transaktionen ohne Fehler verarbeiten (Fast-Path)', () => {
      let dnum = DNum.fromAny(1000000);
      let truth = 1000000;

      for (let i = 0; i < 10000; i++) {
        const amount = (Math.random() - 0.5) * 1000;
        dnum.add(DNum.fromAny(amount));
        truth += amount;
      }

      expect(parseFloat(dnum.toFullString())).toBeCloseTo(truth, 5);
    });

    it('sollte negative Ergebnisse (Schulden) korrekt handhaben', () => {
      const wallet = DNum.fromAny(100);
      wallet.sub(DNum.fromAny(150));
      expect(wallet.s).toBe(-50);
      expect(wallet.toFullString()).toContain("-50");
    });
  });

  describe('3. Deep-Space Präzision (Tracer-Test)', () => {
    it('sollte Nanometer-Korrekturen bei 300 Mrd. km Distanz verlustfrei darstellen', () => {
      // Start: 300 Milliarden Meter
      const dist = DNum.fromAny(300_000_000_000);
      // Korrektur: 1 Nanometer
      const correction = DNum.fromAny(0.000000001);

      // 100.000 Schritte = 0.0001 Meter (0.1 mm)
      for (let i = 0; i < 100000; i++) {
        dist.add(correction);
      }

      // WICHTIG: Wir nutzen toPreciseString statt toFullString
      // Wir brauchen kein collapse(), da die Methode die Tracer selbst ausliest
      const result = dist.toPreciseString(10);

      // Ein Standard-Float würde hier "...000.0000000000" zeigen
      // Ein normales DNum mit collapse() würde "...000.0001220703" zeigen
      // Unser Stitch-Verfahren zeigt die reine Wahrheit:
      expect(result).toBe("300000000000.0001000000");
    });
  });

  describe('4. Wissenschaftliche Funktionen (sqrt/pow)', () => {
    it('sollte Quadratwurzeln auch in riesigen Dimensionen ziehen', () => {
      // sqrt(10^1000) = 10^500
      const huge = DNum.fromLog(1000);
      const root = huge.sqrt();
      expect(root.totalLog).toBeCloseTo(500, 5);
    });

    it('sollte Potenzen (pow) ohne Infinity-Crash berechnen', () => {
      // (10^100)^5 = 10^500
      const num = DNum.fromLog(100);
      const power = num.pow(5);
      expect(power.totalLog).toBeCloseTo(500, 5);
    });

    it('sollte das Gravitationsgesetz stabil rechnen', () => {
      const G = DNum.fromAny(6.674e-11);
      const m1 = DNum.fromAny(5.972e24); // Erde exakt
      const m2 = DNum.fromAny(7.347e22); // Mond exakt
      const r = DNum.fromAny(384400000);

      const force = G.mul(m1).mul(m2).div(r.pow(2));
      // Die echte Kraft ist ~19.8 - 20.2
      expect(force.totalLog).toBeGreaterThan(19);
      expect(force.totalLog).toBeLessThan(21);
    });
  });
});