export const config = { runtime: 'edge' };

// 🔑 Clé API Groq (gratuite : https://console.groq.com/keys)
const GROQ_API_KEY = process.env.GROQ_API_KEY || "gsk_XXXX_REMPLACE_MOI";

// 🧠 Modèle le plus performant disponible (équivalent GPT-4)
// Alternatives : "llama-3.1-70b-versatile", "mixtral-8x7b-32768"
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Tu es une IA experte, précise et performante. 
Tu réponds de manière claire, structurée et rigoureuse.
Tu utilises le markdown quand c'est pertinent (code, listes, titres).
Tu ne refuses jamais une question légitime et tu fournis toujours la meilleure réponse possible.`;

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST uniquement' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { messages, prompt, stream = true } = body;

    // Accepte soit "messages" (array) soit "prompt" (string simple)
    let finalMessages = [];
    if (Array.isArray(messages)) {
      finalMessages = messages;
    } else if (typeof prompt === 'string') {
      finalMessages = [{ role: 'user', content: prompt }];
    } else {
      return new Response(JSON.stringify({ error: 'Fournis "messages" (array) ou "prompt" (string)' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    if (!GROQ_API_KEY || GROQ_API_KEY.includes("REMPLACE_MOI")) {
      return new Response(JSON.stringify({
        error: 'Clé API non configurée. Ajoute GROQ_API_KEY (https://console.groq.com/keys)'
      }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const apiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...finalMessages],
        stream,
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.95,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return new Response(JSON.stringify({ error: `Groq ${apiRes.status}: ${errText}` }), {
        status: apiRes.status, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // Mode stream (SSE)
    if (stream) {
      return new Response(apiRes.body, {
        headers: {
          ...cors,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Mode non-stream : renvoie juste la réponse texte
    const data = await apiRes.json();
    return new Response(JSON.stringify({
      text: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
    }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
  }
