export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const message = body.message;

        if (!message) {
          return Response.json(
            { reply: "اكتب سؤالك أولًا." },
            { status: 400 }
          );
        }

        if (!env.OPENAI_API_KEY) {
          return Response.json(
            { reply: "خطأ: مفتاح OPENAI_API_KEY غير موجود في Cloudflare." },
            { status: 500 }
          );
        }

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: message
                }
              ]
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const errorMessage =
            data?.error?.message || `HTTP ${response.status}`;

          return Response.json(
            { reply: `خطأ OpenAI: ${errorMessage}` },
            { status: 500 }
          );
        }

        const reply =
          data.choices?.[0]?.message?.content ||
          "لم تصل إجابة.";

        return Response.json({ reply });

      } catch (error) {
        return Response.json(
          { reply: "حدث خطأ في الخادم." },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
