# DNum

**High-precision numbers for infinite scales.**

DNum is a TypeScript library designed to handle values that exceed the limits of `Number.MAX_VALUE` without sacrificing micro-precision. By utilizing a dimensional hypercube model (), DNum efficiently processes scales ranging from subatomic nanometers to intergalactic distances.

---

## ✨ Features

* **Infinite Scaling:** The  model allows for representing numbers far beyond  and even .
* **Tracer System:** Prevents precision loss (underflow) by collecting micro-amounts in separate buckets until they become significant to the main value.
* **Banking-Safe Fast-Path:** Computes values up to  bit-identically with standard 64-bit floats for maximum performance and accuracy.
* **Scientific Functions:** Native support for `sqrt()`, `pow(n)`, `add()`, `sub()`, `mul()`, and `div()`.
* **DNum Style Formatting:** Unique visual representation using subscripts for dimensions and superscripts for precision.
* **Lossless Persistence:** Full serialization including all internal tracer data.

---

## 🚀 Installation

```bash
npm install dnum
# or
pnpm add dnum

```

---

## 🧠 Core Concepts

### The Dimensional Model

Instead of a massive mantissa, DNum represents values as the volume of an -dimensional hypercube: .

* ** (Side length):** Normalized typically within the  range.
* ** (Dimension):** The scaling tier of the number.

### The Tracer System

When adding  and , a standard 64-bit float would simply discard the smaller number. DNum parks these "micro-informations" in a **TracerSystem**. Once the sum of these small amounts becomes relevant (or `collapse()` is called), they are fused into the main value.

---

## 🛠 Usage

### Basic Arithmetic

```typescript
import { DNum } from 'dnum';

const a = DNum.fromAny(1e20);
const b = DNum.fromAny(5e18);

a.add(b);
console.log(a.toScientific()); // "1.0500e+20"

```

### Deep-Space Precision

DNum excels where hardware floats fail.

```typescript
const distance = DNum.fromAny(300_000_000_000); // 300 million km
const correction = DNum.fromAny(0.000000001);   // 1 nanometer

for (let i = 0; i < 100000; i++) {
    distance.add(correction);
}

// Uses "Tracer Stitching" to display the exact truth
console.log(distance.toPreciseString(10)); // "300000000000.0001000000"

```

---

## 💎 DNum Style (UI Formatting)

For games and simulations, DNum offers a compact, typographic representation:

* **Subscripts (Bottom):** The Dimension ().
* **Superscripts (Top):** The Decimal precision.

```typescript
const powerLevel = new DNum(150.50, 12);
console.log(powerLevel.toString(2)); 
// Output: "₁₂150⁵⁰"

```

### Bidirectional Parsing

DNum can parse its own visual style back into a mathematical object:

```typescript
const recovered = DNum.fromStyledString("₁₂150⁵⁰");
console.log(recovered.d); // 12

```

---

## 📊 API Reference (Quick Look)

Der mitgelieferte `DNumFormatter` schaltet automatisch zwischen verschiedenen Modi um:

| Method | Description |
| --- | --- |
| `add(other)` | Adds another DNum (including tracer data). |
| `mul(other)` | Multiplies and scales all internal buckets. |
| `sqrt()` | Calculates the square root in log-space. |
| `pow(n)` | Raises the number to the power of . |
| `collapse()` | Force-merges tracer content into the main value (hardware-level). |
| `toPreciseString(p)` | Outputs exact value bypassing 64-bit rounding errors. |

---

## 🧪 Testing

The library is battle-tested against real-world scientific scenarios, including the **Bennu Mission** simulation, where nanometer corrections remained stable across millions of iterations.

---

## 💾 Persistence

```typescript
// Save
const json = playerMoney.serialize();

// Load
const loaded = DNum.deserialize(json);

```

---

## ⚖️ License

MIT - Created for infinity and beyond.