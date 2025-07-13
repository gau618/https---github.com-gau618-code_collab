import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // --- THIS IS THE FIX ---
  // We now expect 'targetLanguage' from the frontend.
  const { question, codeContext, language, targetLanguage } = await request.json();
  
  if (!question || !codeContext || !language) {
    return NextResponse.json({ error: 'Question, code context, and language are required.' }, { status: 400 });
  }

// Define the language instruction for the AI.
const languageInstruction = `Please respond in ${targetLanguage || 'en-US'} using simple and natural language.`;

// Define the complete prompt
const prompt = `
A user has a question about their ${language} code.

Focus primarily on answering the user's specific question:
"${question}"

Your response must:
- Directly and clearly address the user's question first.
- Then explain the related ${language} code step-by-step in beginner-friendly terms.
- Identify any mistakes or improvements, and explain them clearly.
- Use analogies and plain language wherever helpful.
- Assume the user has only basic programming knowledge.

Important constraints:
- Reply in plain text only.
- Do not use formatting symbols like asterisks, underscores, backticks, tildes, pipes, hashes, slashes, or angle brackets.
- Do not include emojis or symbols.
- Do not wrap anything as code.
- Make sure your answer is easy to read aloud and understand when spoken.

${languageInstruction}

User's Code:
---
${codeContext}
---
`;



  // --- END OF FIX ---
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`, {

      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Error from Gemini API:", data.error.message);
      return NextResponse.json({ error: `Gemini API Error: ${data.error.message}` }, { status: data.error.code });
    }

    const answer = data.candidates?.[0]?.content.parts[0]?.text.trim() || 'I am not sure how to answer that.';

    return NextResponse.json({ answer });

  } catch (error) {
    console.error("Gemini doubt API request failed:", error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
