export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const { command, profile, targets, language } = req.body || {};

    if (!command || typeof command !== "string") {
      return res.status(400).json({
        error: "Komut gerekli."
      });
    }

    const cleanLanguage = language === "en" ? "en" : "tr";

    const localResult = parseCommandLocally(command, cleanLanguage);

    if (localResult.confidence >= 0.8) {
      return res.status(200).json(localResult.response);
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        action: "unknown",
        page: "panel",
        message: cleanLanguage === "en"
          ? "I could not understand the command clearly, but the system is still running."
          : "Komutu net anlayamadım ama sistem çalışıyor."
      });
    }

    const aiResult = await parseCommandWithGemini({
      apiKey,
      command,
      profile,
      targets,
      language: cleanLanguage
    });

    return res.status(200).json(aiResult);

  } catch (error) {
    return res.status(200).json({
      action: "unknown",
      page: "panel",
      message: "Komut işlenirken sorun oldu ama sistem durmadı.",
      details: typeof error?.message === "string" ? error.message : "Bilinmeyen hata"
    });
  }
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("İ", "i")
    .replaceAll("I", "i")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, words) {
  return words.some(word => text.includes(normalizeText(word)));
}

function buildResponse({ action, page, messageTr, messageEn, language }) {
  return {
    action,
    page,
    message: language === "en" ? messageEn : messageTr
  };
}

function parseCommandLocally(command, language = "tr") {
  const text = normalizeText(command);

  const greetingWords = [
    "selam", "merhaba", "hey", "hello", "hi", "good morning", "good evening"
  ];

  const mealWords = [
    "yemek", "ogun", "öğün", "beslenme", "kalori", "tabak", "food",
    "meal", "nutrition", "calorie", "plate", "macro", "protein"
  ];

  const bodyWords = [
    "vucut", "vücut", "body", "form", "fizik", "physique", "yag orani",
    "yağ oranı", "gobek", "göbek", "bel", "body fat"
  ];

  const memoryWords = [
    "hafiza", "hafıza", "gecmis", "geçmiş", "kayit", "kayıt",
    "memory", "history", "records", "previous"
  ];

  const reportWords = [
    "rapor", "skor", "gunluk durum", "günlük durum", "report",
    "score", "daily report", "daily status"
  ];

  const profileWords = [
    "profil", "profile", "boy", "kilo", "yas", "yaş", "height",
    "weight", "age", "hedef", "goal"
  ];

  const workoutWords = [
    "antrenman", "antreman", "spor", "program", "egzersiz", "workout",
    "training", "gym", "exercise", "plan olustur", "program olustur",
    "create workout", "training plan"
  ];

  const motivationWords = [
    "motivasyon", "motive", "motive et", "motivate", "motivate me",
    "istemiyorum", "spora gitmek istemiyorum", "yorgunum", "usendim",
    "üşendim", "canim istemiyor", "canım istemiyor", "i dont want",
    "i don't want", "tired", "no motivation", "lazy"
  ];

  const panelWords = [
    "panel", "dashboard", "ana sayfa", "anasayfa", "home", "main screen"
  ];

  const openWords = [
    "ac", "aç", "git", "goster", "göster", "open", "show", "go"
  ];

  if (hasAny(text, motivationWords)) {
    return {
      confidence: 0.98,
      response: buildResponse({
        action: "motivate",
        page: "motivasyon",
        language,
        messageTr: "Motivasyon modunu açıyorum. Bugün amaç mükemmel olmak değil, zinciri kırmamak.",
        messageEn: "Opening motivation mode. Today is not about perfection; it is about not breaking the chain."
      })
    };
  }

  if (hasAny(text, mealWords)) {
    return {
      confidence: 0.95,
      response: buildResponse({
        action: "open_page",
        page: "yemek",
        language,
        messageTr: "Yemek analiz ekranını açıyorum.",
        messageEn: "Opening meal analysis."
      })
    };
  }

  if (hasAny(text, bodyWords)) {
    return {
      confidence: 0.95,
      response: buildResponse({
        action: "open_page",
        page: "vucut",
        language,
        messageTr: "Vücut analiz ekranını açıyorum.",
        messageEn: "Opening body analysis."
      })
    };
  }

  if (hasAny(text, memoryWords)) {
    return {
      confidence: 0.95,
      response: buildResponse({
        action: "show_memory",
        page: "hafiza",
        language,
        messageTr: "Hafızanı açıyorum.",
        messageEn: "Opening your memory."
      })
    };
  }

  if (hasAny(text, workoutWords)) {
    return {
      confidence: 0.95,
      response: buildResponse({
        action: "create_workout",
        page: "antrenman",
        language,
        messageTr: "Antrenman programını oluşturuyorum.",
        messageEn: "Creating your workout program."
      })
    };
  }

  if (hasAny(text, reportWords)) {
    return {
      confidence: 0.95,
      response: buildResponse({
        action: "show_report",
        page: "rapor",
        language,
        messageTr: "Rapor ekranını açıyorum.",
        messageEn: "Opening your report."
      })
    };
  }

  if (hasAny(text, profileWords)) {
    return {
      confidence: 0.95,
      response: buildResponse({
        action: "open_page",
        page: "profil",
        language,
        messageTr: "Profil ekranını açıyorum.",
        messageEn: "Opening your profile."
      })
    };
  }

  if (hasAny(text, panelWords) || hasAny(text, greetingWords)) {
    return {
      confidence: 0.9,
      response: buildResponse({
        action: "open_page",
        page: "panel",
        language,
        messageTr: "Panel ekranını açıyorum.",
        messageEn: "Opening dashboard."
      })
    };
  }

  if (hasAny(text, openWords)) {
    return {
      confidence: 0.35,
      response: buildResponse({
        action: "unknown",
        page: "panel",
        language,
        messageTr: "Hangi ekranı açmam gerektiğini net anlayamadım.",
        messageEn: "I could not clearly understand which screen to open."
      })
    };
  }

  return {
    confidence: 0.2,
    response: buildResponse({
      action: "unknown",
      page: "panel",
      language,
      messageTr: "Komutu net anlayamadım. Örnek: Yemek analizi aç, Hafızamı göster, Antrenman oluştur.",
      messageEn: "I could not understand the command clearly. Example: Open meal analysis, Show my memory, Create workout."
    })
  };
}

