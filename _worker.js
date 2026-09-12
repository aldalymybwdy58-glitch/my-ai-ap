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
    return json({ error: "الطلب غير صحيح." }, 400);
  }

  const message = String(body?.message || "").trim();

  if (!message) {
    return json({ error: "اكتب رسالتك أولًا." }, 400);
  }

  if (!env.AI) {
    return json({
      error: "Workers AI غير مربوط في Cloudflare."
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
              "أنت مساعد الذكاء الاصطناعي الخاص بتطبيق ومنظومة بلا حدود. أجب بالعربية بوضوح وساعد المستخدم في الأسئلة والكتابة والتعلم والبرمجة."
          },
          {
            role: "user",
            content: message
          }
        ]
      }
    );

    return json({
      success: true,
      reply:
        result?.response ||
        result?.text ||
        result?.result?.response ||
        "لم تصل إجابة من الذكاء الاصطناعي."
    });

  } catch (error) {
    return json({
      error: "حدث خطأ أثناء تشغيل الذكاء الاصطناعي."
    }, 500);
  }
}

async function generateImage(request, env) {

  if (!env.AI) {
    return json({
      error: "Workers AI غير مربوط في Cloudflare."
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
        seed: Math.floor(
          Math.random() * 1000000000
        )
      }
    );

    if (!result?.image) {
      return json({
        error: "لم يتم إنشاء الصورة."
      }, 500);
    }

    return json({
      success: true,
