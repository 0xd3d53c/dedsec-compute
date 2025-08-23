// Service Worker for background task processing
const CACHE_NAME = "dedsec-compute-v1"
const BACKGROUND_SYNC_TAG = "background-compute"

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installing")
  self.skipWaiting()
})

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activating")
  event.waitUntil(self.clients.claim())
})

// Background sync for offline task processing
self.addEventListener("sync", (event) => {
  if (event.tag === BACKGROUND_SYNC_TAG) {
    console.log("[SW] Background sync triggered")
    event.waitUntil(processBackgroundTasks())
  }
})

// Message handling for compute tasks
self.addEventListener("message", (event) => {
  const { type, data } = event.data

  switch (type) {
    case "START_BACKGROUND_COMPUTE":
      startBackgroundCompute(data)
      break
    case "STOP_BACKGROUND_COMPUTE":
      stopBackgroundCompute()
      break
    case "PING":
      event.ports[0].postMessage({ type: "PONG", timestamp: Date.now() })
      break
  }
})

let backgroundComputeInterval = null

function startBackgroundCompute(config) {
  console.log("[SW] Starting background compute with config:", config)

  if (backgroundComputeInterval) {
    clearInterval(backgroundComputeInterval)
  }

  // Run background tasks every 30 seconds
  backgroundComputeInterval = setInterval(() => {
    processBackgroundTasks()
  }, 30000)
}

function stopBackgroundCompute() {
  console.log("[SW] Stopping background compute")

  if (backgroundComputeInterval) {
    clearInterval(backgroundComputeInterval)
    backgroundComputeInterval = null
  }
}

async function processBackgroundTasks() {
  try {
    console.log("[SW] Processing background tasks")

    // Simulate background computation
    const result = await performLightweightComputation()

    // Notify clients of completion
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({
        type: "BACKGROUND_TASK_COMPLETE",
        result: result,
        timestamp: Date.now(),
      })
    })
  } catch (error) {
    console.error("[SW] Background task error:", error)
  }
}

async function performLightweightComputation() {
  // Perform lightweight computation that doesn't block the main thread
  const iterations = 10000
  let result = 0

  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i)
  }

  return {
    iterations: iterations,
    result: result,
    computeTime: Date.now(),
  }
}

// Fetch event for caching (optional)
self.addEventListener("fetch", (event) => {
  // Only handle GET requests for static assets
  if (event.request.method === "GET" && event.request.url.includes("/static/")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request)
      }),
    )
  }
})
