export const runtime = 'nodejs';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const chunks = [
        '{"city":"Hà Nội",',
        '"activities":[',
        '{"place_id":"lh_001","name":"Hồ Hoàn Kiếm","lat":21.028511,"lng":105.854166,"time":"08:00","duration":90,"image":"https://picsum.photos/seed/hoankiem/400/300"},',
        '{"place_id":"lh_002","name":"Phố Cổ Hà Nội","lat":21.0345,"lng":105.8492,"time":"10:00","duration":120,"image":"https://picsum.photos/seed/phocohanoi/400/300"}',
        ']}'
      ];
      
      for (const chunk of chunks) {
        await delay(1000); // Delay 1 giây giữa các chunk để giả lập AI stream
        controller.enqueue(encoder.encode(chunk));
      }
      
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
