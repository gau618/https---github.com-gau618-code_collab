import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { codeContext, language, currentLine } = await request.json();

  if (!codeContext || !language) {
    return NextResponse.json({ error: 'Code context and language are required.' }, { status: 400 });
  }

const prompt = `
You are an expert AI pair programmer.

Your task is to provide a single, deterministic, best-practice code completion for the user's current line of ${language || 'JavaScript'} code.

Instructions:
- DO NOT repeat or restate the existing code.
- DO NOT offer multiple options or explanations.
- DO NOT use randomness.
- Use the provided code context to infer the most likely and correct continuation.
- Assume production-quality, idiomatic code.

Full Code Context:
---
${codeContext || '// No code context provided'}
---

Current Line (to complete):
"${currentLine || '// No current line provided'}"

Only output the continuation (no full line, no explanation).
`;


  try {
    // --- THIS IS THE FIX ---
    // The model name has been updated to gemini-2.0-flash-lite.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    // --- END OF FIX ---

    const data = await response.json();

    if (data.error) {
      console.error("Error from Gemini API:", data.error.message);
      return NextResponse.json({ error: `Gemini API Error: ${data.error.message}` }, { status: data.error.code });
    }
    
    const suggestion = data.candidates?.[0]?.content.parts[0]?.text.trim() || '';

    return NextResponse.json({ suggestion });

  } catch (error) {
    console.error("Gemini API request failed:", error);
    return NextResponse.json({ error: 'Failed to get AI suggestion.' }, { status: 500 });
  }
}
