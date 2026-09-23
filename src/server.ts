import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import type { RequestHandler } from '@tanstack/react-start/server'
import type { Register } from '@tanstack/react-router'
import { handleOptimizerRequest, initializeOptimizerCache } from './server/optimizer.server'

initializeOptimizerCache()
const start = createStartHandler(defaultStreamHandler)
const fetch: RequestHandler<Register> = async (request, options) => {
  return await handleOptimizerRequest(request) ?? start(request, options)
}
export default { fetch }
