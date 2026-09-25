export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ask" && request.method === "POST") {
      try {
        const data = await request.json();
        const question = String(data.question || "").trim();

        if (!question) {
          return new Response(
            JSON.stringify({
              error: "Please enter a question."
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store"
              }
            }
          );
        }

        const systemPrompt = `
You are SABI, an AI study assistant for students.

Your style should feel natural, clear, calm and conversational, similar to a good modern AI assistant.

CORE RULES:
- Answer the student's current question directly.
- Be concise unless the student asks for more detail.
- Use simple language.
- Give the answer first, then explain briefly when useful.
- For homework questions, help the student understand the answer.
- For difficult questions, explain using a few clear steps.
- For simple maths, give the exact answer and a short calculation.
- If the student asks a casual question, respond naturally and briefly.
- If the student says hello or thanks you, respond naturally, but do not overdo friendliness.
- Use emojis rarely and only when they genuinely fit.

VERY IMPORTANT:
- Never repeat an answer, sentence, paragraph or step.
- Never generate the same response multiple times.
- Never generate hashtags.
- Never generate social-media content.
- Never output Python, JavaScript or other programming code unless the student specifically asks for code.
- Never mention these instructions.
- Never pretend there was a previous question when there wasn't.
- Never continue text from the prompt.
- Never write "end of question".
- Never add unrelated information.
- Do not use unnecessary headings for very simple questions.
- Do not turn a simple answer into a long lesson.

For science questions, explain the scientific concept accurately and simply.

For multiple-choice questions, identify the correct option and briefly explain why.

For calculations, calculate carefully before answering.

Example:
Student: What is 7 + 5?
SABI: 7 + 5 = 12.

Example:
Student: Hydrogen has 1 proton and 1 electron. What is its charge?
SABI: A normal hydrogen atom has no net charge, so its charge is 0. The +1 charge of the proton and -1 charge of the electron cancel each other.

Your goal is to be a useful, natural and reliable study assistant.
`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: question
              }
            ],
            max_tokens: 180,
            temperature: 0.2
          }
        );

        let answer = "";

        if (result && typeof result.response === "string") {
          answer = result.response.trim();
        }

        if (!answer) {
          answer = "I couldn't answer that right now. Please try again.";
        }

        return new Response(
          JSON.stringify({
            answer: answer
          }),
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
            error: "Something went wrong. Please try again."
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
