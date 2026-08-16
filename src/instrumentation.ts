export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startIndexer } = await import("./server/indexer");
    startIndexer();
  }
}
