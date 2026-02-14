import { DNum } from './index.js';

const val = new DNum(1, 1);
const increment = new DNum(1, 10); // 10^0 = 1

const getCursorPos = (): Promise<{ rows: number; cols: number }> => {
    return new Promise((resolve, reject) => {
        const termcodes = { cursorGetPosition: '\u001b[6n' };

        // Falls stdin kein TTY ist, abbrechen
        if (!process.stdin.isTTY) {
            return reject(new Error("Nicht in einem TTY-Terminal ausgeführt."));
        }

        process.stdin.setRawMode(true);
        process.stdin.resume(); // Sicherstellen, dass stdin liest

        const onData = (data: Buffer) => {
            const str = data.toString();
            
            // Die Antwort des Terminals sieht so aus: ^[[R;C R (z.B. ^[[10;25R)
            const regex = /\u001b\[(\d+);(\d+)R/;
            const match = str.match(regex);

            if (match) {
                // Aufräumen: Listener entfernen und RawMode beenden
                process.stdin.removeListener('data', onData);
                process.stdin.setRawMode(false);
                process.stdin.pause();

                resolve({
                    rows: parseInt(match[1], 10),
                    cols: parseInt(match[2], 10)
                });
            }
        };

        process.stdin.on('data', onData);
        process.stdout.write(termcodes.cursorGetPosition);
    });
};




const AppMain = async function () {
  const pos = await getCursorPos();
  process.stdout.write("\n");
  console.log({ pos });

  console.log('Starte Zähler (alle 20ms)...');
  let incr = 10;
  let startpos = await getCursorPos();

  process.stdout.write("\n\n\n\n\n")
  let jeffBezosMoney = new DNum(255000000000, 1); // 170 Milliarden Dollar
  console.log(" "+jeffBezosMoney.toString(8));
  let amyMoney = new DNum(480, 1); // 170 Milliarden Dollar
  console.log("+"+amyMoney.toString(8));
  console.log("------");
  jeffBezosMoney.add(amyMoney);
  console.log("="+jeffBezosMoney.toString(8));

  console.log("="+jeffBezosMoney.toFullString(100));
  //let normalcounter = 0;
  //setInterval(() => {
  //    val.add(increment);
  //    normalcounter+=incr;
  //    if (Math.random() > 0.95) {
  //        increment.mul(new DNum(1.1, 1));
  //        incr *= 1.1;
  //    }
  //    //  setzt den Cursor an den Anfang der Zeile, process.stdout.write überschreibt ohne Newline
  //    process.stdout.cursorTo(pos.cols, pos.rows-6);
  //    process.stdout.write("|        Increment                   |             Value        | Dimension | Scalar / Scale / Seitenlänge\n");
  //    process.stdout.write(` [ ${incr.toFixed(2).padStart(14,".")}+s / +${increment.toString().padStart(14,".")} ] ${val.toString().padStart(24,".")} | d: ${val.d.toFixed(4)} | s: ${val.s.toFixed(4)}`);
  //    process.stdout.write("\n                                 ||                         ||");
  //    process.stdout.write(`\n [                     ${incr.toFixed(2).padStart(14,".")} ] ${normalcounter.toFixed(2).padStart(24,".")}                                       `);
  //}, 20);
  //console.log('Zähler gestartet. Drücke STRG+C zum Beenden.');
}

AppMain();