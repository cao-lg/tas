// 极简测试 Worker
export default {
  fetch(request: Request) {
    return new Response('✅ Worker is working!', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};