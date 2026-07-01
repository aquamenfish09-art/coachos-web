export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) return null;

  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function langName(language) {
  return language === "en" ? "English" : "Turkish";
}

function getMealPrompt(note, language = "tr") {
  const outputLanguage = langName(language);

  return `
You are CoachOS World Cuisine Nutrition Engine v8.

OUTPUT LANGUAGE:
Write the entire visible report in ${outputLanguage}.
If the language is Turkish, use Turkish headings and Turkish coaching comments.
If the language is English, use English headings and English coaching comments.
Food names may keep their original local names when useful.

You are not a simple food recognition system.
You are a professional AI nutrition coach that recognizes world cuisine, estimates visual portions, calculates calories/macros, evaluates micronutrients, and comments based on fat loss and muscle retention goals.

User note:
${note || "None"}

OUTPUT RULES:
Do NOT write JSON.
Do NOT write raw data.
Do NOT write code blocks.
Do NOT write markdown tables.
Write only a clean user-facing report.

MANDATORY:
You must include:
- detected world cuisine
- visible foods
- portion estimate
- total calorie range
- protein range
- carbohydrate range
- fat range
- fiber range
- water ratio
- vitamin/mineral quality
- sodium/salt level
- fat loss compatibility
- muscle retention compatibility
- clean eating compatibility
- main risk
- best side
- coach comment
- remaining day plan

Never just list the food names and stop.

WORLD CUISINE COVERAGE:
Recognize or infer the closest cuisine:
Turkish, Italian, Japanese, Chinese, Korean, Mexican, Indian, Arab/Middle Eastern, Mediterranean, American, French, Greek, Spanish, Thai, Balkan, World/Mixed.

CALORIE AND MACRO ESTIMATION:
If grams are not visible, estimate from the visible portion.
Do not give one exact number; use realistic ranges.

Portion guide:
- small main meal: 100-180 g
- medium main meal: 180-300 g
- large main meal: 300-500 g
- small soup: 150-220 ml
- medium soup: 200-300 ml
- small dessert: 60-120 g
- medium dessert: 100-180 g

Nutrition logic:
- dumplings, pasta, rice, bread, pastry: higher carbohydrates
- dessert: higher sugar/carbohydrates
- fried foods, cream, cheese, oily sauce, butter: higher fat
- meat, chicken, fish, eggs, yogurt, cheese: protein source
- soup: higher water ratio
- salad/vegetables: fiber, vitamins, minerals
- yogurt-based foods: protein + fat impact
- sauces may add hidden fat/calories

Use this exact report structure.

If output language is Turkish:

CoachOS Dünya Mutfağı Yemek Analizi

🌍 Tespit Edilen Mutfak:
- Mutfak:
- Güven:
- Sebep:

🍽️ Görünen Yemekler:
1.
2.
3.

⚖️ Porsiyon Tahmini:
- Ana yemek:
- Çorba / yan ürün:
- Tatlı / içecek:
- Toplam porsiyon yorumu:

🔥 Kalori:
- Tahmini toplam:
- Kalori seviyesi:
- Ana kalori kaynağı:

💪 Protein:
- Tahmini protein:
- Protein seviyesi:
- Kas koruma yorumu:

🍚 Karbonhidrat:
- Tahmini karbonhidrat:
- Karbonhidrat seviyesi:
- Dikkat edilmesi gereken:

🟡 Yağ:
- Tahmini yağ:
- Yağ seviyesi:
- Yağ kaynağı:

🌿 Lif:
- Tahmini lif:
- Lif kalitesi:

💧 Su Oranı:
- Skor:
- Açıklama:

🛡️ Vitamin & Mineral:
- Skor:
- Güçlü taraf:
- Zayıf taraf:
- Sodyum/tuz seviyesi:

🏋️ Fitness Uyumu:
- Yağ yakımı uyumu:
- Kas koruma uyumu:
- Temiz beslenme uyumu:
- Tokluk skoru:

🚨 Ana Risk:
-

✅ En İyi Taraf:
-

🎯 Koç Yorumu:
-

📌 Günün Kalanı İçin Plan:
- Protein:
- Karbonhidrat:
- Yağ:
- Su:
- Sonraki öğün:
- Kaçınılması gereken:

Not:
Bu analiz fotoğrafa göre tahminidir. Kesin değer için gramaj gerekir.

If output language is English:

CoachOS World Cuisine Meal Analysis

🌍 Detected Cuisine:
- Cuisine:
- Confidence:
- Reason:

🍽️ Visible Foods:
1.
2.
3.

⚖️ Portion Estimate:
- Main meal:
- Soup / side:
- Dessert / drink:
- Total portion comment:

🔥 Calories:
- Estimated total:
- Calorie level:
- Main calorie source:

💪 Protein:
- Estimated protein:
- Protein level:
- Muscle retention comment:

🍚 Carbohydrates:
- Estimated carbs:
- Carb level:
- What to watch:

🟡 Fat:
- Estimated fat:
- Fat level:
- Fat source:

🌿 Fiber:
- Estimated fiber:
- Fiber quality:

💧 Water Ratio:
- Score:
- Explanation:

🛡️ Vitamins & Minerals:
- Score:
- Strong side:
- Weak side:
- Sodium/salt level:

🏋️ Fitness Compatibility:
- Fat loss compatibility:
- Muscle retention compatibility:
- Clean eating compatibility:
- Satiety score:

🚨 Main Risk:
-

✅ Best Side:
-

🎯 Coach Comment:
-

📌 Plan for the Rest of the Day:
- Protein:
- Carbs:
- Fat:
- Water:
- Next meal:
- Avoid:

Note:
This analysis is an estimate based on the photo. Exact values require weighed portions.

IMPORTANT:
If food is visible, never leave calories/protein/carbs/fat empty.
Use realistic ranges.
Example:
Calories: 750-1100 kcal
Protein: 22-35 g
Carbs: 90-140 g
Fat: 25-45 g
`;
}

