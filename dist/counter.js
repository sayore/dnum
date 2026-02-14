import { DNum } from './index.js';
const val = new DNum(1, 1);
const increment = new DNum(1, 1);
console.log('Starte Zähler (alle 20ms)...');
setInterval(() => {
    val.add(increment);
    //  setzt den Cursor an den Anfang der Zeile, process.stdout.write überschreibt ohne Newline
    process.stdout.write(`\rAktueller Wert: ${val.toString()} | d: ${val.d.toFixed(4)} | s: ${val.s.toFixed(4)}`);
}, 20);
