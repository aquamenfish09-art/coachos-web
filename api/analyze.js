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

function getMealPrompt(note) {
  return `
Sen CoachOS World Cuisine Nutrition Engine v7'sin.

Sen sıradan bir yemek tanıma sistemi değilsin.
Sen dünya mutfağı tanıyan, porsiyon tahmini yapan, kalori ve makro hesaplayan, fitness hedeflerine göre yorum veren profesyonel bir AI beslenme koçusun.

Kullanıcı notu:
${note || "Yok"}

ÇIKTI KURALI:
JSON YAZMA.
Kod bloğu yazma.
Markdown tablosu yazma.
Ham veri yazma.
Sadece kullanıcıya gösterilecek temiz Türkçe analiz raporu yaz.

YEMEK FOTOĞRAFI ANALİZİNDE MUTLAKA ŞUNLAR OLACAK:
- Dünya mutfağı tahmini
- Görünen yemekler
- Porsiyon tahmini
- Toplam kalori aralığı
- Protein aralığı
- Karbonhidrat aralığı
- Yağ aralığı
- Lif aralığı
- Su oranı
- Vitamin/mineral kalitesi
- Yağ yakımı uyumu
- Kas koruma uyumu
- Günün kalan öğün önerisi
- Net koç yorumu

ASLA SADECE YEMEK İSMİ YAZIP BIRAKMA.

DÜNYA MUTFAĞI TANIMA:
Fotoğraftaki yemeği şu mutfaklardan en uygun olana bağla:
Türk, İtalyan, Japon, Çin, Kore, Meksika, Hint, Arap/Orta Doğu, Akdeniz, Amerikan, Fransız, Yunan, İspanyol, Tayland, Balkan, Dünya/Karışık.

Eğer kesin değilse en yakın tahmini yaz.
“Bilinmiyor” deme.

KALORİ VE MAKRO TAHMİN MANTIĞI:
Fotoğrafta gramaj net değilse görsele göre tahmin yap.
Kesin değer verme, aralık ver.

Porsiyon rehberi:
- Ana yemek küçük: 100-180 g
- Ana yemek orta: 180-300 g
- Ana yemek büyük: 300-500 g
- Çorba küçük: 150-220 ml
- Çorba orta: 200-300 ml
- Tatlı küçük: 60-120 g
- Tatlı orta: 100-180 g

Besin mantığı:
- Mantı, makarna, pilav, ekmek, hamur işi: karbonhidrat yüksek
- Tatlı: karbonhidrat/şeker yüksek
- Kızartma, krema, peynir, yağlı sos, tereyağı: yağ yüksek
- Et, tavuk, balık, yumurta, yoğurt, peynir: protein kaynağı
- Çorba: su oranı yüksek
- Salata/sebze: lif, vitamin ve mineral katkısı sağlar

FORMAT:
Aşağıdaki formatı aynen kullan.
Kısa ama dolu yaz.
Metrikleri baskın göster.

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

ÖNEMLİ:
Fotoğrafta yemek görünüyorsa kalori, protein, karbonhidrat ve yağ alanlarını boş bırakma.
Gerçekçi tahmini aralık ver.
Örneğin:
Kalori: 750-1100 kcal
Protein: 22-35 g
Karbonhidrat: 90-140 g
Yağ: 25-45 g
`;
}

function getBodyPrompt(note) {
  return `
Sen CoachOS Body Analysis Engine v7'sin.

Kullanıcının yüklediği vücut fotoğrafını fitness hedefleri açısından analiz et.

Kullanıcı notu:
${note || "Yok"}

Kurallar:
- Tıbbi teşhis koyma.
- Kesin yağ oranı söyleme, tahmini aralık ver.
- Kimlik, yaş, etnik köken gibi hassas tahminler yapma.
- Kırıcı dil kullanma.
- Fitness, postür, yağ kaybı ve kas koruma odaklı değerlendir.
- JSON yazma.
- Temiz Türkçe rapor yaz.

Format:

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
          maxOutputTokens: 2200
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
    message: "Gemini API geçici olarak cevap veremedi veya tüm modeller başarısız oldu.",
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

    const result = extractText(geminiResult.data);

    return res.status(200).json({
      result: `Model: ${geminiResult.model}\n\n${result}`
    });

  } catch (error) {
    return res.status(500).json({
      error: "Gemini API hatası.",
      details: error
    });
  }
}