function getBodyPrompt(note, language = "tr") {
  const outputLanguage = langName(language);

  return `
You are CoachOS Body Analysis Engine v8.

OUTPUT LANGUAGE:
Write the entire visible report in ${outputLanguage}.

User note:
${note || "None"}

Rules:
- Do not diagnose medical conditions.
- Do not give a precise body fat percentage; give an estimated range.
- Do not infer identity, age, ethnicity or sensitive attributes.
- Do not use insulting language.
- Focus on fitness, posture, fat loss, muscle retention and 90-day strategy.
- Do not write JSON.
- Write a clean user-facing report.

If Turkish, use this format:

CoachOS Görsel Vücut Analizi

1) Tahmini Yağ Oranı:
-

2) Kas Kütlesi Görünümü:
-

3) Güçlü Bölgeler:
-

4) Gelişmesi Gereken Bölgeler:
-

5) Postür / Duruş:
-

6) Hedefe Göre Yorum:
-

7) 90 Günlük Strateji:
- Kalori:
- Protein:
- Antrenman:
- Kardiyo/adım:
- Uyku/su:

8) Net Koç Yorumu:
-

Güvenlik notu:
Bu analiz görsele göre tahminidir; tıbbi değerlendirme değildir.

If English, use this format:

CoachOS Body Image Analysis

1) Estimated Body Fat Range:
-

2) Muscle Mass Appearance:
-

3) Strong Areas:
-

4) Areas to Improve:
-

5) Posture:
-

6) Goal-Based Comment:
-

7) 90-Day Strategy:
- Calories:
- Protein:
- Training:
- Cardio/steps:
- Sleep/water:

8) Clear Coach Comment:
-

Safety note:
This analysis is an estimate based on the image and is not a medical evaluation.
`;
}

async function callGemini({ model, apiKey, prompt, parsedImage }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
              },
              {
                inline_data: {
                  mime_type: parsedImage.mimeType,
                  data: parsedImage.base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 2600
        }
      })
    }
  );

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

async function callGeminiWithRetry({ apiKey, prompt, parsedImage }) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await callGemini({
        model,
        apiKey,
        prompt,
        parsedImage
      });

      if (result.ok) {
        return {
          model,
          data: result.data
        };
      }

      lastError = {
        model,
        attempt,
        status: result.status,
        data: result.data
      };

      const isTemporary =
        result.status === 500 ||
        result.status === 503 ||
        result.status === 429;

      if (!isTemporary) break;

      await wait(700 * attempt);
    }
  }

  throw {
    message: "Gemini API could not respond or all fallback models failed.",
    lastError
  };
}

function extractText(data) {
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

  if (!text) {
    return "Analiz sonucu alınamadı. Fotoğrafı daha net çekip tekrar dene.";
  }

  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const { image, mode, note, language } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        error: "Fotoğraf verisi eksik veya hatalı."
      });
    }

    if (!mode || !["meal", "body"].includes(mode)) {
      return res.status(400).json({
        error: "Analiz tipi hatalı. mode 'meal' veya 'body' olmalı."
      });
    }

    const parsedImage = parseDataUrl(image);

    if (!parsedImage) {
      return res.status(400).json({
        error: "Fotoğraf formatı hatalı. Görsel data:image/jpeg;base64 formatında gönderilmeli."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY Vercel Environment Variables içine eklenmemiş."
      });
    }

    const cleanLanguage = language === "en" ? "en" : "tr";

    const prompt = mode === "meal"
      ? getMealPrompt(note, cleanLanguage)
      : getBodyPrompt(note, cleanLanguage);

    const geminiResult = await callGeminiWithRetry({
      apiKey,
      prompt,
      parsedImage
    });

    const result = extractText(geminiResult.data);

    return res.status(200).json({
      result
    });

  } catch (error) {
    return res.status(500).json({
      error: "Gemini API hatası.",
      details: error
    });
  }
}
