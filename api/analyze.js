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

function safe(value, fallback = "Fotoğrafa göre net değil, tahmini değerlendirme gerekir.") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && !value.trim()) return fallback;
  return value;
}

function range(value, unit = "") {
  if (!value) return `Tahmini aralık verilemedi${unit ? " " + unit : ""}`;

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const min = value.min ?? value.minimum ?? value.low ?? value.amount_min;
    const max = value.max ?? value.maximum ?? value.high ?? value.amount_max;

    if (min !== undefined && max !== undefined) {
      return `${min}-${max}${unit ? " " + unit : ""}`;
    }

    if (min !== undefined) {
      return `${min}${unit ? " " + unit : ""}`;
    }
  }

  return String(value);
}

function score(value) {
  if (value === null || value === undefined || value === "") return "?";
  return String(value);
}

function list(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "- Fotoğrafa göre net değil.";
  }

  return items.map(item => `- ${item}`).join("\n");
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

function formatFoodDetails(foods) {
  if (!Array.isArray(foods) || foods.length === 0) {
    return "- Yemek tespiti yapılamadı.";
  }

  return foods.map((food, index) => {
    const portion = food.estimated_portion || {};
    const calories = food.estimated_calories_kcal || {};
    const macros = food.estimated_macros || {};

    return `${index + 1}) ${safe(food.name, "Yemek")}
- Kategori: ${safe(food.category, "Belirsiz")}
- Açıklama: ${safe(food.description)}
- Görünen malzemeler:
${list(food.visible_ingredients)}
- Porsiyon: ${range({ min: portion.amount_min, max: portion.amount_max }, portion.unit || "")} / ${safe(portion.portion_size, "orta")}
- Porsiyon güveni: ${score(portion.confidence_out_of_10)}/10
- Kalori: ${range(calories, "kcal")}
- Protein: ${range(macros.protein_g, "g")}
- Karbonhidrat: ${range(macros.carbs_g, "g")}
- Yağ: ${range(macros.fat_g, "g")}
- Lif: ${range(macros.fiber_g, "g")}
- Kalori yoğunluğu: ${safe(food.calorie_density, "orta")}
- Yorum: ${safe(food.nutrition_comment)}`;
  }).join("\n\n");
}

