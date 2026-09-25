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
- Give a direct answer to the question.
- For simple math, give the correct numerical answer first.
- Show short working when helpful.
- Use simple student-friendly language.
- Do NOT use hashtags.
- Do NOT add labels such as #math, #answer, #mathresult, or #numbers.
- Do NOT repeat the answer.
- Do NOT invent extra questions.
- Do NOT include social-media style text.
- Do NOT continue any previous conversation.
- Answer only the current question.

CURRENT QUESTION:
${question}`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            prompt
          }
        );

        let answer = String(result?.response || "").trim();

        // Remove accidental hashtags/social-media text.
        answer = answer
          .replace(/#[A-Za-z0
