import { NextRequest, NextResponse } from 'next/server';
import { Twilio } from 'twilio';
import OpenAI from 'openai';

// Helper function to parse the URL-encoded form data
async function parseFormData(req: NextRequest) {
  const bodyText = await req.text();
  const params = new URLSearchParams(bodyText);
  const parsedBody: { [key: string]: string } = {};
  for (const [key, value] of params.entries()) {
    parsedBody[key] = value;
  }
  return parsedBody;
}

// Set up Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Set up OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Handle POST requests to the /api/whatsapp endpoint
export async function POST(req: NextRequest) {
  try {
    // Parse the URL-encoded form data from Twilio's webhook
    const body = await parseFormData(req);
    const { Body, From } = body; // "Body" is the WhatsApp message, "From" is the sender

    // Call OpenAI API to generate a response based on the message
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: Body }],
    });

    const reply = openaiResponse.choices[0].message?.content || 'Sorry, I could not process that.';

    // Use Twilio to send the reply back via WhatsApp
    await twilioClient.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: From,
      body: reply,
    });

    return NextResponse.json({ message: 'Message sent!' }, { status: 200 });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json({ message: 'Error processing the message' }, { status: 500 });
  }
}
