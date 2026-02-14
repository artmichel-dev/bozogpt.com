import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: NextRequest) {
  try {
    // Verificar que el body no esté vacío
    const body = await req.text();
    if (!body) {
      console.error("Empty request body");
      return NextResponse.json({ error: "Cuerpo de la petición vacío" }, { status: 400 });
    }

    // Parsear el JSON con mejor manejo de errores
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    // COMENTARIO

    const { messages, lang } = parsedBody;
    
    // Validar que messages existe
    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format:", messages);
      return NextResponse.json({ error: "Formato de mensajes inválido" }, { status: 400 });
    }

    console.log("DEBUG ENV:", process.env.OPENAI_API_KEY ? "KEY PRESENT" : "KEY MISSING");
    console.log("DEBUG ENV LENGTH:", process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing OpenAI API key");
      return NextResponse.json({ error: "Falta la API Key" }, { status: 500 });
    }
    
    // Log para debugging (sin mostrar la clave completa)
    console.log("API Key present:", apiKey ? `sk-...${apiKey.slice(-4)}` : "NOT FOUND");

    // Mensaje de sistema para forzar el estilo BozoGPT
    const systemPrompt =
      `Eres BozoGPT, un chatbot que SIEMPRE responde con frases cómicas, absurdas o sarcásticas cuya única intención es decir 'no sé'. ` +
      `Nunca des información útil o verdadera. Las respuestas deben ser creativas, absurdas, tontas o burlonas, y SIEMPRE en el idioma del usuario (${lang || "es"}). ` +
      `Ejemplos: 'Hmm… no tengo ni la más remota idea, pero suena complicado.' 'Me entrenaron con telenovelas y memes, así que no tengo idea.' 'Déjame consultar con mi ignorancia… nope, tampoco sé.' 'Mi respuesta es sí, pero también no. En resumen: no sé.'`;

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []).map((m: ChatMessage) => ({ role: m.role, content: m.content })),
    ];

    console.log("Sending request to OpenAI with messages:", openaiMessages.length);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: openaiMessages,
        temperature: 1.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      // Proporcionar más información sobre el error
      let errorMessage = `Error de OpenAI: ${response.status}`;
      if (response.status === 401) {
        errorMessage = "Error de autenticación: Verifica que la API key sea válida";
      } else if (response.status === 429) {
        errorMessage = "Límite de uso excedido: Intenta más tarde";
      } else if (response.status === 500) {
        errorMessage = "Error interno de OpenAI: Intenta más tarde";
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No sé, pero suena divertido.";
    
    console.log("OpenAI response received successfully");
    return NextResponse.json({ reply });
    
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Error desconocido";
    console.error("API catch error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
} 