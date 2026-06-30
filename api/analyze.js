export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return null;
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

function getMealPrompt(note) {
  return `
Sen CoachOS yemek görsel analiz motorusun.

Görev:
Kullanıcının yüklediği yemek fotoğrafını fitness ve beslenme açısından analiz et.
Kullanıcı notu: ${note || "Yok"}

Kurallar:
- Türkçe cevap ver.
- Kesin değer verme, tahmini aralık ver.
- Gramaj net görünmüyorsa bunu belirt.
- Tıbbi tavsiye verme.
- Kullanıcıyı korkutma.
- Kısa, net ve uygulanabilir cevap ver.
- Kalori ve makroları tahmini aralıkla yaz.
- Eğer fotoğrafta birden fazla yemek varsa ayrı ayrı belirt.
- Yemekteki su oranını tahmini yaz.
- Vitamin/mineral kalitesini pratik dille açıkla.

Cevap formatı:

Yemek Analizi:

Görünen yemekler:
Tahmini kalori:
Protein:
Karbonhidrat:
Yağ:
Lif:
Su oranı:
Vitamin/mineral kalitesi:
Diyet uyumu: /10

Yorum:
Kısa ve net yorum yap.

Günün kalan önerisi:
- Protein için öneri
- Karbonhidrat/yağ dengeleme önerisi
- Su önerisi

Koç notu:
Disiplinli ama motive edici kısa kapanış yap.

Güvenlik notu:
Bu analiz fotoğrafa göre tahminidir; kesin değer için gramaj gerekir.
`;
}

function getBodyPrompt(note) {
  return `
Sen CoachOS görsel vücut analiz motorusun.

Görev:
Kullanıcının yüklediği vücut fotoğrafını fitness hedefleri açısından analiz et.
Kullanıcı notu: ${note || "Yok"}

Kurallar:
- Türkçe cevap ver.
- Tıbbi teşhis koyma.
- Kesin yağ oranı söyleme, tahmini aralık ver.
- Kişinin kimliğini, yaşını veya hassas özelliklerini tahmin etme.
- Görsele göre fitness odaklı değerlendirme yap.
- Kırıcı, aşağılayıcı veya utandırıcı dil kullanma.
- Hedef: yağ kaybı, kas koruma, postür ve antrenman stratejisi.
- Cevap motive edici ama gerçekçi olsun.

Cevap formatı:

Görsel Vücut Analizi:

Tahmini yağ oranı:
Kas kütlesi görünümü:
Güçlü bölgeler:
Gelişmesi gereken bölgeler:
Postür/duruş:
Hedefe göre yorum:

90 Günlük Strateji:
- Kalori:
- Protein:
- Antrenman:
- Kardiyo/adım:
- Uyku/su:

Net koç yorumu:
Kısa, motive edici ama disiplinli kapanış yap.

Güvenlik notu:
Bu analiz görsele göre tahminidir; tıbbi değerlendirme değildir.
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
            temperature: 0.35,
            maxOutputTokens: 1000
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

    const result =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim() ||
      "Analiz sonucu alınamadı.";

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