function formatMealAnalysis(json, modelUsed) {
  if (json.is_food_image === false) {
    return `CoachOS World Cuisine Nutrition Engine v6
Model: ${modelUsed}

Bu görselde net bir yemek tespit edemedim.

Koç yorumu:
${safe(json.coach_comment?.short, "Lütfen daha net bir yemek fotoğrafı yükle. Tabağı, porsiyonu ve yan ürünleri kadraja alırsan daha iyi analiz çıkar.")}

Güvenlik notu:
Bu analiz fotoğrafa göre tahminidir. Kesin değer için gramaj gerekir.`;
  }

  const cuisine = json.detected_cuisine || {};
  const total = json.total_estimate || {};
  const macro = json.macro_balance || {};
  const water = json.water_ratio || {};
  const vitamins = json.vitamins_minerals || {};
  const fitness = json.fitness_score || {};
  const coach = json.coach_comment || {};
  const advice = json.remaining_day_advice || {};
  const display = json.display_priority || {};
  const confidence = json.confidence || {};

  return `CoachOS World Cuisine Nutrition Engine v6
Model: ${modelUsed}

━━━━━━━━━━━━━━━━━━━━
🌍 DÜNYA MUTFAĞI ANALİZİ
━━━━━━━━━━━━━━━━━━━━

Tespit edilen mutfak:
${safe(cuisine.primary, "Muhtemel dünya / karışık mutfak")}

İkinci olasılık:
${safe(cuisine.secondary_possible, "Belirsiz")}

Güven:
${score(cuisine.confidence_out_of_10)}/10

Sebep:
${safe(cuisine.reason)}

Öğün adı:
${safe(json.overall_meal_name, "Karışık öğün")}

━━━━━━━━━━━━━━━━━━━━
🔥 ANA METRİKLER
━━━━━━━━━━━━━━━━━━━━

Kalori:
${range(total.calories_kcal, "kcal")}

Protein:
${range(total.protein_g, "g")}

Karbonhidrat:
${range(total.carbs_g, "g")}

Yağ:
${range(total.fat_g, "g")}

Lif:
${range(total.fiber_g, "g")}

━━━━━━━━━━━━━━━━━━━━
🍽️ YEMEKLER VE PORSİYONLAR
━━━━━━━━━━━━━━━━━━━━

${formatFoodDetails(json.foods)}

━━━━━━━━━━━━━━━━━━━━
⚖️ MAKRO DENGESİ
━━━━━━━━━━━━━━━━━━━━

Protein seviyesi:
${safe(macro.protein_level, "orta")}

Karbonhidrat seviyesi:
${safe(macro.carbs_level, "orta")}

Yağ seviyesi:
${safe(macro.fat_level, "orta")}

Kalori seviyesi:
${safe(macro.calorie_level, "orta")}

Ana risk:
${safe(macro.main_risk)}

En iyi taraf:
${safe(macro.best_side)}

Denge yorumu:
${safe(macro.balance_comment)}

━━━━━━━━━━━━━━━━━━━━
💧 SU ORANI
━━━━━━━━━━━━━━━━━━━━

Su oranı:
${score(water.score_out_of_10)}/10

Açıklama:
${safe(water.explanation)}

━━━━━━━━━━━━━━━━━━━━
🛡️ VİTAMİN & MİNERAL
━━━━━━━━━━━━━━━━━━━━

Mikro besin skoru:
${score(vitamins.score_out_of_10)}/10

Güçlü kaynaklar:
${list(vitamins.strong_sources)}

Zayıf noktalar:
${list(vitamins.weak_points)}

Sodyum / tuz seviyesi:
${safe(vitamins.sodium_level, "orta")}

Sodyum yorumu:
${safe(vitamins.sodium_comment)}

━━━━━━━━━━━━━━━━━━━━
🏋️ FITNESS UYUMU
━━━━━━━━━━━━━━━━━━━━

Yağ yakımı uyumu:
${score(fitness.fat_loss_out_of_10)}/10

Kas koruma uyumu:
${score(fitness.muscle_retention_out_of_10)}/10

Temiz beslenme uyumu:
${score(fitness.clean_eating_out_of_10)}/10

Tokluk skoru:
${score(fitness.satiety_out_of_10)}/10

Açıklama:
${safe(fitness.explanation)}

━━━━━━━━━━━━━━━━━━━━
🎯 KOÇ YORUMU
━━━━━━━━━━━━━━━━━━━━

Kısa yorum:
${safe(coach.short)}

Detaylı yorum:
${safe(coach.detailed)}

━━━━━━━━━━━━━━━━━━━━
📌 GÜNÜN KALANI İÇİN PLAN
━━━━━━━━━━━━━━━━━━━━

Protein:
${safe(advice.protein)}

Karbonhidrat:
${safe(advice.carbs)}

Yağ:
${safe(advice.fat)}

Su:
${safe(advice.water)}

Sonraki öğün:
${safe(advice.next_meal)}

Kaçın:
${safe(advice.avoid)}

━━━━━━━━━━━━━━━━━━━━
🚨 ÖNEMLİ UYARI / KAZANIM
━━━━━━━━━━━━━━━━━━━━

Ana uyarı:
${safe(display.main_warning)}

Ana kazanım:
${safe(display.main_win)}

Öne çıkan kalori:
${safe(display.headline_calorie, range(total.calories_kcal, "kcal"))}

Öne çıkan protein:
${safe(display.headline_protein, range(total.protein_g, "g"))}

Öne çıkan karbonhidrat:
${safe(display.headline_carbs, range(total.carbs_g, "g"))}

Öne çıkan yağ:
${safe(display.headline_fat, range(total.fat_g, "g"))}

━━━━━━━━━━━━━━━━━━━━
📊 TAHMİN GÜVENİ
━━━━━━━━━━━━━━━━━━━━

Yemek tanıma:
${score(confidence.food_detection_out_of_10)}/10

Porsiyon tahmini:
${score(confidence.portion_estimation_out_of_10)}/10

Besin tahmini:
${score(confidence.nutrition_estimation_out_of_10)}/10

Sebep:
${safe(confidence.reason)}

━━━━━━━━━━━━━━━━━━━━
Güvenlik notu:
${safe(json.warning, "Bu analiz fotoğrafa göre tahminidir. Kesin değer için gramaj gerekir.")}`;
}

