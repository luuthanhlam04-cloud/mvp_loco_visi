import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { itinerarySchema } from '../../../lib/zod-schemas';
import { generateSystemPrompt } from '../../../lib/prompt-templates';

export const runtime = 'nodejs';

// Plan C: Fallback Itinerary
const FALLBACK_ITINERARY = {
  source: "fallback",
  city: "Hà Nội",
  activities: [
    { place_id: "lh_001", name: "Hồ Hoàn Kiếm", lat: 21.028511, lng: 105.854166, time: "08:00", duration: 90, image: "https://picsum.photos/seed/hoankiem/400/300" },
    { place_id: "lh_002", name: "Phố Cổ Hà Nội", lat: 21.0345, lng: 105.8492, time: "09:30", duration: 120, image: "https://picsum.photos/seed/phocohanoi/400/300" },
    { place_id: "lh_003", name: "Bún Chả Hương Liên", lat: 21.0182, lng: 105.8550, time: "12:00", duration: 60, image: "https://picsum.photos/seed/bunchahuonglien/400/300" },
    { place_id: "lh_004", name: "Nhà thờ Lớn Hà Nội", lat: 21.0287, lng: 105.8489, time: "14:00", duration: 60, image: "https://picsum.photos/seed/nhatholon/400/300" },
    { place_id: "lh_005", name: "Chùa Trấn Quốc", lat: 21.0480, lng: 105.8368, time: "15:30", duration: 90, image: "https://picsum.photos/seed/chuatranquoc/400/300" },
    { place_id: "lh_011", name: "Chợ Đồng Xuân", lat: 21.0384, lng: 105.8504, time: "17:30", duration: 60, image: "https://picsum.photos/seed/chodongxuan/400/300" },
    { place_id: "lh_013", name: "Kem Tràng Tiền", lat: 21.0253, lng: 105.8549, time: "19:00", duration: 30, image: "https://picsum.photos/seed/kemtrangtien/400/300" }
  ]
};

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const result = await streamObject({
      model: anthropic('claude-3-haiku-20240307'),
      system: generateSystemPrompt(),
      prompt,
      schema: itinerarySchema,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Claude API error:", error);
    // KHÔNG crash — trả về fallback itinerary
    return new Response(JSON.stringify(FALLBACK_ITINERARY), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
