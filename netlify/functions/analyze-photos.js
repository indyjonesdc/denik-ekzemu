// Netlify serverless function – AI analýza fotek ekzému
// Endpoint: /.netlify/functions/analyze-photos

exports.handler = async (event) => {
  // CORS headers
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

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'API klíč není nastaven. Přidejte ANTHROPIC_API_KEY v Netlify Site settings → Environment variables.',
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
      // Anthropic supports: image/jpeg, image/png, image/gif, image/webp
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (mediaType === 'image/jpg') mediaType = 'image/jpeg';
      if (!allowed.includes(mediaType)) {
        throw new Error(`Nepodporovaný formát fotky: ${mediaType}. Použijte JPEG, PNG, GIF nebo WebP.`);
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

    const prompt = `Tyto dvě fotografie zobrazují ekzém dítěte. ${childInfo}

První fotka je STARŠÍ (pořízena ${date2 || 'dříve'}).
Druhá fotka je NOVĚJŠÍ (pořízena ${date1 || 'nyní'}).

Prosím porovnej obě fotografie a odpověz v češtině podle této struktury:

**🔍 Celkový vývoj**
Krátké hodnocení v jedné větě: zlepšení, zhoršení, nebo stabilní stav.

**📍 Konkrétní pozorování**
- Kde přesně na těle vidíš změny (tváře, lokty, záda…)
- Velikost a rozsah postižených ploch
- Intenzita zarudnutí a podráždění
- Stav kůže (suchá, šupinatá, mokvavá, hojící se)

**💡 Doporučení**
2–3 konkrétní rady co dál sledovat nebo na co se zaměřit.

⚠️ Poznámka: Toto není lékařská diagnóza. Při jakémkoli zhoršení nebo pochybnostech kontaktujte dermatologa.

Buď konkrétní, ale citlivý – jde o malé dítě a starostlivého rodiče.`;

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: p2.mediaType, data: p2.data } },
              { type: 'image', source: { type: 'base64', media_type: p1.mediaType, data: p1.data } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      // Try to parse error to give user a useful message
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.error?.message || parsed.message || errText;
      } catch {}
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: `Anthropic API (${response.status}): ${detail.substring(0, 300)}`,
        }),
      };
    }

    const result = await response.json();
    const analysis = result.content?.map((c) => c.text || '').join('') || 'Analýza se nezdařila.';

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