function formatBodyAnalysis(json, modelUsed) {
  const strategy = json.strategy_90_days || {};

  return `CoachOS Body Analysis Engine v6
Model: ${modelUsed}

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

function getMealPrompt(note) {
  return `
Sen CoachOS World Cuisine Nutrition Engine v6'sın.

Sen sıradan bir yemek tanıma modeli değilsin.
Sen; dünya mutfağı bilgisi, görsel porsiyon tahmini, kalori hesabı, makro besin analizi, mikro besin yorumu ve fitness koçluğu yapan profesyonel bir AI beslenme analiz motorusun.

Kullanıcının yüklediği yemek fotoğrafını analiz edeceksin.

Kullanıcı notu:
${note || "Yok"}

ANA GÖREV:
Fotoğraftaki yemeği dünya mutfağı bağlamında tanı.
Görünen tüm yemekleri ayrı ayrı tespit et.
Her yemek için porsiyon tahmini yap.
Her yemek için kalori ve makro tahmini çıkar.
Sonra tüm öğünün toplam kalori ve makro değerlerini hesapla.
Fitness hedefleri açısından yorum yap.
Yağ yakımı, kas koruma ve temiz beslenme uyumunu puanla.

KESİNLİKLE YASAK:
- Sadece yemek isimlerini yazıp bırakmak yasaktır.
- “Bilemiyorum” deyip alanları boş bırakmak yasaktır.
- Kalori, protein, karbonhidrat, yağ, lif alanlarını boş bırakmak yasaktır.
- Yemek görünüyorsa 0 değer kullanmak yasaktır.
- JSON dışında açıklama yazmak yasaktır.
- Markdown, madde işareti, başlık, yorum satırı kullanmak yasaktır.
- Tıbbi teşhis veya tedavi tavsiyesi vermek yasaktır.

ZORUNLU ANALİZ ALANLARI:
Her analizde mutlaka şunlar olacak:
1. Tespit edilen dünya mutfağı
2. Yemeklerin ayrı ayrı isimleri
3. Yemeklerin ayrı ayrı porsiyon tahmini
4. Yemeklerin ayrı ayrı kalori tahmini
5. Yemeklerin ayrı ayrı protein, karbonhidrat, yağ, lif tahmini
6. Toplam kalori
7. Toplam protein
8. Toplam karbonhidrat
9. Toplam yağ
10. Toplam lif
11. Su oranı
12. Vitamin/mineral kalitesi
13. Sodyum/tuz seviyesi
14. Yağ yakımı uyumu
15. Kas koruma uyumu
16. Temiz beslenme uyumu
17. Ana risk
18. En iyi taraf
19. Koç yorumu
20. Günün kalan öğün önerisi

DÜNYA MUTFAĞI KAPSAMI:
Fotoğraftaki yemeği mümkün olan en yakın mutfak kategorisine bağla.

Aşağıdaki mutfakları tanımaya çalış:
- Türk mutfağı
- İtalyan mutfağı
- Japon mutfağı
- Çin mutfağı
- Kore mutfağı
- Meksika mutfağı
- Hint mutfağı
- Arap / Orta Doğu mutfağı
- Akdeniz mutfağı
- Amerikan mutfağı
- Fransız mutfağı
- Yunan mutfağı
- İspanyol mutfağı
- Tayland mutfağı
- Balkan mutfağı
- Dünya / karışık mutfak

Eğer mutfak kesin değilse:
En yakın tahmini yaz.
“Bilinmiyor” yazma.
Confidence puanı ver.

KALORİ VE MAKRO TAHMİN MANTIĞI:
Fotoğrafta gramaj net görünmese bile porsiyon görünümüne göre tahmini aralık ver.

Küçük porsiyon:
- Ana yemek: 100-180 g
- Çorba: 150-220 ml
- Tatlı: 60-120 g

Orta porsiyon:
- Ana yemek: 180-300 g
- Çorba: 200-300 ml
- Tatlı: 100-180 g

Büyük porsiyon:
- Ana yemek: 300-500 g
- Çorba: 300-450 ml
- Tatlı: 180-300 g

Genel besin mantığı:
- Mantı, makarna, pilav, ekmek, hamur işi: karbonhidrat yüksek
- Tatlı, şerbetli tatlı, sütlü tatlı: karbonhidrat/şeker yüksek
- Kızartma, krema, peynir, yağlı sos, tereyağı: yağ yüksek
- Et, tavuk, balık, yumurta, yoğurt, peynir: protein kaynağı
- Çorba: su oranı yüksek olabilir
- Salata/sebze: lif, vitamin ve mineral katkısı sağlar
- Yoğurtlu yemeklerde protein ve yağ birlikte değerlendirilir
- Soslu yemeklerde gizli yağ ve kalori hesaba katılır
- Tatlı varsa toplam karbonhidrat riskini artır

DEĞER VERME KURALLARI:
- Kalori ve makroları kesin değer olarak değil aralık olarak ver.
- Örnek doğru kullanım: 750-1050 kcal
- Örnek yanlış kullanım: 843 kcal
- Aralıklar gerçekçi olsun.
- Emin değilsen geniş aralık ver ama boş bırakma.
- Yemek varsa kalori ve makro alanlarında 0 kullanma.
- Yalnızca fotoğrafta yemek yoksa 0 kullan.

FITNESS YORUM MANTIĞI:
Kullanıcı fitness ve vücut geliştirme hedefli ilerliyor.
Ana hedefler:
- Yağ yakımı
- Kas kütlesini koruma
- Yüksek protein
- Kontrollü kalori
- Sürdürülebilir diyet

Bu yüzden yorumda şunları açıkça belirt:
- Protein yeterli mi?
- Karbonhidrat yüksek mi?
- Yağ yüksek mi?
- Öğün yağ yakımı için uygun mu?
- Kas koruma için uygun mu?
- Günün kalanında ne yemeli?
- Su tüketimi nasıl ayarlanmalı?

DİL VE ÜSLUP:
- Türkçe yaz.
- Net, disiplinli ve motive edici konuş.
- Kullanıcıyı korkutma.
- Yargılayıcı olma.
- Kısa ama dolu cevap ver.
- Profesyonel fitness koçu gibi konuş.
- Tahmini olduğunu belirt ama analizden kaçma.

ÇIKTI FORMATI:
Sadece geçerli JSON döndür.
JSON dışında hiçbir şey yazma.
Markdown yok.
Kod bloğu yok.
Açıklama yok.
Yorum satırı yok.
Trailing comma yok.
Tüm sayı alanları number olacak.
Aralıklar min/max objesi olacak.
Önemli alanlar boş kalmayacak.

ZORUNLU JSON ŞEMASI:

{
  "engine": "CoachOS World Cuisine Nutrition Engine v6",
  "is_food_image": true,
  "detected_cuisine": {
    "primary": "Tahmini mutfak adı",
    "secondary_possible": "İkinci olası mutfak veya karışık mutfak",
    "confidence_out_of_10": 0,
    "reason": "Bu mutfağa benzetme sebebi"
  },
  "overall_meal_name": "Öğünün kısa adı",
  "foods": [
    {
      "name": "Yemek adı",
      "category": "ana yemek / çorba / tatlı / içecek / salata / yan ürün",
      "description": "Yemeğin kısa açıklaması",
      "visible_ingredients": [
        "Görünen malzeme"
      ],
      "cooking_method": "haşlama / fırın / kızartma / ızgara / sulu yemek / bilinmiyor",
      "estimated_portion": {
        "amount_min": 0,
        "amount_max": 0,
        "unit": "g/ml/adet",
        "portion_size": "küçük/orta/büyük",
        "confidence_out_of_10": 0
      },
      "estimated_calories_kcal": {
        "min": 0,
        "max": 0
      },
      "estimated_macros": {
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
      "calorie_density": "düşük/orta/yüksek",
      "nutrition_comment": "Bu yemeğin kalori ve makro açısından kısa yorumu"
    }
  ],
  "total_estimate": {
    "calories_kcal": {
      "min": 0,
      "max": 0
    },
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
  "macro_balance": {
    "protein_level": "düşük/orta/yüksek",
    "carbs_level": "düşük/orta/yüksek",
    "fat_level": "düşük/orta/yüksek",
    "calorie_level": "düşük/orta/yüksek",
    "main_risk": "Bu öğünde dikkat edilmesi gereken ana risk",
    "best_side": "Bu öğünün en iyi tarafı",
    "balance_comment": "Makro dengesi hakkında net yorum"
  },
  "water_ratio": {
    "score_out_of_10": 0,
    "explanation": "Yemeğin su oranı yorumu"
  },
  "vitamins_minerals": {
    "score_out_of_10": 0,
    "strong_sources": [
      "Güçlü vitamin/mineral kaynağı"
    ],
    "weak_points": [
      "Eksik veya zayıf taraf"
    ],
    "sodium_level": "düşük/orta/yüksek",
    "sodium_comment": "Tuz/sodyum yorumu"
  },
  "fitness_score": {
    "fat_loss_out_of_10": 0,
    "muscle_retention_out_of_10": 0,
    "clean_eating_out_of_10": 0,
    "satiety_out_of_10": 0,
    "explanation": "Fitness hedeflerine göre net açıklama"
  },
  "coach_comment": {
    "short": "Kısa ve vurucu koç yorumu",
    "detailed": "Protein, karbonhidrat, yağ, kalori ve porsiyon dengesini açıklayan detaylı yorum"
  },
  "remaining_day_advice": {
    "protein": "Günün kalanında protein için öneri",
    "carbs": "Günün kalanında karbonhidrat için öneri",
    "fat": "Günün kalanında yağ için öneri",
    "water": "Su tüketimi önerisi",
    "next_meal": "Sonraki öğün önerisi",
    "avoid": "Günün kalanında kaçınılması gereken şey"
  },
  "display_priority": {
    "headline_calorie": "Kalori aralığını dikkat çekici yaz",
    "headline_protein": "Protein aralığını dikkat çekici yaz",
    "headline_carbs": "Karbonhidrat aralığını dikkat çekici yaz",
    "headline_fat": "Yağ aralığını dikkat çekici yaz",
    "main_warning": "Kullanıcının ilk görmesi gereken uyarı",
    "main_win": "Kullanıcının ilk görmesi gereken olumlu taraf"
  },
  "confidence": {
    "food_detection_out_of_10": 0,
    "portion_estimation_out_of_10": 0,
    "nutrition_estimation_out_of_10": 0,
    "reason": "Tahmin güven seviyesi açıklaması"
  },
  "warning": "Bu analiz fotoğrafa göre tahminidir. Kesin değer için gramaj gerekir."
}

EĞER FOTOĞRAFTA YEMEK YOKSA:
Yine sadece JSON döndür.
is_food_image false olsun.
foods boş array olabilir.
Ama coach_comment içinde kullanıcıya yemek fotoğrafı yüklemesi gerektiğini söyle.

KRİTİK SON TALİMAT:
Fotoğrafta yemek görünüyorsa:
- total_estimate.calories_kcal min/max 0 olamaz.
- protein_g min/max 0 olamaz.
- carbs_g min/max 0 olamaz.
- fat_g min/max 0 olamaz.
- foods array boş olamaz.
- detected_cuisine.primary boş olamaz.
- coach_comment.short boş olamaz.
`;
}

function getBodyPrompt(note) {
  return `
Sen CoachOS Body Analysis Engine v6'sın.

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
          temperature: 0.05,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
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

      if (!isTemporary) {
        break;
      }

      await wait(700 * attempt);
    }
  }

  throw {
    message: "Gemini API geçici olarak cevap veremedi veya tüm yedek modeller başarısız oldu.",
    lastError
  };
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

    const geminiResult = await callGeminiWithRetry({
      apiKey,
      prompt,
      parsedImage
    });

    const raw =
      geminiResult.data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim() || "";

    const parsed = extractJson(raw);

    if (!parsed) {
      return res.status(200).json({
        result:
          `CoachOS Engine v6\nModel: ${geminiResult.model}\n\nModel yapılandırılmış analiz döndüremedi.\n\nHam çıktı:\n` +
          raw
      });
    }

    const result = mode === "meal"
      ? formatMealAnalysis(parsed, geminiResult.model)
      : formatBodyAnalysis(parsed, geminiResult.model);

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
