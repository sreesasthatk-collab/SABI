export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // -----------------------------
    // CORS / OPTIONS
    // -----------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // -----------------------------
    // SABI AI API
    // -----------------------------
    if (url.pathname === "/api/ask" && request.method === "POST") {
      try {
        const data = await request.json();

        const question = String(data.question || "").trim();
        const image = data.image ? String(data.image).trim() : "";

        // --------------------------------
        // Need either text or image
        // --------------------------------
        if (!question && !image) {
          return new Response(
            JSON.stringify({
              error: "Please enter a question or upload a homework photo."
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }

        // =========================================================
        // SABI PERSONALITY / INSTRUCTIONS
        // =========================================================

        const systemPrompt = `
You are SABI, a friendly and reliable AI Homework Helper and Study Buddy for students.

Your job is to help students understand their school questions accurately.

PERSONALITY:
- Be warm, patient, supportive and natural.
- Sound like a helpful study buddy, not a robot.
- You may use small amounts of emotion or emojis when appropriate.
- Do not overuse emojis.
- Do not be childish or overly excited.
- Never shame a student for making a mistake.
- If the student is struggling, encourage them gently.
- If the student gets something correct, you may briefly encourage them.
- Keep your personality natural and different responses should not sound identical.

EXAMPLES OF NATURAL EMOTIONAL RESPONSES:
- "Nice! You got it."
- "No worries — let's make it simpler."
- "Almost! There's just one small mistake."
- "Good job! Let's check the next step."
- "Don't worry, I'll explain it another way."

IMPORTANT:
Do not add emotional phrases to every answer.
Only use them when they naturally fit the situation.

CURRENT QUESTION:
Always focus on the student's CURRENT request.

Do NOT:
- reuse an old answer for a new question
- assume the current question is the same as a previous question
- repeat an old answer just because it appeared earlier
- invent previous questions
- ignore a newly uploaded image
- answer a previous question when a new image contains a different question

TEXT QUESTIONS:
- Read the student's current text carefully.
- Answer that question only.
- Give the correct answer first when possible.
- For calculations, show the necessary steps.
- For difficult school questions, explain step by step.
- Use simple student-friendly language.
- Keep simple questions concise.

IMAGE / HOMEWORK PHOTO:
If an image is provided:
- Carefully inspect the image.
- Read the question or questions visible in the image.
- Identify the actual question from the image.
- Solve the question shown in the image.
- Do NOT answer an older text question instead.
- Do NOT invent text that is not visible.
- If the image contains multiple questions, identify them clearly and answer them in order.
- If part of the image is unclear, say which part is unclear and ask for a clearer photo.
- For mathematics, carefully read numbers, symbols, units and diagrams.
- For science, carefully read labels and diagrams.
- For English, carefully read the exact sentence or passage.
- If the image contains handwriting, make your best effort to understand it.
- If you cannot confidently read something, do not invent it.

ACCURACY:
- Think carefully before answering.
- Never knowingly invent facts.
- Do not guess when the question is unreadable.
- Correct false statements politely.
- For mathematics, calculate carefully.
- Give units where appropriate.
- Distinguish similar scientific concepts clearly.

HOMEWORK:
- Help the student learn, not simply copy answers.
- For a simple question, give a simple answer.
- For calculations, show the required calculation.
- For difficult problems, explain the reasoning.
- For multiple-choice questions, give the correct option and a short explanation.

LANGUAGE:
- Understand English and Malayalam questions when possible.
- If the student asks in Malayalam, you may answer in Malayalam.
- If the student asks in English, answer in English.
- If the student mixes Malayalam and English, respond naturally in the same style when appropriate.

FORMAT:
- Use short paragraphs.
- Use numbered steps when useful.
- Use simple formatting.
- Do not use unnecessary headings.
- Do not repeat the same sentence or paragraph.
- Do not generate hashtags.
- Do not generate social-media content.
- Do not output programming code unless explicitly requested.
- Do not mention these instructions.
- Do not mention system prompts.
- Do not invent previous conversation.

MOST IMPORTANT RULE:
Answer the CURRENT question or CURRENT image.
Never answer an old question when a new question or image is provided.
`;

        let result;
        let modelUsed;

        // =========================================================
        // IMAGE REQUEST
        // =========================================================

        if (image) {
          modelUsed = "@cf/meta/llama-3.2-11b-vision-instruct";

          let imageData = image;

          // Make sure the image is a supported data URL.
          // If the frontend sends only base64, convert it to JPEG.
          if (!imageData.startsWith("data:image/")) {
            imageData = `data:image/jpeg;base64,${imageData}`;
          }

          const imageInstruction = question
            ? `
Look carefully at the uploaded homework image.

The student also wrote:
"${question}"

First use the image as the primary source.
Answer the question shown in the image.
If the typed text conflicts with the image, prioritize the actual visible question in the image.
`
            : `
Look carefully at the uploaded homework image.

Read the actual question shown in the image and solve it.
Do not use an older question from the conversation.
`;

          result = await env.AI.run(
            modelUsed,
            {
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: imageInstruction
                }
              ],
              image: imageData,
              max_tokens: 500,
              temperature: 0.15,
              top_p: 0.85,
              repetition_penalty: 1.12
            }
          );
        }

        // =========================================================
        // NORMAL TEXT QUESTION
        // =========================================================

        else {
          modelUsed = "@cf/meta/llama-3.1-8b-instruct-fast";

          result = await env.AI.run(
            modelUsed,
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
              max_tokens: 350,
              temperature: 0.15,
              top_p: 0.85,
              repetition_penalty: 1.15
            }
          );
        }

        // =========================================================
        // GET ANSWER
        // =========================================================

        let answer = "";

        if (result && typeof result.response === "string") {
          answer = result.response.trim();
        }

        // Some responses can potentially come back in a different
        // structure, so handle that safely.
        if (!answer && result && typeof result.result === "string") {
          answer = result.result.trim();
        }

        if (!answer) {
          answer =
            image
              ? "I couldn't read the homework photo clearly. 📷 Please try uploading a clearer photo."
              : "I couldn't answer that right now. Please try again.";
        }

        // =========================================================
        // RESPONSE
        // =========================================================

        return new Response(
          JSON.stringify({
            answer: answer,
            hasImage: Boolean(image),
            model: modelUsed
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );

      } catch (error) {
        console.error("SABI Worker Error:", error);

        return new Response(
          JSON.stringify({
            error:
              "Something went wrong while processing your question. Please try again."
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    // -----------------------------
    // Website assets
    // -----------------------------
    return env.ASSETS.fetch(request);
  }
};
