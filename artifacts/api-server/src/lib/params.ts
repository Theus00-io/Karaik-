/**
 * Express 5 tipa req.params[chave] como `string | string[]` (para suportar
 * parâmetros repetidos/wildcards). Nas nossas rotas, os params são sempre
 * um único segmento, então normalizamos para string com segurança.
 */
export function paramAsString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
