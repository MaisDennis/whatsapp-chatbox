import { NextRequest, NextResponse } from 'next/server';
import { Twilio } from 'twilio';
import OpenAI from 'openai';

// Helper function to parse the URL-encoded form data
async function parseFormData(req: NextRequest) {
  const bodyText = await req.text();
  console.log('Request body (raw text):', bodyText); // Log the raw incoming request body
  const params = new URLSearchParams(bodyText);
  const parsedBody: { [key: string]: string } = {};
  Array.from(params.entries()).forEach(([key, value]) => {
    parsedBody[key] = value;
  });
  console.log('Parsed form data:', parsedBody); // Log the parsed form data
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
    // Log environment variables to verify they're loaded correctly (without revealing sensitive info)
    console.log('TWILIO_ACCOUNT_SID loaded:', !!process.env.TWILIO_ACCOUNT_SID);
    console.log('TWILIO_AUTH_TOKEN loaded:', !!process.env.TWILIO_AUTH_TOKEN);
    console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
    console.log('TWILIO_WHATSAPP_NUMBER loaded:', process.env.TWILIO_WHATSAPP_NUMBER);

    // Parse the URL-encoded form data from Twilio's webhook
    const body = await parseFormData(req);
    const { Body, From } = body; // "Body" is the WhatsApp message, "From" is the sender

    console.log('Incoming WhatsApp message:', Body);
    console.log('Message received from:', From);

    // Call OpenAI API to generate a response based on the message
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: Body }],
    });

    console.log('OpenAI response:', openaiResponse); // Log the OpenAI response

    const reply = openaiResponse.choices[0].message?.content || 'Sorry, I could not process that.';

    console.log('Reply to be sent via WhatsApp:', reply);

    // Use Twilio to send the reply back via WhatsApp
    const twilioResponse = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: From,
      body: reply,
    });

    console.log('Twilio message response:', twilioResponse); // Log the response from Twilio API

    return NextResponse.json({ message: 'Message sent!' }, { status: 200 });
  } catch (error) {
    console.error('Error processing message:', error); // Log any error that occurs
    return NextResponse.json({ message: 'Error processing the message' }, { status: 500 });
  }
}
