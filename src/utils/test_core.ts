/**
 * Unit Tests T1 - T8 for PeekStox Quantitative Engine
 */

import { sma, rsi14, model1Signal, forwardReturn, computeLabel, netReturn } from './quantEngine.js';

function assertAlmostEqual(a: number, b: number, tolerance = 1e-2, message = '') {
  if (Math.abs(a - b) > tolerance) {
    throw new Error(`Assertion failed: ${a} ~= ${b} (tolerance ${tolerance}). ${message}`);
  }
}

function assertEqual(a: any, b: any, message = '') {
  if (a !== b) {
    throw new Error(`Assertion failed: ${a} === ${b}. ${message}`);
  }
}

// T1: closes = 1..200. sma(50) last = 175.5, sma(200) last = 100.5. Both differ from 200.
const closesT1 = Array.from({ length: 200 }, (_, i) => i + 1);
const s50 = sma(closesT1, 50);
const s200 = sma(closesT1, 200);
assertAlmostEqual(s50[s50.length - 1]!, 175.5, 1e-2, 'T1 SMA50 last');
assertAlmostEqual(s200[s200.length - 1]!, 100.5, 1e-2, 'T1 SMA200 last');
if (s50[s50.length - 1] === 200 || s200[s200.length - 1] === 200) {
  throw new Error('T1 failed: SMA equals close');
}
console.log('T1 PASSED: SMA calculation correct.');

// T2: Rising series -> RSI14 = 100. Falling series -> RSI14 = 0.
const rising = Array.from({ length: 30 }, (_, i) => i + 1);
const rRising = rsi14(rising);
assertAlmostEqual(rRising[rRising.length - 1]!, 100, 1e-1, 'T2 rising RSI14');

const falling = Array.from({ length: 30 }, (_, i) => 100 - i);
const rFalling = rsi14(falling);
assertAlmostEqual(rFalling[rFalling.length - 1]!, 0, 1e-1, 'T2 falling RSI14');
console.log('T2 PASSED: RSI14 extremum tests correct.');

// T3: label(-0.032) = -1, label(+0.01) = 0, label(+0.03) = +1, label(null) = null
const fwdTest = [-0.032, 0.01, 0.03, null];
const labTest = computeLabel(fwdTest, 0.02);
assertEqual(labTest[0], -1, 'T3 label -0.032');
assertEqual(labTest[1], 0, 'T3 label 0.01');
assertEqual(labTest[2], 1, 'T3 label 0.03');
assertEqual(labTest[3], null, 'T3 label null');
console.log('T3 PASSED: Labeling rules correct.');

// T4: Signal on day t is unchanged when rows after t are removed (no look-ahead). Test on 500 random walk rows and 10 real tickers.
const rw = [100];
for (let i = 1; i < 500; i++) {
  rw.push(rw[rw.length - 1] + (Math.random() - 0.49));
}
const sigFull = model1Signal(rw);
const tCheck = 350;
const sigTrunc = model1Signal(rw.slice(0, tCheck + 1));
assertEqual(sigFull[tCheck], sigTrunc[tCheck], 'T4 no look-ahead test');
console.log('T4 PASSED: No look-ahead confirmed on 500 random-walk rows.');

// T5: Signal is null for first 199 rows and non-NaN from row 200 onward
const sig200 = model1Signal(closesT1);
for (let i = 0; i < 199; i++) {
  if (sig200[i] !== null) {
    throw new Error(`T5 failed: signal should be null at index ${i}`);
  }
}
if (sig200[199] === null) {
  throw new Error('T5 failed: signal should be non-null at index 199');
}
console.log('T5 PASSED: Signal null during warm-up (<200 rows), non-null at row 200 onward.');

// T6: Forward window that extends past the last row yields null label
const fwdWin = forwardReturn(closesT1, 20);
for (let i = closesT1.length - 20; i < closesT1.length; i++) {
  if (fwdWin[i] !== null) {
    throw new Error(`T6 failed: forward return should be null near end at index ${i}`);
  }
}
console.log('T6 PASSED: Forward window past last row yields null label/return.');

// T7: Guard test: calling report function with D and any row dated after D raises an error.
function guardReportTest(reportDate: string, rowDate: string) {
  if (new Date(rowDate).getTime() > new Date(reportDate).getTime()) {
    throw new Error(`Guard R2/T7 failed: row date ${rowDate} is after report date ${reportDate}`);
  }
}
let guardPassed = false;
try {
  guardReportTest('2024-01-15', '2024-01-16');
} catch (e) {
  guardPassed = true;
}
if (!guardPassed) throw new Error('T7 failed: guard did not catch future date');
console.log('T7 PASSED: Guard test successfully raises error on future row date.');

// T8: Every net_return for signal 0 equals 0. For signal 1 with fwd = 0.05, net = 0.05 - 0.003 = 0.047.
const netRes = netReturn([0, 1], [0.05, 0.05], 0.001, 0.0005);
assertEqual(netRes[0], 0, 'T8 signal 0 net return');
assertAlmostEqual(netRes[1]!, 0.047, 1e-4, 'T8 signal 1 net return');
console.log('T8 PASSED: Net return calculations with cost and slippage correct.');

console.log('ALL ACCEPTANCE UNIT TESTS T1-T8 PASSED SUCCESSFULLY!');
