const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...CORS
    }
  });
}

async function chat(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({ reply: "الطلب غير صحيح." }, 400);
  }

  const message = String(body?.message || "").trim();

  if (!message) {
    return json({ reply: "اكتب رسالتك أولًا." }, 400);
  }

  if (!env.AI) {
    return json({
      reply: "التطبيق يعمل، لكن Workers AI غير مربوط بعد في Cloudflare."
    }, 500);
  }

  try {
    const result = await env.AI.run(
      "@cf/zai-org/glm-4.7-flash",
      {
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد ذكاء اصطناعي عربي. أجب بالعربية بوضوح ومساعدة، ويمكنك استخدام الإنجليزية عند الحاجة."
          },
          {
            role: "user",
            content: message
          }
        ]
      }
    );

    return json({
      reply:
        result?.response ||
        result?.text ||
        result?.result?.response ||
        "لم تصل إجابة من الذكاء الاصطناعي."
    });
  } catch (error) {
    return json({
      reply: "حدث خطأ أثناء تشغيل الذكاء الاصطناعي."
    }, 500);
  }
}

async function generateImage(request, env) {
  if (!env.AI) {
    return json({
      error: "Workers AI غير مربوط."
    }, 500);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      error: "الطلب غير صحيح."
    }, 400);
  }

  const prompt = String(body?.prompt || "").trim();

  if (!prompt) {
    return json({
      error: "اكتب وصف الصورة."
    }, 400);
  }

  try {
    const result = await env.AI.run(
      "@cf/black-forest-labs/flux-1-schnell",
      {
        prompt,
        steps: 4,
        seed: Math.floor(Math.random() * 1000000000)
      }
    );

    if (!result?.image) {
      return json({
        error: "لم يتم إنشاء الصورة."
      }, 500);
    }

    return json({
      success: true,
      image: `data:image/jpeg;base64,${result.image}`
    });
  } catch (error) {
    return json({
      error: "تعذر إنشاء الصورة حاليًا."
    }, 500);
  }
}

async function api(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS
    });
  }

  if (url.pathname === "/api/chat") {
    if (request.method !== "POST") {
      return json({ error: "استخدم POST." }, 405);
    }

    return chat(request, env);
  }

  if (url.pathname === "/api/image") {
    if (request.method !== "POST") {
      return json({ error: "استخدم POST." }, 405);
    }

    return generateImage(request, env);
  }

  if (url.pathname === "/api/health") {
    return json({
      ok: true,
      app: "my-ai-ap",
      ai: Boolean(env.AI),
      assets: Boolean(env.ASSETS),
      time: new Date().toISOString()
    });
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const response = await api(request, env);

      if (response) {
        return response;
      }

      return json({
        error: "API غير موجود."
      }, 404);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "خطأ: ملفات التطبيق غير مربوطة بـ ASSETS.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
};
