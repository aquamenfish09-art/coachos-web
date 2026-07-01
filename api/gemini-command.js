export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const { command, profile, targets, language } = req.body || {};

    if (!command) {
      return res.status(400).json({
        error: "Komut gerekli."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY Vercel Environment Variables içine eklenmemiş."
      });
    }

    const outputLanguage = language === "en" ? "English" : "Turkish";

    const prompt = `
You are the voice/text command engine of the CoachOS app.

Analyze the user's command and return only valid JSON.

Response language:
${outputLanguage}

User command:
"${command}"

User profile:
${JSON.stringify(profile || {}, null, 2)}

Targets:
${JSON.stringify(targets || {}, null, 2)}

Available pages:
- panel
- profil
- yemek
- vucut
- hafiza
- antrenman
- motivasyon
- rapor

Supported action values:
- open_page
- create_workout
- motivate
- show_memory
- show_report
- profile
- unknown

Rules:
- Return only valid JSON.
- Do not explain.
- If the user greets, action "open_page", page "panel".
- If the user says they do not want to train, action "motivate".
- If the user mentions meal, food, calories, plate, photo, nutrition analysis, action "open_page", page "yemek".
- If the user mentions body, body fat, physique, form, body photo, action "open_page", page "vucut".
- If the user mentions memory, previous analyses, history, action "show_memory".
- If the user mentions workout, training plan, gym program, action "create_workout".
- If the user mentions report, score, daily status, action "show_report".
- If the user mentions profile, height, weight, age, action "open_page", page "profil".
- The message field must be in ${outputLanguage}.

JSON format:
{
  "action": "open_page",
  "page": "panel",
  "message": "Short response in selected language"
}
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(500).json({
        error: "Gemini API hatası.",
        details: data
      });
    }

    const raw =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "{}";

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        action: "unknown",
        page: "panel",
        message: language === "en" ? "I could not understand the command." : "Komut anlaşılamadı."
      };
    }

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: "Sunucu hatası.",
      details: error.message
    });
  }
}
