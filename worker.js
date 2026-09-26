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

      const image =
        typeof body.image === "string"
          ? body.image.trim()
          : "";

      if (!question && !image) {
        return json(
          {
            error:
              "Please type a question or upload a homework photo.",
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
Keep answers short, clear and easy for students.

For simple questions, give a simple direct answer.

For Mathematics:
Calculate carefully and give the correct answer.
Show short steps when useful.

For Science:
Give scientifically correct information.

For History and Social Science:
Do not invent facts.

For English:
Give accurate grammar, meaning, writing and comprehension help.

If the student asks for an explanation, explain simply.

If the student asks for important questions, use only the class, subject and topic requested.

IMAGE:
If an image is provided, identify the actual homework question shown.
Answer only the visible question.
Do not guess unreadable information.
If the image is unclear, ask for a clearer image.
`;

      let result;

      if (image) {
        const imagePrompt = question
          ? `
The student also provided this current request:

${question}

Look carefully at the uploaded homework image.
Identify the actual homework question shown.
Answer that question directly.
Do not guess unreadable information.
`
          : `
Look carefully at the uploaded homework image.
Identify the homework question or questions that are clearly visible.
Answer them directly.
Do not guess unreadable information.
`;

        result = await env.AI.run(
          "@cf/meta/llama-3.2-11b-vision-instruct",
          {
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: imagePrompt,
              },
            ],
            image: image,
            max_tokens: 700,
          }
        );
      } else {
        result = await env.AI.run(
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
      }

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

        return
