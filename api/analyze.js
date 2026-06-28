export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, mode } = req.body;

    if (!image || !mode) {
      return res.status(400).json({ error: "image ve mode gerekli" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY tanımlı değil" });
    }

    let prompt = "";

    if (mode === "meal") {
      prompt = `
Bu bir yemek fotoğrafı analizi görevidir.
Cevabı Türkçe ver.
Kesin iddia kurma, tahmini aralık kullan.

Şu formatı kullan:

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
Kısa ama net yorum yap.

Günün kalan önerisi:
- Protein için öneri
- Karbonhidrat/yağ dengeleme önerisi
- Su önerisi

Güvenlik notu:
Bu analiz fotoğrafa göre tahminidir; kesin değer için gramaj gerekir.
`;
    } else if (mode === "body") {
      prompt = `
Bu bir fitness odaklı görsel vücut analizi görevidir.
Cevabı Türkçe ver.
Tıbbi teşhis koyma.
Kesin yağ oranı iddiasında bulunma.
Fotoğrafa göre tahmini değerlendirme yap.

Şu formatı kullan:

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
      return res.status(400).json({ error: "Geçersiz mode" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
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
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: image }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI API hatası",
        details: data
      });
    }

    const output =
      data.output_text ||
      "Analiz sonucu alınamadı.";

    return res.status(200).json({ result: output });

  } catch (error) {
    return res.status(500).json({
      error: "Sunucu hatası",
      details: error.message
    });
  }
}
