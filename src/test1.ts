import { DNum } from ".";

// 1. Viel Geld haben (Dimension 100)
const vermoegen = new DNum(10, 100); 

// 2. Den Abzug vorbereiten: Das Gleiche Geld + 200 Euro extra
const abzug = new DNum(10, 100);
abzug.add(new DNum(200, 1)); // Die 200 landet im Tracer

console.log("Besitz: ", vermoegen.toString());
console.log("Kosten: ", abzug.toString());

// 3. Subtraktion
vermoegen.sub(abzug);

console.log("Ergebnis:", vermoegen.toString()); 
// Erwartet: -₃5⁸⁴ (was -200 entspricht)

const powerLevel = new DNum(12.50, 12);
console.log(powerLevel.toString(2)); 
const powerLevel2 = new DNum(150.50, 12);
console.log(powerLevel2.toString(2)); 