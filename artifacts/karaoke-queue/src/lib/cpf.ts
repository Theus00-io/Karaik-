export function validateCPF(value: string): boolean {
  const n = value.replace(/\D/g, "");
  if (n.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(n)) return false; // all same digits
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(n[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === parseInt(n[9]) && calc(10) === parseInt(n[10]);
}

export function formatCPF(value: string) {
  const numeric = value.replace(/\D/g, "");
  if (numeric.length <= 3) return numeric;
  if (numeric.length <= 6) return `${numeric.slice(0, 3)}.${numeric.slice(3)}`;
  if (numeric.length <= 9) return `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6)}`;
  return `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${numeric.slice(9, 11)}`;
}

export function unmaskCPF(value: string) {
  return value.replace(/\D/g, "");
}

export function maskCPFPartial(value: string) {
  const numeric = unmaskCPF(value);
  if (numeric.length !== 11) return value; // fallback
  return `***.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-**`;
}
