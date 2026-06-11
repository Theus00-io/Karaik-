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
