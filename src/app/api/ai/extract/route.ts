import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { aiExtractSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError, rateLimit } from '@/lib/api-utils';

// POST /api/ai/extract - Extract interview data from HR message
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Rate limit: 10 per minute
    const { allowed } = rateLimit(`ai:${user.id}`, 10, 60 * 1000);
    if (!allowed) {
      return errorResponse('Too many AI requests. Please try again later.', 429);
    }

    const body = await request.json();
    const validated = aiExtractSchema.parse(body);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o';

    if (!geminiApiKey && !openAiApiKey) {
      return errorResponse('AI service is not configured. Please set GEMINI_API_KEY.', 503);
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are an AI assistant that extracts interview information from HR messages, emails, or chat messages.

Current date: ${currentDate} (${currentDay})

IMPORTANT RULES:
1. Extract ONLY information that is explicitly mentioned in the message
2. If information is not found, return null for that field - DO NOT fabricate or guess
3. For relative dates like "ngày mai", "tomorrow", "thứ 4 tuần sau", "next Monday", calculate from the current date
4. Return dates in ISO format (YYYY-MM-DD)
5. Return times in HH:mm format (24-hour)
6. Detect interview type: OFFLINE if physical address is mentioned, ONLINE if meeting link is present, PHONE if phone interview mentioned
7. If original text has a relative date expression, include it in "originalDateText"

Return a JSON object with these fields:
{
  "companyName": string | null,
  "position": string | null,
  "interviewDate": "YYYY-MM-DD" | null,
  "startTime": "HH:mm" | null,
  "endTime": "HH:mm" | null,
  "location": string | null,
  "interviewType": "OFFLINE" | "ONLINE" | "PHONE" | "OTHER" | null,
  "contactName": string | null,
  "contactPhone": string | null,
  "contactEmail": string | null,
  "meetingUrl": string | null,
  "originalDateText": string | null,
  "interpretedDate": "YYYY-MM-DD" | null,
  "jdText": string | null,
  "notes": string | null
}`;

    let content: string | null = null;

    if (geminiApiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nHR Message:\n${validated.message}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error('Gemini API Error:', errText);
        return errorResponse('Gemini AI failed to process the message', 500);
      }

      const data = await res.json();
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } else if (openAiApiKey) {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: openAiApiKey });

      const completion = await openai.chat.completions.create({
        model: openAiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: validated.message },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000,
      });

      content = completion.choices[0]?.message?.content || null;
    }
    if (!content) {
      return errorResponse('AI failed to process the message', 500);
    }

    try {
      const extracted = JSON.parse(content);
      return successResponse(extracted);
    } catch {
      return errorResponse('AI returned invalid response', 500);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
