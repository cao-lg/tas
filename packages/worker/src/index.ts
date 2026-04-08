export default {
  fetch() {
    return new Response("✅ Worker is working!", {
      headers: { "Content-Type": "text/plain" }
    });
  }
};