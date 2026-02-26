# Bảng Điều Khiển JBL KX-180 (Bridge Control Panel)

Một giao diện điều khiển hiện đại, hiệu suất cao chạy trên nền web dành cho mixer kỹ thuật số **JBL KX-180**. Dự án này cho phép bạn điều khiển mixer từ bất kỳ thiết bị nào (Điện thoại, Máy tính bảng, PC) trong cùng mạng nội bộ.

## 🌟 Các Tính Năng Chính
- **Điều Khiển Thời Gian Thực:** Đồng bộ hóa âm lượng, EQ và hiệu ứng ngay lập tức trên tất cả các thiết bị đang kết nối.
- **Giao Diện Hiện Đại:** Thiết kế cao cấp với chế độ **Sáng & Tối** (Có thể chọn trong phần Cài đặt).
- **Khả Năng Trộn Âm Toàn Diện:**
  - Âm lượng tổng (Nhạc, Mic, Hiệu ứng, Center, Sub).
  - Điều khiển từng kênh riêng biệt (Mic 1, Mic 2).
  - EQ Nhạc và Micro 15-băng tần.
  - Tùy chỉnh Echo & Reverb nâng cao + EQ Hiệu ứng 5-băng tần.
- **Gọi Cấu Hình (Preset):** Hỗ trợ tất cả 10 cấu hình phần cứng (P01-P07 + POP/PRO/STE).
- **Đồng Bộ Đa Thiết Bị:** Thay đổi trên một thiết bị sẽ được cập nhật ngay lập tức trên các thiết bị khác.
- **Tối Ưu Cho Raspberry Pi:** Có thể chạy như một server điều khiển riêng biệt, giúp giải phóng máy tính của bạn.

## 🏗️ Kiến Trúc Hệ Thống
- **Bridge Server (`bridge.cjs`):** Backend chạy trên Node.js sử dụng thư viện `node-hid` để giao tiếp với mixer qua cổng USB. Nó đóng vai trò là "Nguồn dữ liệu gốc" thông qua Socket.io.
- **Giao Diện Web:** Ứng dụng React được xây dựng với Vite, tối ưu hóa cho cả chế độ màn hình ngang và dọc trên các thiết bị di động.

## 🚀 Hướng Dẫn Cài Đặt

### Yêu Cầu Hệ Thống
- Node.js phiên bản 18 trở lên.
- Kết nối USB với JBL KX-180.

### Cài Đặt trên Windows PC
1. Tải mã nguồn về:
   ```bash
   git clone https://github.com/cccgi/jbl-kx180.git
   cd jbl-kx180/web-ui
   ```
2. Cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Chạy Bridge Server:
   ```bash
   node bridge.cjs
   ```
4. Chạy Giao diện Web:
   ```bash
   npm run dev
   ```

### Cài Đặt trên Raspberry Pi
Vui lòng tham khảo **[Hướng dẫn cài đặt Raspberry Pi](setup-rpi.md)** chi tiết.
1. Chạy lệnh `sudo bash setup-rpi.sh` để cài đặt các thành phần cần thiết và cấu hình quyền truy cập USB.
2. Khởi động server và giao diện theo hướng dẫn trong file.

## ⚙️ Cách Sử Dụng
- **Kết Nối:** Mở phần Cài đặt ⚙️ và nhấn **"LOCK HARDWARE"** để thiết lập kết nối USB.
- **Giao Diện:** Chuyển đổi giữa chế độ Sáng (Light) và Tối (Dark) trong phần Cài đặt.
- **Truy Cập Từ Xa:** Để điều khiển từ điện thoại, hãy chạy lệnh `npm run dev -- --host` và truy cập địa chỉ `http://IP-CUA-MAY-TINH:5173`.

## 🛠️ Thông Tin Thêm
Dự án được phát triển dành cho cộng đồng người dùng KX-180. Hỗ trợ điều khiển mượt mà, ổn định và hiện đại hơn phần mềm gốc.
