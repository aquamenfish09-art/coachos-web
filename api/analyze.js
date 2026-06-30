export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) return null;

  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

function safe(value, fallback = "Fotoğrafa göre net değil, tahmini değerlendirme gerekir.") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && !value.trim()) return fallback;
  return value;
}

function list(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "- Fotoğrafta görünen porsiyona göre tahmini değerlendirme gerekir.";
  }

  return items.map(item => `- ${item}`).join("\n");
}

function numberRange(value, unit) {
  if (!value) return `Tahmini aralık verilemedi ${unit ? "(" + unit + ")" : ""}`;

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const min = value.min ?? value.minimum ?? value.low;
    const max = value.max ?? value.maximum ?? value.high;

    if (min !== undefined && max !== undefined) {
      return `${min}-${max}${unit ? " " + unit : ""}`;
    }
  }

  return String(value);
}

function formatMealAnalysis(json) {
  const foods = Array.isArray(json.foods) ? json.foods : [];
  const macros = json.macros || {};
  const portions = json.portions || {};
  const water = json.water || {};
  const vitamins = json.vitamins_minerals || {};
  const diet = json.diet_score || {};
  const remaining = json.remaining_day_advice || {};

  return `CoachOS Nutrition Engine v3

Yemek Analizi:

1) Görünen yemekler:
${list(foods)}

2) Porsiyon tahmini:
- Ana yemek: ${safe(portions.main, "Fotoğrafa göre orta porsiyon görünüyor.")}
- Yan ürünler: ${safe(portions.sides, "Yan ürün porsiyonu fotoğrafa göre sınırlı görünüyor.")}
- Tatlı / içecek: ${safe(portions.dessert_drink, "Tatlı veya içecek varsa karbonhidrat/şeker etkisi hesaba katılmalı.")}

3) Tahmini toplam kalori:
- Toplam: ${numberRange(json.total_calories_kcal, "kcal")}

4) Tahmini makrolar:
- Protein: ${numberRange(macros.protein_g, "g")}
- Karbonhidrat: ${numberRange(macros.carbs_g, "g")}
- Yağ: ${numberRange(macros.fat_g, "g")}
- Lif: ${numberRange(macros.fiber_g, "g")}

5) Tahmini su oranı:
- Yemekteki su oranı: ${safe(water.score_out_of_10, "?")}/10
- Açıklama: ${safe(water.explanation)}

6) Vitamin / mineral kalitesi:
- Kalite: ${safe(vitamins.score_out_of_10, "?")}/10
- Güçlü taraf: ${safe(vitamins.strong_side)}
- Zayıf taraf: ${safe(vitamins.weak_side)}

7) Diyet uyumu:
- Yağ yakımı için: ${safe(diet.fat_loss_out_of_10, "?")}/10
- Kas koruma için: ${safe(diet.muscle_retention_out_of_10, "?")}/10
- Dikkat edilmesi gereken: ${safe(diet.warning)}

8) Koç yorumu:
${safe(json.coach_comment, "Bu öğün tek başına kötü değil; önemli olan günün toplam kalori ve protein dengesidir.")}

9) Günün kalan önerisi:
- Protein: ${safe(remaining.protein)}
- Karbonhidrat: ${safe(remaining.carbs)}
- Yağ: ${safe(remaining.fat)}
- Su: ${safe(remaining.water)}
- Sonraki öğün önerisi: ${safe(remaining.next_meal)}

10) Güvenlik notu:
Bu analiz fotoğrafa göre tahminidir. Kesin değer için gramaj gerekir.`;
}

function formatBodyAnalysis(json) {
  const strategy = json.strategy_90_days || {};

  return `CoachOS Body Analysis Engine v3

Görsel Vücut Analizi:

1) Tahmini yağ oranı:
- ${safe(json.estimated_body_fat_range, "Görsele göre tahmini aralık verilemedi.")}

2) Kas kütlesi görünümü:
- ${safe(json.muscle_mass_look)}

3) Güçlü bölgeler:
${list(json.strong_areas)}

4) Gelişmesi gereken bölgeler:
${list(json.needs_improvement)}

5) Postür / duruş:
- ${safe(json.posture)}

6) Hedefe göre yorum:
- ${safe(json.goal_comment)}

7) 90 Günlük Strateji:
- Kalori: ${safe(strategy.calories)}
- Protein: ${safe(strategy.protein)}
- Antrenman: ${safe(strategy.training)}
- Kardiyo/adım: ${safe(strategy.cardio_steps)}
- Uyku/su: ${safe(strategy.sleep_water)}

8) Net koç yorumu:
${safe(json.coach_comment, "Sistemli ilerlersen 90 günde görünür değişim alınır.")}

9) Güvenlik notu:
Bu analiz görsele göre tahminidir; tıbbi değerlendirme değildir.`;
}

