export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST isteği kabul edilir." });
  }

  try {
    const { image, mode, note } = req.body;

    if (!image || !mode) {
      return res.status(400).json({
        error: "Fotoğraf ve analiz tipi gerekli."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY Vercel Environment Variables içine eklenmemiş."
      });
    }

    let prompt = "";

    if (mode === "meal") {
      prompt = `
Sen CoachOS yemek görsel analiz motorusun.

Görev:
Kullanıcının yüklediği yemek fotoğrafını fitness/beslenme açısından analiz et.
Kullanıcı notu: ${note || "Yok"}

Kurallar:
- Türkçe cevap ver.
- Kesin değer verme, tahmini aralık ver.
- Gramaj görünmüyorsa bunu belirt.
- Tıbbi tavsiye verme.
- Kullanıcıyı korkutma.
- Kısa, net ve uygulanabilir cevap ver.

Cevap formatı:

Yemek Analizi:

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
    } else if (mode === "body") {
      prompt = `
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
    } else {
      return res.status(400).json({
        error: "Geçersiz analiz tipi. mode 'meal' veya 'body' olmalı."
      });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              },
              {
                type: "input_image",
                image_url: image
              }
            ]
          }
        ]
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return res.status(500).json({
        error: "OpenAI API hatası.",
        details: data
      });
    }

    const result =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "Analiz sonucu alınamadı.";

    return res.status(200).json({ result });

  } catch (error) {
    return res.status(500).json({
      error: "Sunucu hatası.",
      details: error.message
    });
  }
}
