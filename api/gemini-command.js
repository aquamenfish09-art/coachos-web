export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const { command, profile, targets } = req.body || {};

    if (!command) {
      return res.status(400).json({
        error: "Komut gerekli."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY Vercel Environment Variables içine eklenmemiş."
      });
    }

    const prompt = `
Sen CoachOS uygulamasının sesli/yazılı komut motorusun.

Kullanıcının komutunu analiz et ve sadece JSON döndür.

Kullanıcı komutu:
"${command}"

Kullanıcı profili:
${JSON.stringify(profile || {}, null, 2)}

Hedefler:
${JSON.stringify(targets || {}, null, 2)}

Uygulamadaki sayfalar:
- panel
- profil
- yemek
- vucut
- hafiza
- antrenman
- motivasyon
- rapor

Desteklenen action değerleri:
- open_page
- create_workout
- motivate
- show_memory
- show_report
- profile
- unknown

Kurallar:
- Sadece geçerli JSON döndür.
- Açıklama yazma.
- Kullanıcı selam verirse action "open_page", page "panel" olsun.
- Kullanıcı spora gitmek istemiyorsa action "motivate" olsun.
- Yemek, kalori, öğün, fotoğraf, yemek analizi diyorsa action "open_page", page "yemek" olsun.
- Vücut, yağ oranı, form, fotoğraf, vücut analizi diyorsa action "open_page", page "vucut" olsun.
- Hafıza, geçmiş, analizlerim diyorsa action "show_memory" olsun.
- Antrenman, spor programı diyorsa action "create_workout" olsun.
- Rapor, puan, günlük durum diyorsa action "show_report" olsun.
- Profil, boy, kilo, yaş diyorsa action "open_page", page "profil" olsun.
- message alanı kısa Türkçe cevap olsun.

JSON formatı:
{
  "action": "open_page",
  "page": "panel",
  "message": "Kısa Türkçe cevap"
}
`;

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
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
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
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "{}";

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        action: "unknown",
        page: "panel",
        message: raw || "Komut anlaşılamadı."
      };
    }

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: "Sunucu hatası.",
      details: error.message
    });
  }
}