function extractJson(text) {
  if (!text || typeof text !== "string") return null;

  try {
    return JSON.parse(text);
  } catch {}

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function getMealPrompt(note) {
  return `
Sen CoachOS'un yemek görsel analiz motorusun.

Görev:
Fotoğraftaki yemeği analiz et ve SADECE JSON döndür.

Kullanıcı notu:
${note || "Yok"}

ZORUNLU:
- Sadece yemek isimlerini yazıp bırakma.
- Kalori, protein, karbonhidrat, yağ, lif, su oranı, vitamin/mineral kalitesi ve diyet uyumu alanlarını mutlaka doldur.
- Emin değilsen tahmini aralık ver.
- Alanları boş bırakma.
- Değerler fotoğrafa göre tahmini olacak.
- Yanıt sadece JSON olsun. Markdown yok, açıklama yok.

Kalori tahmini yaparken:
- Mantı / hamur işi yüksek karbonhidrat + orta protein + orta/yüksek yağ olabilir.
- Çorba yüksek su oranına sahip olabilir.
- Tatlı varsa karbonhidrat ve şeker etkisini hesaba kat.
- Yoğurt/sos yağ ve protein değerini etkiler.
- Porsiyon görünüyorsa orta/büyük/küçük diye tahmin et.

JSON ŞEMASI:
{
  "foods": [
    "Yemek adı ve kısa açıklama"
  ],
  "portions": {
    "main": "Ana yemek porsiyon tahmini",
    "sides": "Yan ürün porsiyon tahmini",
    "dessert_drink": "Tatlı/içecek tahmini"
  },
  "total_calories_kcal": {
    "min": 0,
    "max": 0
  },
  "macros": {
    "protein_g": {
      "min": 0,
      "max": 0
    },
    "carbs_g": {
      "min": 0,
      "max": 0
    },
    "fat_g": {
      "min": 0,
      "max": 0
    },
    "fiber_g": {
      "min": 0,
      "max": 0
    }
  },
  "water": {
    "score_out_of_10": 0,
    "explanation": "Yemekteki su oranı yorumu"
  },
  "vitamins_minerals": {
    "score_out_of_10": 0,
    "strong_side": "Güçlü vitamin/mineral tarafı",
    "weak_side": "Zayıf taraf"
  },
  "diet_score": {
    "fat_loss_out_of_10": 0,
    "muscle_retention_out_of_10": 0,
    "warning": "Dikkat edilmesi gereken nokta"
  },
  "coach_comment": "Kısa net koç yorumu",
  "remaining_day_advice": {
    "protein": "Günün kalanında protein önerisi",
    "carbs": "Karbonhidrat önerisi",
    "fat": "Yağ önerisi",
    "water": "Su önerisi",
    "next_meal": "Sonraki öğün önerisi"
  }
}

Sadece JSON döndür.
`;
}

function getBodyPrompt(note) {
  return `
Sen CoachOS'un görsel vücut analiz motorusun.

Görev:
Fotoğraftaki vücudu fitness hedefleri açısından analiz et ve SADECE JSON döndür.

Kullanıcı notu:
${note || "Yok"}

Kurallar:
- Tıbbi teşhis koyma.
- Kesin yağ oranı söyleme, tahmini aralık ver.
- Kimlik, yaş, etnik köken gibi hassas tahminler yapma.
- Kırıcı dil kullanma.
- Fitness, postür, yağ kaybı ve kas koruma odaklı değerlendir.
- Yanıt sadece JSON olsun.

JSON ŞEMASI:
{
  "estimated_body_fat_range": "Tahmini yağ oranı aralığı",
  "muscle_mass_look": "Kas kütlesi görünümü",
  "strong_areas": [
    "Güçlü bölge"
  ],
  "needs_improvement": [
    "Gelişmesi gereken bölge"
  ],
  "posture": "Postür/duruş yorumu",
  "goal_comment": "Hedefe göre yorum",
  "strategy_90_days": {
    "calories": "Kalori stratejisi",
    "protein": "Protein stratejisi",
    "training": "Antrenman stratejisi",
    "cardio_steps": "Kardiyo/adım stratejisi",
    "sleep_water": "Uyku/su stratejisi"
  },
  "coach_comment": "Kısa net koç yorumu"
}

Sadece JSON döndür.
`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const { image, mode, note } = req.body || {};

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

    const prompt = mode === "meal"
      ? getMealPrompt(note)
      : getBodyPrompt(note);

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
            temperature: 0.05,
            maxOutputTokens: 2200,
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
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim() || "";

    const parsed = extractJson(raw);

    if (!parsed) {
      return res.status(200).json({
        result:
          "CoachOS Nutrition Engine v3\n\nModel yapılandırılmış analiz döndüremedi.\n\nHam çıktı:\n" +
          raw
      });
    }

    const result = mode === "meal"
      ? formatMealAnalysis(parsed)
      : formatBodyAnalysis(parsed);

    return res.status(200).json({
      result
    });

  } catch (error) {
    return res.status(500).json({
      error: "Sunucu hatası.",
      details: error.message
    });
  }
}
