# CẨM NANG CÂU HỎI VẤN ĐÁP & BẢO VỆ ĐỒ ÁN (DRIVE MINI)

Tài liệu này tổng hợp các câu hỏi giảng viên hay hỏi nhất khi bảo vệ đồ án DevOps & Cloud Computing cho đề tài **Lưu trữ và chia sẻ file (Drive mini)**, kèm câu trả lời chuẩn xác.

---

### CÂU 1: Tại sao hệ thống lại dùng cơ chế "Presigned URL" thay vì client upload trực tiếp qua API?
**Trả lời:**
- **Giải quyết nút thắt cổ chai (I/O Bottleneck):** Nếu client upload file lớn (50MB - 100MB) qua API, Node.js API server phải nhận toàn bộ luồng dữ liệu (stream/buffer) rồi mới gửi tiếp sang MinIO. Điều này làm tốn gấp đôi băng thông và chiếm dụng CPU/RAM của API, khiến các request thông thường khác (như đăng nhập, lấy danh sách file) bị nghẽn (blocked).
- **Tối ưu hóa kiến trúc Cloud-Native:** Với Presigned URL:
  1. API chỉ làm nhiệm vụ xác thực (Auth), kiểm tra hạn mức lưu trữ (Quota), và dùng AWS S3 SDK tạo một URL có chữ ký số (HMAC-SHA256) với thời hạn ngắn (15 phút). Thao tác này chỉ mất vài mili-giây.
  2. Client tự tải file trực tiếp lên MinIO. API hoàn toàn không phải gánh dữ liệu file nặng.
  3. Sau khi upload xong, client gửi request `confirm` để API lưu metadata vào PostgreSQL.

---

### CÂU 2: Hàng đợi (Queue) và Worker tạo Thumbnail hoạt động như thế nào? Xử lý lỗi ra sao?
**Trả lời:**
- **Kiến trúc bất đồng bộ (Asynchronous Event-Driven):**
  + Khi client confirm upload một file có MIME type là hình ảnh (`image/jpeg`, `image/png`...), API lập tức đẩy một job dạng JSON vào hàng đợi Redis (`thumbnail_jobs`) qua lệnh `RPUSH`.
  + Phía sau, Worker chạy độc lập bằng lệnh `BLPOP` liên tục lắng nghe hàng đợi.
  + Worker lấy ảnh gốc từ MinIO bucket `drive-files`, dùng thư viện `sharp` (viết bằng C++ libvips cực nhanh) để resize thành ảnh thu nhỏ 256x256 pixel định dạng WebP chất lượng 80% (vừa nhẹ vừa đẹp).
  + Worker lưu ảnh kết quả vào bucket `drive-thumbnails`, sau đó cập nhật database: `thumb_status = 'ready'`.
- **Cơ chế xử lý lỗi (Fault Tolerance & Retry):**
  + Nếu MinIO bận hoặc mạng chập chờn, Worker bắt ngoại lệ và tự động tăng biến `retryCount`.
  + Áp dụng thuật toán Backoff thời gian chờ và đẩy lại job vào hàng đợi để thử lại tối đa **3 lần**.
  + Nếu quá 3 lần vẫn lỗi, Worker cập nhật trạng thái trong database là `thumb_status = 'failed'` để không làm nghẽn hệ thống.

---

### CÂU 3: Tại sao phải giới hạn dung lượng upload tại tầng Ingress (Nginx) mà không chỉ kiểm tra trong code API?
**Trả lời:**
- **Nguyên lý phòng thủ từ cổng vào (Edge Defense):** Nếu chỉ kiểm tra kích thước trong code API, request độc hại hoặc file quá lớn đã đi qua mạng, đi vào container và tiêu tốn tài nguyên xử lý socket của backend trước khi bị từ chối.
- **Bảo vệ chống tấn công DoS/DDoS:** Ingress Controller (Nginx) đứng ở vị trí Gateway đón nhận traffic đầu tiên. Khi cấu hình `proxy-body-size: 100m` (hoặc `client_max_body_size 100M`), Nginx sẽ tự động kiểm tra header `Content-Length` ngay khi request vừa tới. Nếu vượt quá 100MB, Nginx lập tức ngắt kết nối và phản hồi mã lỗi `HTTP 413 Payload Too Large`, bảo vệ toàn diện các container phía trong.

---

### CÂU 4: Cơ chế sao lưu (Backup) Object Storage MinIO hoạt động như thế nào?
**Trả lời:**
- Sử dụng **Kubernetes CronJob** chạy định kỳ (lúc 2h sáng hàng ngày hoặc theo lịch cấu hình) với image chính thức `minio/mc` (MinIO Client).
- CronJob thực thi lệnh:
  ```bash
  mc mirror --overwrite source/drive-files /backup/drive-files-backup/
  mc mirror --overwrite source/drive-thumbnails /backup/drive-thumbnails-backup/
  ```
- **Ưu điểm của `mc mirror`:**
  + Nó là cơ chế đồng bộ gia tăng (Delta sync): Nó chỉ sao chép các tệp mới hoặc tệp bị sửa đổi, không copy lại toàn bộ các file đã có ➔ Giảm thiểu tối đa thời gian sao lưu và băng thông lưu trữ.
  + Dữ liệu sao lưu được ghi vào một PersistentVolumeClaim riêng biệt (`backup-storage-pvc`) hoặc đồng bộ sang một cluster S3/MinIO dự phòng ở site khác.

---

### CÂU 5: Terraform đóng vai trò gì trong đồ án này?
**Trả lời:**
- Triển khai **Infrastructure as Code (IaC)**: Thay vì người quản trị phải vào từng giao diện web MinIO tạo bucket bằng tay hoặc gõ lệnh `kubectl` tạo volume thủ công (dễ quên, dễ sai sót giữa các môi trường dev, staging, prod), Terraform tự động hóa 100%:
  + Provider `aminueza/minio`: Tự động tạo 2 bucket chuẩn `drive-files` (private) và `drive-thumbnails` (public download policy).
  + Provider `hashicorp/kubernetes`: Tự động tạo Namespace `drive-mini`, Persistent Volume Claim cho PostgreSQL (`10Gi`) và MinIO (`50Gi`).
- Mọi hạ tầng được quản lý bằng code trong thư mục `infra/terraform/`, có thể tái tạo toàn bộ môi trường bất cứ lúc nào chỉ với lệnh `terraform apply`.

---

### CÂU 6: Cơ chế phân quyền và bảo mật khi chia sẻ file công khai hoạt động ra sao?
**Trả lời:**
- Mỗi khi người dùng bấm "Tạo link chia sẻ", hệ thống sinh một chuỗi token ngẫu nhiên an toàn 32 ký tự hex (`crypto.randomBytes(16)`).
- **Bảo mật mật khẩu:** Nếu người dùng đặt mật khẩu, mật khẩu sẽ được băm bằng thuật toán `bcrypt` kèm salt trước khi lưu vào bảng `shares`. Khi ai đó truy cập `/s/:token`, API kiểm tra nếu có mật khẩu thì bắt buộc client phải gửi mật khẩu để `bcrypt.compare` thành công mới trả về Presigned URL tải file.
- **Thời hạn hết hạn (Expiration):** Bảng `shares` lưu trường `expires_at`. Nếu thời gian hiện tại lớn hơn `expires_at`, API từ chối truy cập với mã `HTTP 410 Gone`.

