import { describe, it, expect } from 'vitest';
import { DNum } from '../src/index.js';

describe('DNum Library', () => {
    it('should initialize and normalize correctly', () => {
        const num = new DNum(150, 1);
        expect(num.s).toBeCloseTo(100);
        expect(num.d).toBeGreaterThan(1);
    });

    it('should add numbers correctly', () => {
        const a = new DNum(10, 1);
        const b = new DNum(10, 1);
        a.add(b);
        expect(a.s).toBeCloseTo(20);
        expect(a.d).toBe(1);
    });

    it('should handle large scale differences using the tracer', () => {
        const large = new DNum(90, 12);
        const small = new DNum(50, 1);
        const initialS = large.s;
        
        large.sub(small);
        expect(large.s).toBe(initialS);
    });

    it('should multiply correctly', () => {
        const a = new DNum(10, 1);
        const b = new DNum(10, 1);
        a.mul(b);
        expect(a.s).toBeCloseTo(100);
    });
});