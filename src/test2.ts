import { DNum } from ".";

function runPrecisionTest(startDim: number, iterations: number) {
    // Wir starten bei s=50 in der Ziel-Dimension
    const original = new DNum(50, startDim);
    const runner = new DNum(50, startDim);
    
    // Faktor für die Multiplikation (darf nicht zu simpel sein wie '2')
    const factor = new DNum(1.123456789, 1); 
    
    console.log(`--- Test: Dimension ${startDim} (${iterations} Iterationen) ---`);

    for (let i = 0; i < iterations; i++) {
        // Multipliziere mit einer Primzahl-ähnlichen Log-Basis
        runner.mul(new DNum(1.0000001, 1)); 
        // Addiere einen winzigen Betrag (Tracer-Belastung)
        runner.add(new DNum(1, 1));
    }

    // Wir nutzen collapse, um die "nackte Wahrheit" zu sehen
    runner.collapse();
    original.collapse();

    // Berechnung der Abweichung im linearen Raum (Log-Differenz)
    const logDiff = Math.abs(runner['totalLog'] - original['totalLog']);
    const precisionPct = (1 - logDiff / original['totalLog']) * 100;

    console.log(`Start:  ${original.toScientific()}`);
    console.log(`Ende:   ${runner.toScientific()}`);
    console.log(`Drift (Log-Skala): ${logDiff.toExponential(4)}`);
    console.log(`Präzision: ${precisionPct.toFixed(10)}%\n`);
}

// Tests durchführen
runPrecisionTest(1, 1000000);    // 1D (Linear)
runPrecisionTest(12, 1000000);   // 12D (Dein Bereich)
runPrecisionTest(1000, 1000000); // 1000D (Extreme)