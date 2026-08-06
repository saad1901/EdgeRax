export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("./lib/db/migrate")
    try {
      await initDb()
    } catch (error) {
      console.error("Database initialization failed:", error)
      throw error
    }
  }
}
