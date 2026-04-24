import { add, multiply } from './math'

export function main(): void {
  const result = add(1, 2)
  multiply(result, 3)
}
