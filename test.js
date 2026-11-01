import { config } from './src/config.js';

async function testModels() {
  const apiKey = config.gemini.apiKey;
  const modelsToTry = [
    'gemini-3.8-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
  ];

  console.log('Testing models with your API key...\n');

  for (const model of modelsToTry) {
    process.stdout.write(`Trying "${model}"... `);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Say HELLO' }] }],
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        console.log(`✅ SUCCESS! (${text})`);
        console.log(`\n==============================================`);
        console.log(`🎯 WORKING MODEL FOUND: ${model}`);
        console.log(`👉 Put this in your .env: GEMINI_MODEL=${model}`);
        console.log(`==============================================\n`);
        return model;
      } else {
        const msg = data.error?.message?.split('.')[0] || `Status ${res.status}`;
        console.log(`❌ Failed (${msg})`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }
}

testModels();
