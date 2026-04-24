export function add(a: number, b: number): number {
  return a + b
}

export function multiply(x: number, y: number): number {
  return add(x, y)
}

export const square = (n: number): number => multiply(n, n)
