export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { audioUrl, imageUrl } = req.body;

    // Example SadTalker API call (replace with their real endpoint)
    const response = await fetch("https://api.sadtalker.org/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SADTALKER_API_KEY}`
      },
      body: JSON.stringify({
        audio: audioUrl,
        image: imageUrl
      })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("SadTalker API error:", error);
    return res.status(500).json({ error: "Failed to generate video" });
  }
}
