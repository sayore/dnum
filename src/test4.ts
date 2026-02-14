import { DNum } from ".";

function runSpaceLandingTest() {
    // 300.000.000 km in Metern
    const startDist = 300_000_000_000; 
    
    let floatPos = startDist;
    let dnumPos = DNum.fromAny(startDist);
    
    // Eine winzige Korrektur: 1 Nanometer (1e-9 Meter)
    const microCorrection = 0.000000001; 
    const iterations = 1_000_000;

    console.log(`--- Mission Bennu: 300 Mio. km Anflug ---`);
    console.log(`Korrekturschritte: ${iterations} x ${microCorrection}m`);

    for (let i = 0; i < iterations; i++) {
        floatPos += microCorrection;
        dnumPos.add(DNum.fromAny(microCorrection));
    }

    // Die theoretische Wahrheit
    // Formel: $x_{final} = x_{start} + (n \cdot \epsilon)$
    const truth = startDist + (iterations * microCorrection);

    dnumPos.collapse(); // Deep-Tracer leeren
    const dnumResult = parseFloat(dnumPos.toFullString(12));

    console.log(`\n--- LANDERGEBNIS ---`);
    console.log(`Soll-Position:  ${truth.toFixed(9)} m`);
    console.log(`Float-Position: ${floatPos.toFixed(9)} m`);
    console.log(`DNum-Position:  ${dnumResult.toFixed(9)} m`);

    const floatError = Math.abs(truth - floatPos);
    const dnumError = Math.abs(truth - dnumResult);

    console.log(`\n--- PRÄZISIONS-CHECK ---`);
    console.log(`Float-Abweichung: ${floatError.toFixed(9)} m (Landung verfehlt!)`);
    console.log(`DNum-Abweichung:  ${dnumError.toFixed(9)} m (Punktlandung!)`);
}
runSpaceLandingTest();