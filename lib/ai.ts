import OpenAI from 'openai';

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
  });
}

export async function generatePitch(lead: {
  fullName: string;
  jobTitle?: string | null;
  companyName?: string | null;
  industry?: string | null;
  region?: string | null;
  notes?: string | null;
}): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `You are an expert B2B sales consultant for Smart Logics, an AI and software engineering agency.

Based on the following lead information, generate a concise, actionable pitch summary that a sales representative can use during the call. The pitch should:
1. Start with a suggested opening line (natural, non-salesy)
2. Identify likely pain points for this company/role
3. Suggest which Smart Logics services are most relevant (AI Agents, Custom Software, Cloud Architecture, Mobile/Web Apps, Data Engineering & AI)
4. Provide 2-3 key talking points specific to their industry and role
5. Suggest a clear call-to-action (book a demo, schedule a follow-up, send a proposal)

Lead Information:
Name: ${lead.fullName}
Job Title: ${lead.jobTitle || 'Unknown'}
Company: ${lead.companyName || 'Unknown'}
Industry: ${lead.industry || 'Unknown'}
Region: ${lead.region || 'Unknown'}
Notes: ${lead.notes || 'None'}

Keep the response concise and scannable. Use short paragraphs and bullet points. Max 250 words.`,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? '';
}
