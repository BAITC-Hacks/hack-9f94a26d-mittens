import { performance } from 'node:perf_hooks'
import { count_valid, optimize } from './optimizer'
const start = performance.now()
const results = optimize()
const elapsed = performance.now() - start
console.log(JSON.stringify({ node: process.version, elapsed_ms: Number(elapsed.toFixed(2)), valid_sets: count_valid(), best: results[0] }, null, 2))
if (elapsed >= 5000) process.exitCode = 1
