// app/api/gemini-error/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { errorText,code } = await req.json();
const prompt = `
You are an assistant that explains compiler/runtime errors clearly and briefly.

Based on the following code and error message, do the following:
1. Explain the issue in **maximum 3 lines**, including:
   - What the error means,
   - Why it likely occurred,
   - How to fix it.
2. Then, provide the corrected code snippet (only the relevant part) in a code block.

Code:
---
${code}
---

Error:
---
${errorText}
---

Respond in this format:
Explanation: [3-line explanation]
Fix:
\`\`\`{ add the language here, e.g. javascript, python, etc. }
[corrected code here]
\`\`\`
`;



    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const explanation =
      data.candidates?.[0]?.content.parts?.[0]?.text.trim() ||
      "No explanation available.";
    console.log("Gemini Error Explanation:", explanation);
    return NextResponse.json({ explanation });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
