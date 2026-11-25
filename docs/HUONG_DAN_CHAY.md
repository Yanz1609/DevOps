# HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN DRIVE MINI

Tài liệu này hướng dẫn chi tiết từng bước để bạn có thể chạy toàn bộ hệ thống trên máy tính của mình và thực hiện demo/chấm điểm.

---

## 1. YÊU CẦU TIÊN QUYẾT

1. **Docker Desktop** đã được cài đặt trên máy tính (Windows/macOS/Linux).
   > **Quan trọng:** Hãy mở ứng dụng **Docker Desktop** trên Windows và đợi cho biểu tượng cá voi chuyển sang màu xanh (Docker engine running).
2. (Tùy chọn cho phần K8s/Terraform): `kubectl`, `terraform`, hoặc Kubernetes cluster cục bộ (`minikube`, `k3s`, hoặc tính năng Kubernetes tích hợp sẵn trong Docker Desktop).

---

## 2. CHẠY NHANH BẰNG DOCKER COMPOSE (KHUYÊN DÙNG ĐỂ DEMO)

Toàn bộ hệ thống gồm 8 container (PostgreSQL, MinIO, Redis, API, Worker, Frontend, Ingress, MinIO-Init) được đóng gói sẵn sàng.

### Bước 1: Khởi động hệ thống
Mở terminal (PowerShell hoặc CMD) tại thư mục `d:\DevOps\drive-mini`:

```powershell
cd d:\DevOps\drive-mini
docker-compose up -d --build
```

### Bước 2: Kiểm tra trạng thái các container
```powershell
docker-compose ps
```
Tất cả các container sau phải ở trạng thái `running` hoặc `healthy`:
- `drive_postgres` (PostgreSQL 16)
- `drive_minio` (MinIO Object Storage)
- `drive_minio_init` (Tự động tạo bucket `drive-files` và `drive-thumbnails`)
- `drive_redis` (Hàng đợi công việc)
- `drive_api` (Backend Express)
- `drive_worker` (Worker tạo thumbnail ảnh)
- `drive_frontend` (Giao diện React SPA)
- `drive_ingress` (Nginx Gateway giới hạn upload 100M)

