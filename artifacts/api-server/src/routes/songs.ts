import { Router } from "express";
import { db } from "@workspace/db";
import { songsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

router.get("/songs/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.trim().length < 2) return res.json([]);

  if (!YOUTUBE_API_KEY) {
    return res.json([
      {
        youtubeId: "dQw4w9WgXcQ",
        title: `Busca: "${q}" — Configure YOUTUBE_API_KEY para busca real`,
        channelName: "Demonstração",
        thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      },
    ]);
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", `${q} karaoke`);
    url.searchParams.set("type", "video");
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("maxResults", "10");
    url.searchParams.set("key", YOUTUBE_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);

    const data = (await response.json()) as {
      items: Array<{
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: { medium?: { url: string }; default?: { url: string } };
        };
      }>;
    };

    const results = (data.items || []).map((item) => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl:
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url ||
        `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
    }));

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "YouTube search failed");
    res.status(500).json({ error: "YouTube search failed" });
  }
});

export default router;
