# DNum

**High-precision numbers for infinite scales.**

DNum is a TypeScript library designed to handle values that exceed the limits of `Number.MAX_VALUE` without sacrificing micro-precision. By utilizing a dimensional hypercube model $V = s^d$, DNum efficiently processes scales ranging from subatomic nanometers to intergalactic distances.

---

## ✨ Features

* **Infinite Scaling:** The $V = s^d$ model allows for representing numbers far beyond $10^{308}$ and even $10^{1,000,000}$.
* **Tracer System:** Prevents precision loss (underflow) by collecting micro-amounts in separate buckets until they become significant to the main value.
* **Banking-Safe Fast-Path:** Computes values up to $10^{15}$ bit-identically with standard 64-bit floats for maximum performance and accuracy.
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
Instead of a massive mantissa, DNum represents values as the volume of an $n$-dimensional hypercube:
$$V = s^d$$
* **s (Side length):** Normalized typically within the $[1.1, 100]$ range.
* **d (Dimension):** The scaling tier of the number.



### The Tracer System
When adding $10^{20}$ and $10^{-5}$, a standard 64-bit float would simply discard the smaller number. DNum parks these "micro-informations" in a **TracerSystem**. Once the sum of these small amounts becomes relevant (or `collapse()` is called), they are fused into the main value.



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

---

## 💎 DNum Style (UI Formatting)

For games and simulations, DNum offers a compact, typographic representation:

* **Subscripts (Bottom):** The Dimension ($d$).
* **Superscripts (Top):** The Decimal precision of the side length ($s$).

**Example Output:** ₁₂150⁵⁰

```typescript
const powerLevel = new DNum(150.50, 12);
console.log(powerLevel.toString(2)); 
// Output: [Subscript 12] 150 [Superscript 50]
```

### Bidirectional Parsing
DNum can parse its own visual style back into a mathematical object:
```typescript
const recovered = DNum.fromStyledString("\u2081\u2082150\u2075\u2070");
console.log(recovered.d); // 12
console.log(recovered.s); // 150.5
```

---

## 📊 API Reference (Quick Look)

| Method | Description |
| :--- | :--- |
| `add(other)` | Adds another DNum (including tracer data). |
| `mul(other)` | Multiplies and scales all internal buckets. |
| `sqrt()` | Calculates the square root in log-space. |
| `pow(n)` | Raises the number to the power of $n$. |
| `collapse()` | Force-merges tracer content into the main value (hardware-level). |
| `toPreciseString(p)` | Outputs exact value bypassing 64-bit rounding errors. |

---

## 🧪 Testing

The library is battle-tested against real-world scientific scenarios, including the **Bennu Mission** simulation, where nanometer corrections remained stable across millions of iterations.

---

## ⚠️ Limitations & Harsh Realities

DNum is a powerhouse for scaling, but it is **not** a magic bullet. Read these before using it in production:

### 1. The "15-Digit Window"
DNum is **not** an Arbitrary Precision library (like BigInt or Decimal.js). It uses a "moving window" of ~15 significant digits. 
* **The Reality:** You can add a grain of sand to a mountain and DNum will remember it. But you **cannot** see the individual grains of sand and the entire mountain simultaneously if the mountain is $10^{20}$ times larger than the grain. The middle digits will be lost to floating-point noise.

### 2. Dimensional Sensitivity (The Butterfly Effect)
In high dimensions ($d > 100$), the side length $s$ becomes extremely sensitive.
* **The Reality:** A rounding error in the 15th decimal place of $s$ at Dimension 1000 can translate to an absolute error larger than the observable universe. DNum is **logarithmically stable**, but **linearly chaotic** at high scales.

### 3. Not for Cryptography or Precise Finance
* **The Reality:** Never use DNum for cryptographic keys, security tokens, or financial ledgers that require 100% digit-perfect accuracy across massive scales. Use `BigInt` or specialized accounting libraries for that.

### 4. Performance Overhead
While fast, DNum is a complex object with a `Map`-based tracer system.
* **The Reality:** It is significantly slower than native `number` primitives. Don't use it for heavy vertex math or real-time physics engines unless you actually need the infinite scale.

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
