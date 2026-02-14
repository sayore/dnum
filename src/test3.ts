import { DNum } from ".";

function runChaosBankingTest() {
    let floatWallet = 1_000_000.00; // Start: 1 Mio €
    let dnumWallet = DNum.fromAny(1_000_000.00);
    
    // Wir speichern alle Beträge für die "absolute Wahrheit"
    let totalTruth = 1_000_000.00; 

    const iterations = 100_000;
    console.log(`--- Chaos-Banking: ${iterations} Zufalls-Transaktionen ---`);

    for (let i = 0; i < iterations; i++) {
        // Zufälliger Betrag zwischen -5000 und +5000
        let amount = (Math.random() - 0.5) * 10000;
        
        // Jede 10. Transaktion ist "Zinsstaub" (extrem klein)
        if (i % 10 === 0) {
            amount = (Math.random() - 0.5) * 0.000001; 
        }

        // 1. Float verarbeiten
        floatWallet += amount;
        
        // 2. DNum verarbeiten
        dnumWallet.add(DNum.fromAny(amount));

        // 3. Wahrheit (für den Vergleich)
        totalTruth += amount;
    }

    // Ergebnisse einholen
    dnumWallet.collapse(); // Tracer leeren für finalen Check
    const dnumResult = parseFloat(dnumWallet.toFullString());

    console.log(`--- ERGEBNISSE ---`);
    console.log(`Die Wahrheit:   ${totalTruth.toFixed(10)} €`);
    console.log(`Standard Float: ${floatWallet.toFixed(10)} €`);
    console.log(`DNum System:    ${dnumResult.toFixed(10)} €`);

    // Abweichungen berechnen
    const floatDiff = Math.abs(totalTruth - floatWallet);
    const dnumDiff = Math.abs(totalTruth - dnumResult);

    console.log(`\n--- FEHLER-CHECK ---`);
    console.log(`Float-Fehler: ${floatDiff.toExponential(4)} €`);
    console.log(`DNum-Fehler:  ${dnumDiff.toExponential(4)} €`);
}

runChaosBankingTest()
runChaosBankingTest()
runChaosBankingTest()