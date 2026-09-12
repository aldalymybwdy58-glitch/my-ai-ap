const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", ...CORS },
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
  const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];
  if (!message) return json({ error: "اكتب رسالتك أولًا." }, 400);
  if (!env.AI)
    return json(
      {
        error:
          "Workers AI غير مربوط. أضف binding باسم AI في إعدادات Cloudflare.",
      },
      500
    );
  const messages = [
    {
      role: "system",
      content:
        "أنت Chat AI، مساعد ذكاء اصطناعي عربي احترافي. أجب بدقة ووضوح وبالعربية ما لم يطلب المستخدم لغة أخرى. ساعد في الأسئلة والبرمجة والكتابة والتعلم والتصميم. لا تدّعي تنفيذ شيء لم تنفذه.",
    },
    ...history
      .filter((x) => x && ["user", "assistant"].includes(x.role))
      .map((x) => ({
        role: x.role,
        content: String(x.content || "").slice(0, 8000),
      })),
    { role: "user", content: message },
  ];
  try {
    const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", { messages });
    return json({
      success: true,
      reply:
        result?.response ||
        result?.text ||
        result?.result?.response ||
        result?.choices?.[0]?.message?.content ||
        "لم تصل إجابة.",
    });
  } catch (e) {
    return json({ error: "حدث خطأ أثناء تشغيل الذكاء الاصطناعي." }, 500);
  }
}
async function generateImage(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "الطلب غير صحيح." }, 400);
  }
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) return json({ error: "اكتب وصف الصورة." }, 400);
  if (!env.AI) return json({ error: "Workers AI غير مربوط." }, 500);
  try {
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: prompt.slice(0, 2048),
      steps: 4,
      seed: Math.floor(Math.random() * 1000000000),
    });
    if (!result?.image) return json({ error: "لم يتم إنشاء الصورة." }, 500);
    return json({
      success: true,
      image: `data:image/jpeg;base64,${result.image}`,
    });
  } catch (e) {
    return json({ error: "تعذر إنشاء الصورة حاليًا." }, 500);
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/api/chat" && request.method === "POST")
      return chat(request, env);
    if (url.pathname === "/api/image" && request.method === "POST")
      return generateImage(request, env);
    if (url.pathname === "/api/health")
      return json({
        ok: true,
        app: "chat-ai",
        ai: Boolean(env.AI),
        assets: Boolean(env.ASSETS),
        time: new Date().toISOString(),
      });
    if (url.pathname.startsWith("/api/"))
      return json({ error: "API غير موجود." }, 404);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("ملفات التطبيق غير مربوطة بـ ASSETS.", { status: 503 });
  },
};
