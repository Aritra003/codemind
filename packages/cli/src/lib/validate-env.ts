/** Lightweight startup check for CLI — no logger yet at this point. */
export function validateEnvCli(): void {
  const nodeVersion = process.versions.node
  const [major] = nodeVersion.split('.').map(Number)
  if ((major ?? 0) < 20) {
    process.stderr.write(`\n  ✗ StinKit requires Node.js >= 20. Current: ${nodeVersion}\n\n`)
    process.exit(1)
  }
}
