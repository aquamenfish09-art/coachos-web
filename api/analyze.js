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

function cleanLanguage(language) {
  return language === "en" ? "en" : "tr";
}

function langName(language) {
  return cleanLanguage(language) === "en" ? "English" : "Turkish";
}

function fallbackText(language, type) {
  if (language === "en") {
    return type === "body"
      ? "Body analysis could not be generated. Please upload a clearer photo with good lighting."
      : "Meal analysis could not be generated. Please upload a clearer meal photo.";
  }

  return type === "body"
    ? "Vücut analizi oluşturulamadı. Daha net, iyi ışıklı bir fotoğraf yükle."
    : "Yemek analizi oluşturulamadı. Daha net bir yemek fotoğrafı yükle.";
}

function sanitizeReport(text) {
  return String(text || "")
    .replace(/^```[a-zA-Z]*\s*/g, "")
    .replace(/```$/g, "")
    .trim();
}

function getMealPrompt(note, language = "tr") {
  const outputLanguage = langName(language);

  return `
You are CoachOS World Cuisine Nutrition Engine v10.

OUTPUT LANGUAGE:
Write the entire visible report in ${outputLanguage}.
If the language is Turkish, use Turkish headings and Turkish coaching comments.
If the language is English, use English headings and English coaching comments.
Food names may keep their original local names when useful.

ROLE:
You are not a simple food recognition system.
You are a professional AI nutrition coach that recognizes world cuisine, estimates visual portions, calculates calories/macros, evaluates micronutrients, and comments based on fat loss and muscle retention goals.

USER NOTE:
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

If output language is Turkish, use this exact report structure:

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

If output language is English, use this exact report structure:

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
You are CoachOS Elite Body Analysis Engine v10.

OUTPUT LANGUAGE:
Write the entire visible report in ${outputLanguage}.
If the output language is Turkish, use Turkish headings and Turkish coaching comments.
If the output language is English, use English headings and English coaching comments.

USER NOTE:
${note || "None"}

ROLE:
You are not a simple image description model.
You are a professional AI fitness coach that analyzes visible body composition and creates a realistic transformation strategy.

MAIN GOAL:
Analyze the body image for fitness purposes:
- estimated body fat range
- fat distribution
- muscle mass appearance
- strong areas
- areas to improve
- posture and symmetry
- training priority
- nutrition priority
- cardio / steps priority
- 90-day transformation strategy
- clear coach comment
- 3 immediate action tasks

SAFETY RULES:
- Do not diagnose medical conditions.
- Do not claim exact body fat percentage.
- Always give an estimated range.
- Do not identify the person.
- Do not infer age, ethnicity, religion, identity or sensitive attributes.
- Do not insult the user.
- Do not shame the user.
- Be direct, useful, disciplined and motivating.
- This is a fitness analysis, not a medical evaluation.
- If lighting, angle, clothing, cropping or pose limits accuracy, say it clearly and still provide useful strategy.

VISUAL ANALYSIS LOGIC:
When analyzing the image, evaluate only what is visible:
1. Overall body fat level
2. Waist and belly fat visibility
3. Chest shape and fat distribution
4. Shoulder width and roundness
5. Arm muscle visibility
6. Back thickness if visible
7. Leg development if visible
8. Posture, shoulder position and torso position if visible
9. Symmetry
10. Muscle definition level
11. Current athletic potential
12. What should be prioritized first

BODY FAT RANGE GUIDANCE:
Use estimated ranges, never exact values.

If the image shows:
- visible abs and clear definition: lower range
- some muscle shape but waist/belly fat: moderate range
- clear belly/waist fat and low definition: higher range
- limited visibility, clothing limitation or bad lighting: wider range

Do not be overconfident.
If the image is unclear, say the confidence is moderate or low.

FITNESS STRATEGY LOGIC:
The user likely wants:
- fat loss
- muscle retention
- better physique
- stronger visual shape
- sustainable progress

Prioritize:
- high protein
- controlled calorie deficit if fat loss is needed
- strength training
- progressive overload
- steps / cardio
- sleep and water
- consistency
- weekly measurement tracking

Do not suggest extreme diets.
Do not suggest crash weight loss.
Do not suggest unhealthy calorie targets.
Do not promise impossible transformations.

REPORT STYLE:
Write cleanly.
Use strong headings.
Use short but valuable explanations.
Make the report feel premium and professional.
Do not write JSON.
Do not write markdown tables.
Do not write raw data.
Do not write code block.
Do not use generic filler.
Analyze what is visually visible.

If the output language is Turkish, use this exact structure:

CoachOS Elite Vücut Analizi

1) Genel Vücut Kompozisyonu:
- Tahmini yağ oranı:
- Genel görünüm:
- Analiz güveni:

2) Yağ Dağılımı:
- Bel / karın bölgesi:
- Göğüs bölgesi:
- Sırt / yan bel:
- Genel yağ dağılım yorumu:

3) Kas Kütlesi Görünümü:
- Omuz:
- Göğüs:
- Kol:
- Sırt:
- Bacak:
- Genel kas yorumu:

4) Güçlü Bölgeler:
1.
2.
3.

5) Gelişmesi Gereken Bölgeler:
1.
2.
3.

6) Postür ve Simetri:
- Omuz duruşu:
- Gövde duruşu:
- Simetri yorumu:
- Dikkat edilmesi gereken:

7) Hedef Vücut Tipi Yorumu:
- Mevcut durumdan en mantıklı hedef:
- 90 günde gerçekçi değişim:
- Uzun vadeli potansiyel:

8) 90 Günlük Strateji:
- Kalori stratejisi:
- Protein stratejisi:
- Ağırlık antrenmanı:
- Kardiyo / adım:
- Uyku / su:
- Haftalık kontrol:

9) Antrenman Önceliği:
- Birinci öncelik:
- İkinci öncelik:
- Üçüncü öncelik:
- Kaçınılması gereken hata:

10) Beslenme Önceliği:
- Günlük protein:
- Kalori açığı:
- Karbonhidrat yönetimi:
- Yağ yönetimi:
- En kritik beslenme hatası:

11) Koçun Net Yorumu:
-

12) Bugünden Başlanacak 3 Görev:
1.
2.
3.

Güvenlik notu:
Bu analiz görsele göre tahminidir. Tıbbi değerlendirme değildir. Kesin ölçüm için profesyonel ölçüm gerekir.

If the output language is English, use this exact structure:

CoachOS Elite Body Analysis

1) Overall Body Composition:
- Estimated body fat range:
- General appearance:
- Analysis confidence:

2) Fat Distribution:
- Waist / belly area:
- Chest area:
- Back / love handle area:
- Overall fat distribution comment:

3) Muscle Mass Appearance:
- Shoulders:
- Chest:
- Arms:
- Back:
- Legs:
- Overall muscle comment:

4) Strong Areas:
1.
2.
3.

5) Areas to Improve:
1.
2.
3.

6) Posture and Symmetry:
- Shoulder posture:
- Torso posture:
- Symmetry comment:
- What to watch:

7) Goal Physique Comment:
- Most realistic goal from current condition:
- Realistic 90-day change:
- Long-term potential:

8) 90-Day Strategy:
- Calorie strategy:
- Protein strategy:
- Strength training:
- Cardio / steps:
- Sleep / water:
- Weekly check-in:

9) Training Priority:
- First priority:
- Second priority:
- Third priority:
- Mistake to avoid:

10) Nutrition Priority:
- Daily protein:
- Calorie deficit:
- Carb management:
- Fat management:
- Most critical nutrition mistake:

11) Clear Coach Comment:
-

12) 3 Tasks to Start Today:
1.
2.
3.

Safety note:
This analysis is an estimate based on the image. It is not a medical evaluation. Accurate measurement requires professional assessment.

IMPORTANT:
If the body is visible, do not give a generic answer.
Analyze what is visually visible.
If visibility is limited, explain the limitation and still produce a practical strategy.
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
          temperature: 0.12,
          maxOutputTokens: 3200
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
        result.status === 429 ||
        result.status === 500 ||
        result.status === 502 ||
        result.status === 503 ||
        result.status === 504;

      if (!isTemporary) break;

      await wait(700 * attempt);
    }
  }

  throw {
    message: "Gemini API geçici olarak cevap veremedi veya tüm modeller başarısız oldu.",
    lastError
  };
}

function extractText(data, language, type) {
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

  if (!text) {
    return fallbackText(language, type);
  }

  return sanitizeReport(text);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const { image, mode, note, language } = req.body || {};
    const finalLanguage = cleanLanguage(language);

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        error: finalLanguage === "en"
          ? "Image data is missing or invalid."
          : "Fotoğraf verisi eksik veya hatalı."
      });
    }

    if (!mode || !["meal", "body"].includes(mode)) {
      return res.status(400).json({
        error: finalLanguage === "en"
          ? "Invalid analysis type. mode must be 'meal' or 'body'."
          : "Analiz tipi hatalı. mode 'meal' veya 'body' olmalı."
      });
    }

    const parsedImage = parseDataUrl(image);

    if (!parsedImage) {
      return res.status(400).json({
        error: finalLanguage === "en"
          ? "Invalid image format. The image must be sent as data:image/jpeg;base64."
          : "Fotoğraf formatı hatalı. Görsel data:image/jpeg;base64 formatında gönderilmeli."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY Vercel Environment Variables içine eklenmemiş."
      });
    }

    const prompt = mode === "meal"
      ? getMealPrompt(note, finalLanguage)
      : getBodyPrompt(note, finalLanguage);

    const geminiResult = await callGeminiWithRetry({
      apiKey,
      prompt,
      parsedImage
    });

    const result = extractText(geminiResult.data, finalLanguage, mode);

    return res.status(200).json({
      result
    });

  } catch (error) {
    return res.status(500).json({
      error: "Gemini API hatası.",
      details: {
        message: error?.message || "Bilinmeyen hata",
        lastError: error?.lastError || null
      }
    });
  }
}
