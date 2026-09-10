export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // السماح لـ GitHub Pages بالاتصال
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://aldalymybwdy58-glitch.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const message = body.message;

        if (!message) {
          return Response.json(
            { reply: "اكتب سؤالك أولًا." },
            {
              status: 400,
              headers: corsHeaders
            }
          );
        }

        if (!env.OPENAI_API_KEY) {
          return Response.json(
            { reply: "مفتاح OpenAI غير موجود في Cloudflare." },
            {
              status: 500,
              headers: corsHeaders
            }
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
          return Response.json(
            {
              reply:
                data?.error?.message ||
                `خطأ OpenAI: HTTP ${response.status}`
            },
            {
              status: 500,
              headers: corsHeaders
            }
          );
        }

        const reply =
          data.choices?.[0]?.message?.content ||
          "لم تصل إجابة.";

        return Response.json(
          { reply },
          {
            headers: corsHeaders
          }
        );

      } catch (error) {
        return Response.json(
          { reply: "حدث خطأ في الخادم." },
          {
            status: 500,
            headers: corsHeaders
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
