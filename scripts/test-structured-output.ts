import OpenAI from 'openai';

function extractStructuredOutput(response: Awaited<ReturnType<OpenAI['responses']['create']>>): unknown {
  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    try {
      return JSON.parse(response.output_text);
    } catch {
      return response.output_text;
    }
  }

  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (!item || typeof item !== 'object') continue;

      if ('type' in item && item.type === 'output_text' && typeof (item as { text?: string }).text === 'string') {
        const text = (item as { text: string }).text;
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }

      const content = (item as { content?: Array<Record<string, unknown>> }).content;
      if (!Array.isArray(content)) continue;

      for (const part of content) {
        if (!part) continue;
        const type = typeof part.type === 'string' ? part.type : undefined;
        if (!type) continue;

        if ((type === 'output_text' || type === 'text') && typeof part.text === 'string') {
          try {
            return JSON.parse(part.text);
          } catch {
            return part.text;
          }
        }

        if (type.startsWith('json')) {
          if (typeof part.json === 'string') {
            try {
              return JSON.parse(part.json);
            } catch {
              return part.json;
            }
          }
          if (part.json && typeof part.json === 'object') {
            return part.json;
          }
          if (typeof part.output === 'string') {
            try {
              return JSON.parse(part.output);
            } catch {
              return part.output;
            }
          }
        }
      }
    }
  }

  return null;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required to run this script.');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const schema = {
    type: 'object',
    properties: {
      location: { type: 'string' },
      outlook: { type: 'string' },
      highFahrenheit: { type: 'integer' },
      lowFahrenheit: { type: 'integer' },
      safetyNote: { type: 'string' },
    },
    required: ['location', 'outlook', 'highFahrenheit', 'lowFahrenheit', 'safetyNote'],
    additionalProperties: false,
  };

  const model = process.env.STRUCTURED_MODEL ?? 'gpt-4o-2024-08-06';

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'developer',
        content: [{ type: 'input_text', text: 'Return ONLY JSON that matches the provided schema.' }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Provide a concise weekend weather briefing for Louisville, KY that includes the overall outlook, expected high and low temperatures (in Fahrenheit), and one short safety or preparedness note.',
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'weekend_weather_report',
        strict: true,
        schema,
      },
    },
    max_output_tokens: 400,
  });

  console.log('--- Raw response metadata ---');
  console.dir(
    {
      id: response.id,
      model: response.model,
      usage: response.usage,
      outputCount: Array.isArray(response.output) ? response.output.length : 0,
      status: (response as { status?: unknown }).status,
    },
    { depth: null }
  );

  console.log('\n--- Raw response.output ---');
  if (Array.isArray(response.output)) {
    response.output.forEach((item, index) => {
      console.log(`output[${index}] =>`);
      console.dir(item, { depth: null });
    });
  } else {
    console.dir(response.output, { depth: null });
  }

  const structured = extractStructuredOutput(response);
  console.log('\n--- Parsed structured output ---');
  console.dir(structured, { depth: null });

  if (structured === null) {
    console.warn('\n⚠️  Structured payload not found. If the response only contains reasoning tokens, try using a non-reasoning model, e.g.\n   STRUCTURED_MODEL=gpt-4o-mini bun run test-structured-output');
  }
}

main().catch(error => {
  console.error('\nStructured output test failed:\n', error);
  process.exit(1);
});
