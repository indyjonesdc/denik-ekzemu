// Netlify serverless function – AI analýza fotek ekzému přes Google Gemini
// Endpoint: /.netlify/functions/analyze-photos
// Free tier: 1000 requests/day s Gemini 2.5 Flash

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check API key (Gemini)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'API klíč Gemini není nastaven. Přidejte GEMINI_API_KEY v Netlify Site settings → Environment variables. Klíč získáte zdarma na https://aistudio.google.com/apikey',
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { photo1, photo2, date1, date2, childAge, childName } = body;

    if (!photo1 || !photo2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Chybí fotky' }),
      };
    }

    // Extract base64 data and media type
    const extract = (dataUrl) => {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error('Neplatný formát fotky (chybí data URL prefix)');
      let mediaType = match[1].toLowerCase().trim();
      if (mediaType === 'image/jpg') mediaType = 'image/jpeg';
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      if (!allowed.includes(mediaType)) {
        throw new Error(`Nepodporovaný formát fotky: ${mediaType}`);
      }
      const data = match[2];
      if (!data || data.length < 100) {
        throw new Error('Fotka je prázdná nebo poškozená');
      }
      return { mediaType, data };
    };

    let p1, p2;
    try {
      p1 = extract(photo1);
      p2 = extract(photo2);
    } catch (err) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: err.message }),
      };
    }

    // Build prompt
    const childInfo = childName || childAge
      ? `Jde o dítě${childName ? ' jménem ' + childName : ''}${childAge ? ' (věk ' + childAge + ')' : ''}.`
      : '';

    const prompt = `Jsi pomocný asistent pro rodiče dítěte s ekzémem. Vidíš dvě fotografie ekzému stejného dítěte. ${childInfo}

První fotka (image_1) je STARŠÍ (pořízena ${date2 || 'dříve'}).
Druhá fotka (image_2) je NOVĚJŠÍ (pořízena ${date1 || 'nyní'}).

Pečlivě obě fotky porovnej a odpověz česky podle této struktury:

**🔍 Celkový vývoj**
Jednou větou: zlepšení, zhoršení, nebo stabilní stav.

**📍 Konkrétní pozorování**
- Kde přesně na těle vidíš změny (tváře, lokty, záda, ...)
- Velikost a rozsah postižených ploch
- Intenzita zarudnutí a podráždění
- Stav kůže (suchá, šupinatá, mokvavá, hojící se)

**💡 Doporučení**
2–3 konkrétní rady co dál sledovat nebo na co se zaměřit.

⚠️ Toto není lékařská diagnóza. Při zhoršení nebo pochybnostech kontaktujte dermatologa.

Buď konkrétní, ale citlivý – jde o malé dítě a starostlivého rodiče.`;

    // Call Google Gemini API
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'image_1 (starší fotka):' },
            { inline_data: { mime_type: p2.mediaType, data: p2.data } },
            { text: 'image_2 (novější fotka):' },
            { inline_data: { mime_type: p1.mediaType, data: p1.data } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.error?.message || parsed.message || errText;
      } catch {}
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: `Gemini API (${response.status}): ${detail.substring(0, 400)}`,
        }),
      };
    }

    const result = await response.json();
    let analysis = '';
    try {
      analysis = result.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    } catch {}

    if (!analysis) {
      console.error('Empty Gemini response:', JSON.stringify(result));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Gemini vrátil prázdnou odpověď. Možná byly fotky zablokovány safety filtrem.',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Chyba serveru: ' + err.message }),
    };
  }
};
