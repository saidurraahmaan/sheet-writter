// Function to convert number to column letter (1=A, 26=Z, 27=AA, etc.)
export const getColumnLetter = (num) => {
  let letter = "";
  while (num > 0) {
    const modulo = (num - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
};

// Function to convert column letter(s) to number (A=1, Z=26, AA=27, etc.)
export const getColumnNumber = (letters) => {
  if (!letters || typeof letters !== 'string') return NaN;
  let num = 0;
  const upper = letters.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const charCode = upper.charCodeAt(i) - 64; // 'A' -> 1
    if (charCode < 1 || charCode > 26) return NaN;
    num = num * 26 + charCode;
  }
  return num;
};
