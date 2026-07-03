# **TÀI LIỆU KIẾN TRÚC & TRIỂN KHAI DỰ ÁN: LOCO**

## **Phiên bản V3 — MVP Sinh tồn 48h (Đã tích hợp Stress Test V2)**

---

## **PHẦN 1: KIẾN TRÚC HỆ THỐNG TỔNG THỂ**

### **1\. TẦNG FRONTEND (GIAO DIỆN & TRẢI NGHIỆM)**

**Nền tảng:** Next.js (App Router) sử dụng Turbopack nhằm tối ưu hóa tốc độ hot-reload trong 48 giờ chạy nước rút.

**Ngôn ngữ:** TypeScript. Định nghĩa strict Interface/Type cho các Object (Itinerary, Activity, Place) kèm theo Zod Schema ở tầng backend để đảm bảo render stream không bị lỗi kiểu dữ liệu.

**UI/UX Framework:** Tailwind CSS theo phong cách **"Indochine Nostalgia"** (Vàng hoàng thổ, Xanh rêu đại ngàn, Trắng giấy bản, Đen than). Xử lý triệt để lỗi Hydration Mismatch bằng cờ isHydrated — các component nhận stream bắt buộc bọc trong điều kiện kiểm tra hydration trước khi render nội dung động, tránh Flash of Unstyled Content (FOUC).

