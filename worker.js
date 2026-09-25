export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ask" && request.method === "POST") {
      try {
        const data = await request.json();
        const question = data.question;

        if (!question) {
          return Response.json(
            { error: "Please enter a question." },
            { status: 400 }
          );
        }

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            prompt: `You are SABI, a friendly AI homework helper for students.

Explain answers clearly and step by step.
Use simple language.
If it is a school homework question, show the working when useful.

Student's question:
${question}`
          }
        );

        return Response.json({
          answer: result.response
        });

      } catch (error) {
        return Response.json(
          { error: "Sorry, something went wrong." },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
