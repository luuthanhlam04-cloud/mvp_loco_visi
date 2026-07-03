import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to shuffle array
function shuffle(array: any[]) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const lowerPrompt = (prompt || "").toLowerCase();

  // Đọc dữ liệu từ mock_hanoi_places.json thay vì dùng fix cứng
  const filePath = path.join(process.cwd(), 'data', 'mock_hanoi_places.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const allPlaces = JSON.parse(fileContent);

  // Phân tích từ khóa để chọn thể loại
  const categoriesToPick: string[] = [];
  if (lowerPrompt.match(/ăn|ẩm thực|đói|food|nhậu|bia|uống|cafe|chè|phở|bún/)) {
    categoriesToPick.push('Ẩm thực');
  }
  if (lowerPrompt.match(/lịch sử|di tích|cổ/)) {
    categoriesToPick.push('Di tích lịch sử');
  }
  if (lowerPrompt.match(/văn hóa|bảo tàng|nghệ thuật/)) {
    categoriesToPick.push('Văn hóa');
  }
  if (lowerPrompt.match(/tâm linh|đền|chùa|nhà thờ|cầu an/)) {
    categoriesToPick.push('Tâm linh');
  }
  if (lowerPrompt.match(/giải trí|chơi|vui|sôi động|club|bar/)) {
    categoriesToPick.push('Giải trí');
  }
  if (lowerPrompt.match(/cảnh quan|ngắm|thiên nhiên|chụp|sống ảo|cây/)) {
    categoriesToPick.push('Cảnh quan');
  }
  if (lowerPrompt.match(/mua sắm|chợ|mall|shopping|quần áo/)) {
    categoriesToPick.push('Mua sắm');
  }

  let candidates = allPlaces;
  if (categoriesToPick.length > 0) {
    // Lọc những địa điểm thuộc các category đã chọn
    candidates = allPlaces.filter((p: any) => categoriesToPick.includes(p.category));
    // Nếu quá ít địa điểm (ví dụ < 4), trộn thêm các địa điểm khác cho đủ
    if (candidates.length < 4) {
      const others = allPlaces.filter((p: any) => !categoriesToPick.includes(p.category));
      candidates = [...candidates, ...shuffle(others).slice(0, 4 - candidates.length)];
    }
  }

  // Xáo trộn để mỗi lần sinh kịch bản ra 1 kết quả khác nhau
  candidates = shuffle(candidates);
  
  // Chọn từ 5 đến 7 địa điểm
  const numPlaces = Math.floor(Math.random() * 3) + 5;
  const selectedPlaces = candidates.slice(0, numPlaces);

  // Sắp xếp lại lịch trình theo một logic thời gian giả lập
  let currentTime = 8 * 60; // Bắt đầu lúc 8:00 sáng
  
  if (lowerPrompt.match(/chiều|tối|đêm|night/)) {
     currentTime = 15 * 60; // Bắt đầu lúc 3:00 chiều nếu có từ khóa chiều/tối
  }

  const activities = selectedPlaces.map((p: any) => {
    const hours = Math.floor(currentTime / 60).toString().padStart(2, '0');
    const mins = (currentTime % 60).toString().padStart(2, '0');
    const timeStr = `${hours}:${mins}`;
    
    // Thời gian ở lại từ 45 - 120 phút tùy ngẫu nhiên
    const duration = Math.floor(Math.random() * 4) * 15 + 45; 
    
    // Cộng thêm thời gian di chuyển (khoảng 15-30 phút)
    currentTime += duration + (Math.floor(Math.random() * 2) * 15 + 15);
    
    return {
      place_id: p.place_id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      time: timeStr,
      duration: duration,
      category: p.category,
      description: p.description,
      image: p.image // Sử dụng ảnh đã được cập nhật
    };
  });
  
  const resultObj = {
    city: "Hà Nội",
    activities: activities
  };
  
  // Chuyển thành chuỗi JSON
  const resultJson = JSON.stringify(resultObj);
  
  // Cắt thành các khối nhỏ (chunk) để mô phỏng streaming AI
  const chunkSize = 150;
  const chunks: string[] = [];
  for (let i = 0; i < resultJson.length; i += chunkSize) {
    chunks.push(resultJson.substring(i, i + chunkSize));
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        await delay(150); // Trễ một chút để tạo hiệu ứng AI đang suy nghĩ và gõ chữ (nhanh hơn bản cũ một chút)
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