**Bản đồ & Tương tác:** Mapbox GL JS nhúng vào React. Sử dụng **Preset Style có sẵn** (mapbox://styles/mapbox/outdoors-v12) kết hợp override CSS overlay màng lọc màu vintage, bỏ qua việc thiết kế custom trên Mapbox Studio. **Không sử dụng kỹ thuật Debounce cho flyTo()** vì Debounce 1.5s gây ra UX trap (bản đồ không di chuyển khi activities mọc dần → user nghĩ bản đồ hỏng). Thay vào đó, áp dụng chiến lược **Trailing Callback 500ms** — flyTo đến activity mới nhất ngay khi có activity mới với animation duration ngắn (500ms), hoặc **đồng bộ hóa Map với Timeline scroll position** (map chỉ di chuyển khi user scroll timeline, không phản ứng với stream).

**Quản lý trạng thái:** Sử dụng hook useObject từ **Vercel AI SDK** để hứng luồng HTTP Stream.

**Hình ảnh địa điểm:** **KHÔNG sử dụng Unsplash API.** Ảnh minh họa được lấy từ một trong hai nguồn: (a) trường image đã được embed trực tiếp trong mock\_hanoi\_places.json dưới dạng URL tĩnh hoặc base64, hoặc (b) sử dụng Picsum với seed cố định (https://picsum.photos/seed/{keyword}/400/300) làm placeholder. Không có HTTP request động đến bất kỳ service ảnh bên thứ ba nào trong luồng chính.

### **2\. TẦNG BACKEND (BỘ NÃO XỬ LÝ)**

**Nền tảng:** Node.js **(Standard Runtime)**. Khai báo export const runtime \= 'nodejs'; trong API Route. Không dùng Edge Runtime để tránh rủi ro tương thích thư viện ngầm (fs, Buffer, một số npm packages không được bundle).

**Kiến trúc:** Serverless RESTful API hỗ trợ truyền tải dữ liệu dạng HTTP Text Stream qua Vercel AI SDK.

**Kiểm soát dữ liệu & Lỗi (Error Handling):** Sử dụng Zod Schema validate đầu vào/ra. Bắt buộc bọc luồng stream trong block try/catch. Khai báo hàm onError của Vercel AI SDK để trả về thông báo lỗi thay vì crash toàn bộ Frontend. **Quan trọng:** Zod Schema sử dụng z.coerce cho các trường số (ví dụ: duration) để tự động parse chuỗi thành số ("2 tiếng" → 2, "90 phút" → 90), tránh validation fail khi Claude trả về JSON hơi lệch định dạng.

**Bảo mật:** Đặt toàn bộ API Key trong file .env.local phía Server-side. TUYỆT ĐỐI KHÔNG commit .env hoặc hardcode key trong source code.

### **3\. TẦNG LOGIC CHUYÊN SÂU / AI (CORE ENGINE)**

**Luồng xử lý chính (Text-to-Itinerary Pipeline):**

1. Nhận prompt văn bản từ người dùng.  
2. Backend nạp file Mock Data địa điểm ngách đã được **hardcode sẵn tọa độ (lat/lng)**.  
3. Gửi toàn bộ dữ liệu kèm System Prompt cho Claude API. **Giới hạn tối đa 20-25 địa điểm** trong context để tiết kiệm token budget (1 request với 20 địa điểm ≈ 1500-2000 input tokens; output ≈ 500-800 tokens; với $4.78 ≈ 1200K tokens @ $3.50/1M → khoảng 150-200 requests tổng).  
4. Trả về luồng stream JSON.

**Fallback tự động:** Nếu Claude API fail hoặc hết quota, backend trả về FALLBACK\_ITINERARY (hardcoded) thay vì crash. Frontend render fallback itinerary bình thường, không hiển thị lỗi cho user.

**Công nghệ/Thư viện:** Anthropic Claude API (claude-haiku-4-5-20251001 cho dev, claude-sonnet-4-6 cho live demo). Package: @ai-sdk/anthropic.

### **4\. TẦNG DỮ LIỆU & LƯU TRỮ (DATA & STORAGE)**

**Database chính:** **Cắt bỏ hoàn toàn Vercel Postgres/Supabase** để tránh phình scope (tiết kiệm 6-8h setup). Tính năng "Xem lại lịch sử" sử dụng Web Storage API (LocalStorage) của trình duyệt.

**Giới hạn LocalStorage:** LocalStorage bị giới hạn \~5MB. Để tránh QuotaExceededError, bắt buộc tuân thủ:

* MAX\_HISTORY \= 5 — chỉ lưu tối đa 5 chuyến đi gần nhất  
* Khi lưu history mới: kiểm tra size, nếu vượt quota thì xóa chuyến đi cũ nhất  
* User được thông báo nếu history bị xóa do quota

**Mock Data:** Dữ liệu **20-25 địa điểm ngách** tại Hà Nội, lưu tĩnh trong mock\_hanoi\_places.json. Tọa độ (lat/lng) được tra thủ công và hardcode thẳng vào file JSON. **KHÔNG sử dụng Nominatim Geocoding realtime** để tránh rủi ro Rate Limit (1 request/giây). Mỗi địa điểm trong mock data chứa sẵn trường image (URL tĩnh hoặc base64 placeholder), không cần gọi API bên ngoài để lấy ảnh.

### **5\. HẠ TẦNG VÀ TRIỂN KHAI (INFRASTRUCTURE)**

**Môi trường biến:** Quản lý tập trung qua .env.local:

ANTHROPIC\_API\_KEY=sk-ant-...        \# Claude API — bảo mật tuyệt đối

NEXT\_PUBLIC\_MAPBOX\_ACCESS\_TOKEN=pk... \# Mapbox — được phép public

OWM\_API\_KEY=...                      \# OpenWeatherMap — chỉ gọi 1 lần, cache 30 phút

\# UNSPLASH\_ACCESS\_KEY=...           \# ĐÃ CẮT — không dùng trong MVP

**Hosting:** Vercel.

### **6\. BẢNG TỔNG HỢP API & DỊCH VỤ (API ECOSYSTEM)**

| Tên API / Dịch vụ | Chi phí | Lý do lựa chọn & Cách áp dụng an toàn cho MVP |
| ----- | ----- | ----- |
| **Claude API (Anthropic)** | Quỹ $4.78 có sẵn | Đóng vai trò "bộ não" phân tích prompt và stream JSON. Rủi ro lỗi stream được bọc bằng try/catch. Fallback itinerary tự động kích hoạt khi API fail. |
| **OpenWeatherMap API** | Miễn phí (1.000 req/ngày) | Đổi tone màu UI. **Chỉ gọi 1 lần duy nhất** cho Hà Nội khi app khởi động. Lưu Cache memory 30 phút. Tuyệt đối không gọi theo từng activity. Nếu OWM fail → dùng weather state mặc định (nắng, 25°C). |
| **Mapbox GL JS** | Miễn phí (50.000 lượt/tháng) | Hiển thị bản đồ. Dùng Preset style. Map di chuyển theo Trailing Callback 500ms, đồng bộ với scroll position của Timeline. |
| **Picsum Photos** | Miễn phí (Không giới hạn rõ ràng) | Thay thế Unsplash. Dùng URL cố định https://picsum.photos/seed/{keyword}/400/300 làm placeholder ảnh địa điểm. Không cần API key, không rate limit đáng kể. |
| **Unsplash API** | **ĐÃ CẮT** | Không sử dụng cho MVP — Free Tier 50 req/giờ quá dễ trigger, không có caching strategy, gây nguy cơ ảnh placeholder fail giữa demo. |

---

## **PHẦN 2: CHI TIẾT LUỒNG TÍNH NĂNG (FEATURES)**

### **2.1. Tính năng Khởi tạo Lịch trình và Bản đồ Real-time (Streaming Itinerary)**

**Luồng xử lý UI:** Người dùng nhập yêu cầu, hệ thống chuyển sang giao diện Split-screen. Các thẻ hoạt động (Card) "mọc" ra theo thời gian thực nhờ useObject. Giao diện xử lý Hydration mượt mà, hiển thị Skeleton load tĩnh trước khi stream bắt đầu.

**Xử lý UX cho Bản đồ — Chiến lược Trailing Callback 500ms:**

Thay vì dùng Debounce 1.5s (gây UX trap — bản đồ đứng yên trong khi timeline mọc activities), áp dụng hai cơ chế song song:

**Cơ chế A — Trailing Callback (mặc định):** Mỗi khi một activity mới được thêm vào Timeline, gọi flyTo() ngay với animation ngắn:

mapRef.current?.flyTo({

  center: \[lng, lat\],

  duration: 500,    // Animation ngắn, không gây lag

  essential: true

});

→ Bản đồ di chuyển mượt theo từng activity, không nhảy loạn xạ.

**Cơ chế B — Sync với Timeline Scroll (ưu tiên UX hơn):** Map chỉ thay đổi khi user scroll Timeline:

// Trong ItineraryTimeline.tsx

const handleActivityVisible \= (activity: Activity) \=\> {

  mapRef.current?.flyTo({

    center: \[activity.lng, activity.lat\],

    duration: 800,

    essential: true

  });

};

→ User đọc activity nào trên Timeline → Map bay đến điểm đó. Stream không làm map nhảy lung tung.

### **2.2. Xử lý Ràng buộc Dữ liệu & Error Fallback**

**Chống Hallucination:** Nén chặt file mock\_hanoi\_places.json (20-25 địa điểm) vào System Prompt. Claude chỉ được phép chọn địa điểm nằm trong danh sách này.

**Graceful Error Handling:** Nếu Claude API gặp lỗi mạng, đứt stream, hoặc hết quota:

* Hook onError ở Server bắt lỗi và trả về thông báo chuẩn hóa  
* Frontend hiển thị popup thông báo và **tự động render FALLBACK\_ITINERARY**  
* User không nhận ra có lỗi xảy ra phía backend

### **2.3. Sơ đồ luồng dữ liệu tối ưu (Sequence Logic)**

### **![][image1]2.4. Chiến lược Fallback Đa Tầng (Plan A / B / C)**

Đây là cơ chế **bắt buộc** phải implement — không có ngoại lệ. Mục tiêu: **Zero downtime** trong suốt buổi demo.

#### **Plan A — Happy Path (Xác suất: 80%)**

**Kích hoạt:** Claude API hoạt động bình thường, stream không bị gián đoạn.

1. User nhập: *"2 ngày cuối tuần ở Hà Nội, thích ăn uống và chụp ảnh"*  
2. Backend gọi Claude API với mock data (20-25 địa điểm)  
3. Timeline stream → activities mọc dần (mỗi card hiện tên, thời gian, hình ảnh từ mock data)  
4. Mapbox nhận tọa độ → markers xuất hiện → flyTo() mượt 500ms  
5. Weather tone → nền UI có màu phù hợp thời tiết Hà Nội  
6. User scroll timeline → Map đồng bộ di chuyển đến điểm đang xem  
7. Sau khi hoàn thành, itinerary được lưu vào LocalStorage (MAX\_HISTORY \= 5\)

#### **Plan B — Slow Response (Xác suất: 15%)**

**Kích hoạt:** Claude API cold start chậm hoặc network latency cao (5-15 giây không có response).

1. User bấm "Dệt Lộ Trình"  
2. Hiển thị Skeleton Loading (0-3s)  
3. Sau 3s không có data: hiển thị message *"Đang dệt lộ trình đặc biệt cho bạn..."*  
4. Sau 10s vẫn không có data: **tự động chuyển sang Plan C**  
5. Frontend không hiện bất kỳ lỗi kỹ thuật nào

#### **Plan C — Hard Fail (Xác suất: 5%)**

**Kích hoạt:** Claude API fail hoàn toàn (lỗi mạng, hết quota, rate limit, invalid response, Zod validation fail).

**Backend (route.ts):**

const FALLBACK\_ITINERARY \= {

  source: "fallback",

  city: "Hà Nội",

  activities: \[

    { place\_id: "lh\_001", name: "Hồ Hoàn Kiếm", lat: 21.0285, lng: 105.8542, time: "08:00", duration: 90, image: "https://picsum.photos/seed/hoankiem/400/300" },

    { place\_id: "lh\_002", name: "Phố Cổ Hà Nội", lat: 21.0345, lng: 105.8492, time: "09:30", duration: 120, image: "https://picsum.photos/seed/phocohanoi/400/300" },

    { place\_id: "lh\_003", name: "Bún Chả Hương Liên", lat: 21.0312, lng: 105.8515, time: "12:00", duration: 60, image: "https://picsum.photos/seed/bunchaha/400/300" },

    { place\_id: "lh\_004", name: "Nhà thờ Lớn Hà Nội", lat: 21.0033, lng: 105.8423, time: "14:00", duration: 60, image: "https://picsum.photos/seed/nhatholonoi/400/300" },

    { place\_id: "lh\_005", name: "Chùa Trấn Quốc", lat: 21.0485, lng: 105.8342, time: "15:30", duration: 90, image: "https://picsum.photos/seed/chuatranquoc/400/300" },

    { place\_id: "lh\_006", name: "Hàng Mã \- Hàng Đào", lat: 21.0378, lng: 105.8478, time: "17:30", duration: 60, image: "https://picsum.photos/seed/hangma/400/300" },

    { place\_id: "lh\_007", name: "Kem Tràng Tiền", lat: 21.0245, lng: 105.8548, time: "19:00", duration: 30, image: "https://picsum.photos/seed/kemtrangtien/400/300" }

  \]

};

export async function POST(req: Request) {

  try {

    const { prompt } \= await req.json();

    // ... luồng streamObject bình thường

    const result \= await streamObject({ ... });

    return result.toDataStreamResponse();

  } catch (error) {

    // KHÔNG crash — trả về fallback itinerary

    console.error("Claude API error:", error);

    return new Response(JSON.stringify(FALLBACK\_ITINERARY), {

      status: 200,

      headers: { "Content-Type": "application/json" }

    });

  }

}

**Frontend (ItineraryTimeline.tsx):**

// Nhận stream như bình thường

const { object, error } \= useObject({

  api: '/api/generate',

  schema: itinerarySchema,

});

useEffect(() \=\> {

  if (object) {

    setActivities(object.activities || \[\]);

  }

  // Nếu API trả về fallback (object.source \=== "fallback"), 

  // hiển thị badge nhẹ: "Lộ trình gợi ý từ LOCO"

  // KHÔNG hiện popup lỗi

}, \[object, error\]);

**Kết quả:** User thấy một lịch trình hoàn chỉnh với 7 điểm đến iconic của Hà Nội, bản đồ hoạt động, mọi thứ bình thường. Không ai biết Claude đã fail.

---

## **PHẦN 3: KẾ HOẠCH THỰC THI CHẠY NƯỚC RÚT (48H TIMELINE)**

### **3.1. Phân bổ công việc (KPIs)**

| Thành viên | Trách nhiệm chính | Công cụ & Mảng phụ trách |
| ----- | ----- | ----- |
| **Hoàng Thanh Tùng** | **Frontend / UI/UX / Map** | Xử lý Hydration (isHydrated), Timeline Component nhận stream, Mapbox Preset \+ CSS Vintage overlay, Trailing Callback flyTo (500ms) hoặc Sync với Timeline scroll, OpenWeatherMap Cache (1 lần, 30 phút), Picsum placeholder images. |
| **Lê Thanh Lâm** | **Backend / AI / Mock Data** | Hardcode lat/lng vào mock\_hanoi\_places.json (20-25 địa điểm). Cấu hình Node.js Standard Runtime. System Prompt (giới hạn 25 địa điểm). Zod Schema với z.coerce. Luồng Stream useObject \+ try/catch \+ onError. FALLBACK\_ITINERARY implementation. |

### **3.2. Timeline "Sống còn" (Must do — Ưu tiên từ trên xuống)**

**G+0 → G+4h (Setup Cốt lõi — KHÔNG được trễ):**

* **Lâm:** Hoàn thiện mock\_hanoi\_places.json (20-25 địa điểm, mỗi điểm có sẵn lat/lng và image URL từ Picsum). Setup Next.js, cài đặt vercel/ai, @ai-sdk/anthropic, zod.  
* **Lâm:** Viết zod-schemas.ts với z.coerce.number() cho các trường duration, lat, lng.  
* **Lâm:** Setup .env.local — Claude API Key, Mapbox token, OWM API Key. **TUYỆT ĐỐI không commit file này.**  
* **Tùng:** Setup Mapbox với preset style, kiểm tra token. Chốt cứng schema.ts — không thay đổi sau G+4h.  
* **Tùng:** Chạy thử Picsum URL để xác nhận ảnh load đúng.

**G+4h → G+20h (Hoàn thiện MVP — Core Loop phải chạy trước G+20h):**

* **Lâm:** Viết System Prompt (giới hạn 25 địa điểm trong context). Test Claude streamObject trả về đúng schema JSON.  
* **Lâm:** Implement FALLBACK\_ITINERARY trong route.ts. Test bằng cách tắt Claude API — verify fallback trả về đúng.  
* **Tùng:** Timeline Component nhận stream qua useObject. Render activities mọc dần.  
* **Tùng:** Cắm markers lên Mapbox khi có activity mới. Implement Trailing Callback flyTo (500ms) hoặc scroll-sync.  
* **Cả team:** Integration test end-to-end — verify stream → render → map hoạt động liền mạch.

**G+20h → G+36h (Đánh bóng trải nghiệm):**

* **Tùng:** Code OpenWeatherMap fetch 1 lần / cache 30 phút \+ Weather Tone (default state nếu OWM fail).  
* **Tùng:** Hoàn thiện CSS Indochine Nostalgia — màu sắc, typography, spacing.  
* **Cả team:** LocalStorage history (MAX\_HISTORY \= 5, xử lý quota exceeded).  
* **Cả team:** Xử lý Loading state — skeleton \+ message "Đang dệt lộ trình..." sau 3s.

**G+36h → G+48h (Hardening & Rehearsal — KHÔNG code tính năng mới):**

* Fix bug (ưu tiên theo severity: crash \> visual glitch \> UX polish).  
* Deploy lên Vercel \+ test production URL.  
* **Rehearse Plan A / B / C**: Test thủ công cả 3 kịch bản fallback.  
* Chuẩn bị kịch bản nói chuyện: giải thích được luồng streaming, tại sao có fallback, tại sao không dùng database.

---

## **PHẦN 4: CẤU TRÚC THƯ MỤC DỰ ÁN (V3 — ĐÃ TỐI GIẢN)**

📁 loco-root  
├── 📄 .env.local                  \# API Keys: Claude, Mapbox, OWM. KHÔNG commit.  
├── 📄 .gitignore                  \# Chặn .env, .env.local, node\_modules  
├── 📄 next.config.mjs             \# Cấu hình Next.js  
├── 📄 tailwind.config.ts          \# Hệ màu Indochine Nostalgia (Phụ trách: Tùng)  
│  
├── 📁 app                         \# App Router  
│   ├── 📁 api  
│   │   └── 📁 generate  
│   │       └── 📄 route.ts        \# Backend: streamObject \+ try/catch \+ FALLBACK\_ITINERARY  
│   │                              \# (Phụ trách: Lâm) — Standard Node.js Runtime  
│   ├── 📄 layout.tsx              \# Root layout — font, metadata, isHydrated wrapper  
│   └── 📄 page.tsx                \# Frontend: Split-screen search \+ results  
│  
├── 📁 components                  \#   
│   ├── 📁 ui                      \# Button, Input, Skeleton (Phụ trách: Tùng)  
│   ├── 📄 ItineraryTimeline.tsx   \# Timeline nhận stream, scroll-sync với Mapbox  
│   │                              \# (Phụ trách: Tùng)  
│   ├── 📄 MapWindow.tsx           \# Mapbox Preset \+ Trailing flyTo 500ms  
│   │                              \# (Phụ trách: Tùng)  
│   └── 📄 WeatherToneWrapper.tsx  \# OWM 1 lần \+ Cache 30 phút \+ Default state  
│                                  \# (Phụ trách: Tùng)  
│  
├── 📁 data                        \#  
│   └── 📄 mock\_hanoi\_places.json  \# 20-25 địa điểm. Tọa độ cứng. Image URL từ Picsum.  
│                                  \# (Phụ trách: Lâm)  
│  
├── 📁 lib                         \#  
│   ├── 📄 prompt-templates.ts     \# System Prompt (giới hạn 25 địa điểm)  
│   │                              \# (Phụ trách: Lâm)  
│   ├── 📄 zod-schemas.ts          \# Zod Schema với z.coerce cho số  
│   │                              \# (Phụ trách: Lâm)  
│   └── 📄 storage.ts              \# LocalStorage helper: MAX\_HISTORY=5, quota handling  
│                                  \# (Phụ trách: Lâm)  
│  
└── 📄 package.json                \# vercel/ai, @ai-sdk/anthropic, zod, mapbox-gl,  
                                   \# @types/mapbox-gl, tailwindcss  
                                   \# KHÔNG cần unsplash SDK

---

## **PHẦN 5: QUY TRÌNH QUẢN LÝ SOURCE CODE (GIT WORKFLOW)**

Do team chỉ có 2 người, quy trình tối giản tối đa để tránh overhead:

1. **Nhánh main:** Chỉ dùng để deploy tự động trên Vercel. **KHÔNG push trực tiếp lên main** — mọi thay đổi phải qua PR.

2. **Nhánh feature:** Quy ước \[initials\]/\[tinh-nang\]. Ví dụ: tung/mapbox-flyto, lam/fallback-itinerary.

3. **Sync:** Merge qua PR 2 lần/ngày (sáng và chiều). Nếu có thay đổi schema.ts, **báo miệng ngay lập tức** trước khi commit — vì Tùng phụ thuộc vào schema này cho TypeScript types.

4. **PR Review:** Ít nhất 1 người còn lại review trước khi merge. Checkpoint: trước G+20h, core loop phải integrate thành công — không được merge breaking changes sau mốc này.

5. **Rollback:** Nếu G+36h phát hiện bug nghiêm trọng, revert về snapshot G+20h (core loop working). Không cố fix trong deadline — rollback and ship.

---

## **PHẦN 6: ƯU NHƯỢC ĐIỂM VÀ LƯU Ý KHI TRIỂN KHAI**

### **Ưu điểm (Selling Points)**

* **Trải nghiệm Streaming mượt mà:** Activities "mọc" dần trên Timeline, Mapbox di chuyển mượt theo Trailing Callback 500ms hoặc đồng bộ với scroll — không còn race condition hay UX trap.  
* **Zero Downtime với Fallback đa tầng:** Plan A/B/C đảm bảo ứng dụng không bao giờ hiện màn trắng. Ngay cả khi Claude fail hoàn toàn, user vẫn nhận được lịch trình Hà Nội 7 điểm iconic.  
* **Tối giản chi phí vận hành:** Không Database, không Geocoding Pipeline, không Custom Mapbox Style, không Unsplash API. Toàn bộ tài nguyên dồn vào core streaming loop.  
* **Token Budget an toàn:** Giới hạn 25 địa điểm trong context → \~150-200 requests với $4.78, đủ cho dev \+ demo.

### **Thách thức và Cảnh báo (Risks & Technical Debt)**

* **OWM Rate Limit:** *Giải pháp:* Fetch 1 lần khi app load. Lưu vào React Context/State với timestamp. Kiểm tra timestamp — nếu dưới 30 phút thì dùng lại. Default weather state (nắng, 25°C) nếu OWM fail.

* **LocalStorage Quota Exceeded:** *Giải pháp:* MAX\_HISTORY \= 5. Mỗi lần lưu mới, kiểm tra size JSON — nếu \> 4MB thì xóa item cũ nhất. Wrap trong try/catch để handle QuotaExceededError.

* **Zod Validation Fail gây Stream Crash:** *Giải pháp:* Sử dụng z.coerce.number() cho các trường số. Thêm .optional() hoặc .nullable() cho các trường không bắt buộc. Claude nếu trả về "2 tiếng" sẽ tự động parse thành 2.

* **Next.js Hydration Mismatch:** *Giải pháp:* Component nhận stream bọc trong if (\!isHydrated) return \<Skeleton/\>. Chỉ render nội dung động sau khi client-side hydration hoàn tất.

* **Token Budget hết giữa demo:** *Giải pháp:* FALLBACK\_ITINERARY trả về hardcoded itinerary ngay lập tức khi Claude API trả lỗi. User không nhận ra. Trước demo: kiểm tra số dư qua curl hoặc dashboard Anthropic.

* **Claude API Key bị leak vào logs:** *Giải pháp:* TUYỆT ĐỐI không hardcode key. Kiểm tra .gitignore đã chặn .env.local. Trước G+48h: grep \-r "ANTHROPIC\_API\_KEY" . để verify không có key trong source.

[image1]: <data:image/png;base64,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>