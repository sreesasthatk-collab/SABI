export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

        const prompt = `You are SABI, a simple and friendly AI homework helper.

Answer ONLY the student's current question.

IMPORTANT RULES:
- Give a direct answer.
- For simple math, give the correct numerical answer first.
- Show short working when useful.
- Use simple student-friendly language.
- Do not use hashtags.
- Do not repeat the answer.
- Do not add unrelated questions.
- Do not continue previous conversations.
- Answer only the current question.

CURRENT QUESTION:
${question}`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            prompt: prompt
          }
        );

        let answer = String(result?.response || "").trim();

        if (!answer) {
          answer = "Sorry, I couldn't generate an answer.";
        }

        return new Response(
          JSON.stringify({ answer: answer }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store"
            }
          }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Sorry, something went wrong. Please try again."
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store"
            }
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