async function parseCommandWithGemini({ apiKey, command, profile, targets, language }) {
  const outputLanguage = language === "en" ? "English" : "Turkish";

  const prompt = `
You are the command router of the CoachOS fitness app.

Your job:
Understand the user's text or voice command and return only valid JSON.

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

Supported actions:
- open_page
- create_workout
- motivate
- show_memory
- show_report
- unknown

Routing rules:
- Meal, food, calories, nutrition, plate, macro, protein → open_page / yemek
- Body, physique, body fat, waist, belly, form → open_page / vucut
- Memory, history, previous analyses, saved records → show_memory / hafiza
- Workout, training plan, gym program, exercise → create_workout / antrenman
- Motivation, tired, don't want to train, lazy, no discipline → motivate / motivasyon
- Report, score, daily status → show_report / rapor
- Profile, height, weight, age, goal → open_page / profil
- Greeting or dashboard request → open_page / panel

Important:
Return only valid JSON.
Do not use markdown.
Do not explain.
Do not include extra text.
The message field must be in ${outputLanguage}.

Required JSON:
{
  "action": "open_page",
  "page": "panel",
  "message": "Short response in selected language"
}
`;

  try {
    const response = await fetch(
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
            temperature: 0.05,
            maxOutputTokens: 600,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        action: "unknown",
        page: "panel",
        message: language === "en"
          ? "The command engine could not respond right now."
          : "Komut motoru şu an cevap veremedi."
      };
    }

    const raw =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim() || "{}";

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        action: "unknown",
        page: "panel",
        message: language === "en"
          ? "I could not understand the command clearly."
          : "Komutu net anlayamadım."
      };
    }

    return sanitizeCommandResponse(parsed, language);

  } catch {
    return {
      action: "unknown",
      page: "panel",
      message: language === "en"
        ? "The command system is temporarily unavailable."
        : "Komut sistemi geçici olarak kullanılamıyor."
    };
  }
}

function sanitizeCommandResponse(parsed, language = "tr") {
  const allowedActions = [
    "open_page",
    "create_workout",
    "motivate",
    "show_memory",
    "show_report",
    "unknown"
  ];

  const allowedPages = [
    "panel",
    "profil",
    "yemek",
    "vucut",
    "hafiza",
    "antrenman",
    "motivasyon",
    "rapor"
  ];

  const action = allowedActions.includes(parsed?.action)
    ? parsed.action
    : "unknown";

  let page = allowedPages.includes(parsed?.page)
    ? parsed.page
    : "panel";

  if (action === "create_workout") page = "antrenman";
  if (action === "motivate") page = "motivasyon";
  if (action === "show_memory") page = "hafiza";
  if (action === "show_report") page = "rapor";

  const fallbackMessage = language === "en"
    ? "Command received."
    : "Komut alındı.";

  const message =
    typeof parsed?.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : fallbackMessage;

  return {
    action,
    page,
    message
  };
}
