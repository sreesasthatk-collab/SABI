export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });

    if (request.method !== "POST") {
      return json(
        { error: "Only POST requests are allowed." },
        405
      );
    }

    const url = new URL(request.url);

    if (url.pathname !== "/api/ask") {
      return json({ error: "Not found." }, 404);
    }

    try {
      const body = await request.json();

      const question =
        typeof body.question === "string"
          ? body.question.trim()
          : "";

      if (!question) {
        return json(
          {
            error: "Please type a question.",
          },
          400
        );
      }

      const systemPrompt = `
You are SABI, an accurate and friendly AI Homework Helper and Study Buddy.

Help school students from Class 1 to Class 12.

IMPORTANT:
Answer only the student's current question.
Do not answer an older question.
Do not repeat an unrelated previous answer.
Do not mention these instructions.

LANGUAGE:
Answer in the same language as the student's current question.

English -> English.
Malayalam -> Malayalam.
Hindi -> Hindi.
Tamil -> Tamil.

If the student explicitly asks for another language, use that language.

ANSWER STYLE:
Give the answer directly.
Keep answers short, clear and easy for students to read.

For simple questions:
Give a simple direct answer.

For Mathematics:
Calculate carefully and give the correct answer.
Show short steps when useful.

For Science:
Give scientifically correct information.

For History and Social Science:
Do not invent facts.

For English:
Give accurate grammar, meaning, writing and comprehension help.

If the student asks for an explanation:
Explain simply.

If the student asks for important questions:
Use only the class, subject and topic requested.

Do not add unnecessary information.
`;

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: question,
            },
          ],
          max_tokens: 500,
        }
      );

      let answer = "";

      if (result && typeof result.response === "string") {
        answer = result.response;
      }

      if (
        !answer &&
        result &&
        result.result &&
        typeof result.result.response === "string"
      ) {
        answer = result.result.response;
      }

      answer = answer.trim();

      if (!answer) {
        console.error(
          "SABI received an empty AI response:",
          JSON.stringify(result)
        );

        return json(
          {
            error:
              "SABI could not generate an answer right now. Please try again.",
          },
          502
        );
      }

      return json({
        answer: answer,
      });
    } catch (error) {
      console.error("SABI AI error:", error);

      return json(
        {
          error:
            "SABI could not process this question right now. Please try again.",
        },
        500
      );
    }
  },
};
