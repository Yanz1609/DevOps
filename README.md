# Drive Mini - Hệ Thống Lưu Trữ và Chia Sẻ File

Dự án chuyên đề DevOps & Cloud Computing xây dựng hệ thống lưu trữ đám mây microservices (tương tự Google Drive thu nhỏ), tích hợp đầy đủ công nghệ container hóa, hàng đợi bất đồng bộ, Infrastructure as Code (IaC) và chiến lược sao lưu định kỳ.

---

## 🌟 ĐIỂM NỔI BẬT ĐẠT CHUẨN ĐỒ ÁN (★★★)

1. **Presigned URL Architecture:** Trực tiếp upload từ trình duyệt lên MinIO (S3 API), giải phóng hoàn toàn băng thông cho API backend.
2. **Worker Thumbnail Bất Đồng Bộ:** Redis Queue + Worker (Node.js + `sharp`) tự động tạo ảnh thu nhỏ WebP 256px với cơ chế auto-retry.
3. **Quản lý & Chia sẻ file toàn diện:**
   - Kéo thả upload nhiều file, thanh tiến trình % chính xác.
   - Quản lý cây thư mục, đổi tên, di chuyển, xóa mềm (thùng rác), khôi phục, xóa vĩnh viễn.
   - Tạo link chia sẻ công khai có mật khẩu bảo vệ và thời hạn hết hạn.
   - Chia sẻ trực tiếp với người dùng khác qua email kèm phân quyền.
4. **Hạ tầng & DevOps cốt lõi:**
   - **Terraform (IaC):** Tự động tạo bucket MinIO (`drive-files`, `drive-thumbnails`) và Persistent Volume Claims (PVC) Kubernetes.
   - **Ingress Gateway:** Cấu hình Nginx Ingress Controller với `proxy-body-size: 100m` giới hạn kích thước upload.
   - **Backup Định Kỳ (CronJob):** Kubernetes CronJob sử dụng `minio/mc mirror` sao lưu định kỳ object storage sang persistent volume.
   - **Đóng gói hoàn chỉnh:** Chạy trọn vẹn bằng `docker-compose` hoặc Kubernetes (`k3s`/`minikube`).

---

## 🏗️ KIẾN TRÚC TỔNG THỂ

```
User ──► Ingress (giới hạn upload 100M)
           ├─► Frontend (React + Vite + Tailwind)
           └─► API (Node.js Express + S3 SDK)
                  ├─► PostgreSQL  (Metadata: User, File, Folder, Share)
                  ├─► MinIO       (Object Storage: drive-files, drive-thumbnails)
                  └─► Redis Queue ──► Worker (Sharp) ──► MinIO (Thumbnails)
```

---

## 📁 CẤU TRÚC THƯ MỤC REPO

```
drive-mini/
├── frontend/             # Giao diện React SPA (Vite + Tailwind CSS + Lucide Icons)
├── api/                  # Backend REST API (Node.js, Express, S3 Presigner, PG)
├── worker/               # Background Worker tạo ảnh thu nhỏ (Node.js, Sharp, Redis)
├── infra/
│   ├── docker-compose.yml# Bản compose đầy đủ 8 services
│   ├── nginx/            # Cấu hình Ingress Nginx (client_max_body_size 100M)
│   ├── terraform/        # Mã nguồn IaC tạo bucket MinIO & PVC K8s
│   └── k8s/              # Manifests K8s (Deployments, Services, Ingress, CronJob Backup)
├── docs/
│   ├── BAO_CAO_DU_AN.md  # Báo cáo chuyên đề chi tiết nộp giảng viên
│   └── HUONG_DAN_CHAY.md # Hướng dẫn từng bước chạy và demo
├── docker-compose.yml    # Root docker-compose chạy nhanh
└── README.md
```

---

## 🚀 KHỞI ĐỘNG NHANH TRONG 1 BƯỚC

### 1. Bật Docker Desktop trên máy tính
Đảm bảo Docker Desktop đã được mở và đang chạy.

### 2. Chạy toàn bộ hệ thống
```bash
cd drive-mini
docker-compose up -d --build
```

### 3. Truy cập ứng dụng
- **Giao diện Web:** [http://localhost:3000](http://localhost:3000) (hoặc [http://localhost](http://localhost) qua Ingress)
- **MinIO Console:** [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Pass: `minioadmin123`)
- **API Health:** [http://localhost:5000/health](http://localhost:5000/health)

Xem hướng dẫn chi tiết kịch bản kiểm thử và chạy Terraform/K8s tại [docs/HUONG_DAN_CHAY.md](docs/HUONG_DAN_CHAY.md).

