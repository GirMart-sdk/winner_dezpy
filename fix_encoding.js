/**
 * fix_encoding.js — convierte todos los strings garbled (Latin-1 mal interpretados como UTF-8)
 * de vuelta a sus caracteres Unicode correctos en app.js
 */
const fs = require('fs');
const filePath = process.argv[2] || 'app.js';

let c = fs.readFileSync(filePath, 'utf8');

// Map de secuencias garbled → carácter correcto
// Emojis
const map = [
  // Emojis comunes garbled
  ['ðŸ›\'', '🛒'], ['ðŸ†', '🏆'], ['ðŸ"¦', '📦'], ['ðŸŽ‰', '🎉'],
  ['ðŸ"‹', '📋'], ['ðŸ'³', '💳'], ['ðŸ"±', '📱'], ['ðŸ¦', '🏦'],
  ['ðŸ'µ', '💵'], ['ðŸ'›', '💛'], ['ðŸŽ¨', '🎨'], ['ðŸ"Š', '📊'],
  ['ðŸ"', '🔍'], ['ðŸš€', '🚀'], ['ðŸŽ¨', '🎨'], ['ðŸ"¤', '📤'],
  ['ðŸ"¥', '📥'], ['ðŸ"¨', '📨'], ['ðŸ"', '🔑'], ['ðŸ'¤', '👤'],
  ['ðŸ"', '📦'], ['ðŸª', '🏪'], ['ðŸ'³', '💳'], ['ðŸŽ', '🎁'],
  // Symbols garbled
  ['âœ…', '✅'], ['âŒ', '❌'], ['â³', '⏳'], ['âœ"', '✔'],
  ['âš ï¸', '⚠️'], ['âš ', '⚠'], ['â˜…', '★'], ['â™¡', '♡'],
  ['âŒ›', '⌛'], ['â€¢', '•'], ['ðŸ"²', '🔲'],
  // Spanish chars garbled
  ['Ã©', 'é'], ['Ã¡', 'á'], ['Ã­', 'í'], ['Ã³', 'ó'], ['ÃÂº', 'ú'],
  ['Ã±', 'ñ'], ['Ã', 'Á'], ['Ã‰', 'É'], ['Ã"', 'Ó'], ['Ãš', 'Ú'],
  ['Ã'', 'Ñ'],
  // Special combos
  ['Â¡', '¡'], ['Â¿', '¿'], ['Â·', '·'], ['Âº', 'º'],
  ['Â«', '«'], ['Â»', '»'],
  // More specific ones
  ['estÃ¡', 'está'], ['vacÃ­o', 'vacío'], ['envÃ­o', 'envío'],
  ['dÃ­as', 'días'], ['CÃ³digo', 'Código'], ['invÃ¡lido', 'inválido'],
  ['NÃºmero', 'Número'], ['mÃ©todo', 'método'], ['selecciÃ³n', 'selección'],
  ['categorÃ­a', 'categoría'], ['aÃºn', 'aún'], ['pÃ¡gina', 'página'],
  ['TelÃ©fono', 'Teléfono'], ['TelÃ\u00a9fono', 'Teléfono'],
  ['inicializaciÃ³n', 'inicialización'], ['tambiÃ©n', 'también'],
  ['MÃ¡ximo', 'Máximo'], ['estÃ¡n', 'están'], ['regiÃ³n', 'región'],
  ['SelecciÃ³n', 'Selección'], ['OpciÃ³n', 'Opción'], ['AcciÃ³n', 'Acción'],
  // Box drawing chars garbled (used in commented headers)
  ['â•â•', '══'], ['â"€â"€', '──'],
  ['â•', '═'], ['â"€', '─'],
];

let changed = 0;
for (const [bad, good] of map) {
  const before = c;
  // Use a global replace with string (not regex) to avoid regex special char issues
  while (c.includes(bad)) {
    c = c.split(bad).join(good);
  }
  if (c !== before) changed++;
}

// Additional pass for remaining Ã sequences not caught above
// Ã + next byte pattern (Latin-1 double-byte sequences)
const remainingGarbled = [
  ['ÃÂ­', 'í'], ['ÃÂ©', 'é'], ['ÃÂ¡', 'á'], ['ÃÂ³', 'ó'],
  ['ÃÂ±', 'ñ'], ['ÃÂº', 'ú'],
  // Standalone Ã before vowel (edge cases)
  ['Ã¼', 'ü'], ['Ã ', 'à'],
];
for (const [bad, good] of remainingGarbled) {
  while (c.includes(bad)) { c = c.split(bad).join(good); changed++; }
}

fs.writeFileSync(filePath, c, 'utf8');
console.log(`✅ Fixed ${changed} encoding patterns in ${filePath}`);

// Verify no more garbled chars remain in user-visible strings (showToast, alert)
const lines = c.split('\n');
let remaining = 0;
lines.forEach((line, i) => {
  if (/showToast|alert\(/.test(line) && /[ÃðâŸ]/.test(line)) {
    console.log(`  ⚠ Line ${i+1} still garbled: ${line.trim().substring(0, 80)}`);
    remaining++;
  }
});
console.log(remaining === 0 ? '✅ All user-visible strings clean!' : `⚠ ${remaining} lines still need fixing`);
