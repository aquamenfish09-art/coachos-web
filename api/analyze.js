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
Sen CoachOS'un profesyonel yemek görsel analiz motorusun.

Kullanıcının yüklediği yemek fotoğrafını fitness, kilo verme, kas koruma ve günlük makro takibi açısından analiz edeceksin.

Kullanıcı notu:
${note || "Yok"}

ÇOK ÖNEMLİ KURALLAR:
- Sadece yemek isimlerini yazıp bırakma.
- Her analizde MUTLAKA kalori, protein, karbonhidrat, yağ, lif ve su oranı tahmini ver.
- Gramaj net görünmüyorsa yine de porsiyon görüntüsüne göre tahmini aralık ver.
- Emin değilsen "tahmini" de ama alanı boş bırakma.
- Kesin değer verme; aralık kullan. Örnek: 650-850 kcal.
- Tıbbi teşhis veya tedavi tavsiyesi verme.
- Cevabı Türkçe ver.
- Kısa ama dolu cevap ver.
- Fotoğrafta birden fazla yemek varsa ayrı ayrı belirt.
- En sonda toplam tahmini değerleri ver.

Cevap formatını AYNEN böyle kullan:

Yemek Analizi:

1) Görünen yemekler:
- Yemek 1:
- Yemek 2:
- Yemek 3:

2) Porsiyon tahmini:
- Ana yemek:
- Yan ürünler:
- Tatlı / içecek varsa:

3) Tahmini toplam kalori:
- Toplam: ... kcal arası

4) Tahmini makrolar:
- Protein: ... g arası
- Karbonhidrat: ... g arası
- Yağ: ... g arası
- Lif: ... g arası

5) Tahmini su oranı:
- Yemekteki su oranı: ... /10
- Açıklama:

6) Vitamin / mineral kalitesi:
- Kalite: ... /10
- Güçlü taraf:
- Zayıf taraf:

7) Diyet uyumu:
- Yağ yakımı için: ... /10
- Kas koruma için: ... /10
- Dikkat edilmesi gereken:

8) Koç yorumu:
Kısa ve net yorum yap.

9) Günün kalan önerisi:
- Protein:
- Karbonhidrat:
- Yağ:
- Su:
- Sonraki öğün önerisi:

10) Güvenlik notu:
Bu analiz fotoğrafa göre tahminidir. Kesin değer için gramaj gerekir.

Örnek yaklaşım:
Fotoğrafta mantı, çorba ve tatlı görünüyorsa sadece "mantı, çorba, tatlı" yazma. Mantının yoğurt/sos kaynaklı yağ ve karbonhidratını, çorbanın su oranını, tatlının şeker/karbonhidrat etkisini mutlaka değerlendir.
`;
}

function getBodyPrompt(note) {
  return `
Sen CoachOS görsel vücut analiz motorusun.

Kullanıcının yüklediği vücut fotoğrafını fitness hedefleri açısından analiz et.
Kullanıcı notu:
${note || "Yok"}

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

1) Tahmini yağ oranı:
- ... arası

2) Kas kütlesi görünümü:
-

3) Güçlü bölgeler:
-

4) Gelişmesi gereken bölgeler:
-

5) Postür / duruş:
-

6) Hedefe göre yorum:
-

7) 90 Günlük Strateji:
- Kalori:
- Protein:
- Antrenman:
- Kardiyo/adım:
- Uyku/su:

8) Net koç yorumu:
Kısa, motive edici ama disiplinli kapanış yap.

9) Güvenlik notu:
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
            temperature: 0.15,
            maxOutputTokens: 1800
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
