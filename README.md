# DNum

**High-precision numbers for infinite scales.**

DNum is a TypeScript library designed to handle values that exceed the limits of Number.MAX_VALUE without sacrificing micro-precision. By utilizing a dimensional hypercube model **V = s<sup>d</sup>**, DNum efficiently processes scales ranging from subatomic nanometers to intergalactic distances.

---

## ✨ Features

* **Infinite Scaling:** Represent numbers far beyond 10<sup>308</sup> and even 10<sup>1,000,000</sup>.
* **Tracer System:** Prevents precision loss (underflow) by collecting micro-amounts in separate buckets until they become significant.
* **Banking-Safe Fast-Path:** Computes values up to 10<sup>15</sup> bit-identically with standard 64-bit floats for maximum performance.
* **Scientific Functions:** Native support for `sqrt()`, `pow(n)`, `add()`, `sub()`, `mul()`, and `div()`.
* **DNum Style Formatting:** Unique visual representation using subscripts for dimensions and superscripts for precision.
* **Lossless Persistence:** Full serialization including all internal tracer data.

---

## 🚀 Installation

```bash
npm install @sayore/dnum
# or
pnpm add @sayore/dnum
```

---

## 🧠 Core Concepts

### The Dimensional Model
Instead of a massive mantissa, DNum represents values as the volume of an n-dimensional hypercube:
**V = s<sup>d</sup>**
* **s (Side length):** Normalized typically within the [1.1, 100] range.
* **d (Dimension):** The scaling tier of the number.

### The Tracer System
When adding 10<sup>20</sup> and 10<sup>-5</sup>, a standard 64-bit float would simply discard the smaller number. DNum parks these "micro-informations" in a **TracerSystem**. Once the sum of these small amounts becomes relevant (or `collapse()` is called), they are fused into the main value.

---

## 🛠 Usage

### Basic Arithmetic
```typescript
import { DNum } from '@sayore/dnum';

const a = DNum.fromAny(1e20);
const b = DNum.fromAny(5e18);

a.add(b);
console.log(a.toScientific()); // "1.0500e+20"
```

### Deep-Space Precision (Tracer Test)
DNum excels where hardware floats fail, such as correcting nanometers on a 300 billion km journey.
```typescript
const distance = DNum.fromAny(300_000_000_000); // 300 billion meters
const correction = DNum.fromAny(0.000000001);   // 1 nanometer

for (let i = 0; i < 100000; i++) {
    distance.add(correction);
}

// collapse() merges tracers into the float, but toPreciseString()
// stitches the tracer data textually for 100% display accuracy.
console.log(distance.toPreciseString(10)); // "300000000000.0001000000"
```

---

## 💎 DNum Style (UI Formatting)

For games and simulations, DNum offers a compact, typographic representation:

* **Subscripts (Bottom):** The Dimension (d).
* **Superscripts (Top):** The Decimal precision of the side length (s).

**Example Output:** ₁₂12⁵⁰

```typescript
const powerLevel = new DNum(12.50, 12);
console.log(powerLevel.toString(2)); 
// Output: ₁₂12⁵⁰

const powerLevel = new DNum(12.50, 12);
console.log(powerLevel.toString(2)); 
// Output: ₁₄73⁵³ (₁₂150⁵⁰ but normalized to be within 0 - 100)
```

---

## 📊 API Reference (Quick Look)

| Method | Description |
| :--- | :--- |
| `add(other)` | Adds another DNum (including tracer data). |
| `mul(other)` | Multiplies and scales all internal buckets. |
| `sqrt()` | Calculates the square root in log-space. |
| `pow(n)` | Raises the number to the power of n. |
| `collapse()` | Force-merges tracer content into the main value (hardware-level). |
| `toPreciseString(p)` | Outputs exact value bypassing 64-bit rounding errors. |

---

## ⚠️ Limitations & Harsh Realities

DNum is a powerhouse for scaling, but it is **not** a magic bullet:

1. **The "15-Digit Window":** DNum is not an Arbitrary Precision library. It uses a "moving window" of ~15 significant digits. You cannot see a grain of sand and a mountain ($10^{20}$ scale difference) perfectly at the same time in one float.
2. **Dimensional Sensitivity:** At very high dimensions (d > 100), the side length $s$ becomes extremely sensitive. A tiny rounding error in $s$ can translate to a massive absolute error.
3. **Performance:** It is slower than native `number` primitives due to the Map-based tracer management. Use it where scale matters, not for high-frequency vertex math.

---

## 💾 Persistence

```typescript
// Save including all micro-tracer data
const json = playerMoney.serialize();

// Restore perfectly
const loaded = DNum.deserialize(json);
```

---

## ⚖️ License
MIT - Created for infinity and beyond.
