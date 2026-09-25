export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // SABI AI homework API
    if (url.pathname === "/api/ask" && request.method === "POST") {
      try {
        const data = await request.json();
        const question = String(data.question || "").trim();

        if (!question) {
          return Response.json(
            { error: "Please enter a question." },
            { status: 400 }
          );
        }

        const prompt = `You are SABI, a friendly AI homework helper for students.

Answer ONLY the student's current question below.

Rules:
- Do not remember or continue previous questions.
- Do not add unrelated questions or previous answers.
- Explain clearly and step by step when useful.
- Use simple language suitable for students.
- For math, calculate the exact answer carefully.
- Give the final answer clearly.

CURRENT STUDENT QUESTION:
${question}`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            prompt
          }
        );

        return Response.json({
          answer:
            result?.response ||
            "Sorry, I couldn't generate an answer."
        });

      } catch (error) {
        return Response.json(
          {
            error: "Sorry, something went wrong. Please try again."
          },
          { status: 500 }
        );
      }
    }

    // Serve the SABI website
    return env.ASSETS.fetch(request);
  }
};