### Bước 3: Truy cập các dịch vụ
- **Giao diện người dùng (Frontend):** [http://localhost:3000](http://localhost:3000) (hoặc qua Ingress tại [http://localhost](http://localhost))
- **MinIO Web Console (Quản lý Object Storage):** [http://localhost:9001](http://localhost:9001)
  - Tài khoản: `minioadmin`
  - Mật khẩu: `minioadmin123`
- **Backend API Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

---

## 3. CÁC BƯỚC THỬ NGHIỆM TÍNH NĂNG CHÍNH

### Bước 3.1: Đăng ký & Đăng nhập
1. Truy cập [http://localhost:3000](http://localhost:3000).
2. Bấm tab **"Đăng ký tài khoản"**.
3. Điền Họ tên, Email, Mật khẩu (ví dụ: `admin@example.com` / `123456`).
4. Hệ thống tự động cấp hạn mức **1 GB** và hiển thị giao diện Google Drive thân thiện.

### Bước 3.2: Tạo thư mục & Upload file
1. Bấm nút **"Tạo mới"** ➔ chọn **"Thư mục mới"** (ví dụ: `Tài liệu môn học`).
2. Nhấp đúp chuột vào thư mục vừa tạo để mở.
3. Bấm nút **"Tạo mới"** ➔ chọn **"Tải tệp lên"** (hoặc kéo thả file ảnh / tài liệu vào vùng tải file).
4. Quan sát: File được upload **trực tiếp lên MinIO** thông qua Presigned PUT URL.

### Bước 3.3: Kiểm tra Worker tạo Thumbnail tự động
1. Tải lên một file ảnh (`.jpg`, `.png`).
2. Mở terminal xem logs của Worker:
   ```powershell
   docker-compose logs -f worker
   ```
3. Bạn sẽ thấy log dạng:
   ```
   [Worker] Processing thumbnail for fileId=... ("photo.png")
   [Worker] ✅ Successfully generated thumbnail for fileId=... (thumbnails/...webp)
   ```
4. Trên giao diện web, ảnh thu nhỏ 256px WebP sẽ xuất hiện tức thì!

### Bước 3.4: Chia sẻ tệp & Link công khai có mật khẩu
1. Bấm vào nút menu 3 chấm trên một file ➔ chọn **"Chia sẻ"**.
2. **Tab Link công khai:**
   - Chọn thời hạn (ví dụ: 24 giờ).
   - Nhập mật khẩu tùy chọn (ví dụ: `abc123`).
   - Bấm **"Tạo liên kết"** và bấm biểu tượng Copy link.
3. Mở tab ẩn danh (Incognito) và dán link vừa copy:
   - Hệ thống yêu cầu nhập mật khẩu bảo vệ.
   - Nhập đúng `abc123` ➔ Hiển thị bản xem trước và nút tải file.
4. **Tab Chia sẻ theo người dùng:**
   - Đăng ký thêm 1 tài khoản khác (ví dụ: `user2@example.com`).
   - Nhập email `user2@example.com` và phân quyền (Xem/Chỉnh sửa).
   - Khi đăng nhập vào `user2`, tệp sẽ nằm trong mục **"Được chia sẻ với tôi"**.

### Bước 3.5: Thùng rác & Khôi phục
1. Chọn một file/thư mục ➔ chọn **"Xóa vào thùng rác"**.
2. Vào mục **"Thùng rác"** ở menu trái:
   - Bấm **"Khôi phục"**: File quay lại vị trí ban đầu.
   - Bấm **"Xóa vĩnh viễn"**: File bị xóa hoàn toàn khỏi PostgreSQL và MinIO, dung lượng lưu trữ (quota) được hoàn lại tương ứng.

---

## 4. HƯỚNG DẪN TRIỂN KHAI TERRAFORM (IaC)

Thư mục `infra/terraform` chứa mã nguồn Terraform để khởi tạo tự động bucket MinIO và PersistentVolumeClaim trên Kubernetes.

### Cách chạy:
```powershell
cd d:\DevOps\drive-mini\infra\terraform

# Khởi tạo các provider (minio & kubernetes)
terraform init

# Xem trước các tài nguyên sẽ được tạo
terraform plan

# Áp dụng tạo bucket và PVCs
terraform apply -auto-approve
```

---

## 5. HƯỚNG DẪN TRIỂN KHAI KUBERNETES & BACKUP CRONJOB

Nếu bạn có Kubernetes cluster (Minikube hoặc K3s hoặc Docker Desktop Kubernetes):

### Bước 5.1: Triển khai toàn bộ cụm K8s
```powershell
cd d:\DevOps\drive-mini\infra\k8s

# Tạo Namespace
kubectl apply -f 00-namespace.yaml

# Cấu hình ConfigMap và Secret
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-secret.yaml

# Tạo các Persistent Volume Claims
kubectl apply -f 03-pvc.yaml

# Triển khai cơ sở hạ tầng
kubectl apply -f 04-postgres.yaml
kubectl apply -f 05-minio.yaml
kubectl apply -f 06-redis.yaml

# Triển khai ứng dụng
kubectl apply -f 07-api.yaml
kubectl apply -f 08-worker.yaml
kubectl apply -f 09-frontend.yaml

# Cấu hình Ingress (giới hạn 100M)
kubectl apply -f 10-ingress.yaml

# Cấu hình CronJob Sao lưu định kỳ MinIO
kubectl apply -f 11-cronjob-backup.yaml
```

### Bước 5.2: Kiểm tra Ingress và Giới hạn 100M
File `10-ingress.yaml` có annotation:
```yaml
nginx.ingress.kubernetes.io/proxy-body-size: "100m"
```
Khi client gửi request có body vượt quá 100MB, Ingress sẽ lập tức ngắt kết nối và trả về mã lỗi HTTP **413 Request Entity Too Large**.

### Bước 5.3: Thử nghiệm ngay CronJob Sao lưu MinIO
CronJob được lên lịch chạy lúc 2:00 sáng mỗi ngày. Để kích hoạt chạy thử thủ công ngay lập tức:

```powershell
# Kích hoạt 1 Job thủ công từ CronJob
kubectl create job --from=cronjob/minio-bucket-backup manual-backup-test -n drive-mini

# Xem logs của tiến trình sao lưu
kubectl logs -f job/manual-backup-test -n drive-mini
```
Output log sẽ hiển thị:
```
[Backup CronJob] Starting MinIO Object Storage Backup...
[Backup CronJob] Mirroring 'drive-files' bucket...
[Backup CronJob] Mirroring 'drive-thumbnails' bucket...
[Backup CronJob] ✅ Object storage backup completed successfully!
```

---

## 6. LỆNH DỪNG VÀ DỌN DẸP

Khi muốn tắt toàn bộ hệ thống:
```powershell
cd d:\DevOps\drive-mini
docker-compose down
```
Nếu muốn xóa sạch cả dữ liệu database và file đã lưu để test lại từ đầu:
```powershell
docker-compose down -v
```

