# BÁO CÁO ĐỒ ÁN CHUYÊN ĐỀ DEVOPS & CLOUD COMPUTING
## ĐỀ TÀI: HỆ THỐNG LƯU TRỮ VÀ CHIA SẺ FILE (DRIVE MINI)

---

### MỤC LỤC
1. [Tổng quan đề tài & Yêu cầu](#1-tổng-quan-đề-tài--yêu-cầu)
2. [Kiến trúc hệ thống tổng thể](#2-kiến-trúc-hệ-thống-tổng-thể)
3. [Thiết kế Cơ sở dữ liệu (PostgreSQL)](#3-thiết-kế-cơ-sở-dữ-liệu-postgresql)
4. [Thiết kế & Đặc tả API](#4-thiết-kế--đặc-tả-api)
5. [Cơ chế xử lý bất đồng bộ (Queue & Worker tạo thumbnail)](#5-cơ-chế-xử-lý-bất-đồng-bộ-queue--worker-tạo-thumbnail)
6. [Hạ tầng & DevOps (Các điểm ăn điểm tối đa)](#6-hạ-tầng--devops-các-điểm-ăn-điểm-tối-đa)
   - [6.1. Terraform (IaC)](#61-terraform-iac)
   - [6.2. Ingress & Giới hạn upload 100M](#62-ingress--giới-hạn-upload-100m)
   - [6.3. Sao lưu Object Storage định kỳ (Kubernetes CronJob)](#63-sao-lưu-object-storage-định-kỳ-kubernetes-cronjob)
   - [6.4. Đóng gói Container & Docker Compose](#64-đóng-gói-container--docker-compose)
7. [Hướng dẫn cài đặt & Vận hành](#7-hướng-dẫn-cài-đặt--vận-hành)
8. [Kịch bản kiểm thử & Demo](#8-kịch-bản-kiểm-thử--demo)

---

### 1. TỔNG QUAN ĐỀ TÀI & YÊU CẦU

Dự án **Drive Mini** được thiết kế nhằm xây dựng một nền tảng lưu trữ, quản lý và chia sẻ tệp tin tương tự Google Drive nhưng tối ưu hóa theo kiến trúc Cloud-Native microservices, áp dụng đầy đủ các kỹ thuật DevOps hiện đại:
- **Tài khoản & Hạn mức (Quota):** Đăng ký/đăng nhập JWT, quản lý dung lượng lưu trữ (mặc định 1GB/user).
- **Quản lý file & thư mục:** Tạo thư mục, upload nhiều file với thanh tiến trình trực tiếp lên Object Storage (MinIO) qua Presigned URL, tải về, đổi tên, xóa mềm vào thùng rác, khôi phục.
- **Chia sẻ tệp:** Tạo liên kết chia sẻ công khai có mật khẩu bảo vệ và thời hạn hết hạn; chia sẻ trực tiếp với người dùng khác; mục "Được chia sẻ với tôi".
- **Xử lý ngầm (Worker):** Hàng đợi Redis nhận job ngay sau khi upload để worker tự động tạo thumbnail (256x256 WebP) cho hình ảnh và cập nhật DB.
- **Tiêu chí DevOps cốt lõi:**
  1. **Terraform (IaC):** Tự động khởi tạo bucket MinIO (`drive-files`, `drive-thumbnails`) và PersistentVolumeClaim (PVC) cho cơ sở dữ liệu và lưu trữ.
  2. **Ingress Controller:** Định tuyến và giới hạn dung lượng upload tại tầng gateway (`proxy-body-size: 100m`).
  3. **Sao lưu định kỳ (Backup):** CronJob Kubernetes sử dụng `mc mirror` tự động sao lưu dữ liệu object storage sang vùng lưu trữ an toàn.

---

### 2. KIẾN TRÚC HỆ THỐNG TỔNG THỂ

```
                                  ┌───────────────────────┐
                                  │   Người dùng (Client) │
                                  └──────────┬────────────┘
                                             │ HTTP / HTTPS (Giới hạn upload 100M)
                                             ▼
                                  ┌───────────────────────┐
                                  │   Ingress / Nginx     │
                                  └─────┬───────────┬─────┘
                                        │           │
                     ┌──────────────────┘           └──────────────────┐
                     ▼                                                 ▼
          ┌─────────────────────┐                           ┌─────────────────────┐
          │   Frontend (React)  │                           │   API Backend       │
          │   Vite + Tailwind   │                           │   Node.js (Express) │
          └──────────┬──────────┘                           └─────┬───────┬───────┘
                     │                                            │       │
                     │ (Presigned PUT upload trực tiếp)           │       │
                     └─────────────────────┐                      │       │
                                           │                      │       │
                                           ▼                      │       ▼
                                ┌─────────────────────┐           │  ┌──────────────┐
                                │   MinIO (S3 API)    │◄──────────┘  │  PostgreSQL  │
                                │   - drive-files     │              │  (Metadata)  │
                                │   - drive-thumbnails│              └──────────────┘
                                └──────────▲──────────┘
                                           │
                                           │ 3. Đọc ảnh gốc & lưu thumbnail
                                           │
                                ┌──────────┴──────────┐
                                │   Worker (Node.js)  │
                                │   Sharp + MinIO SDK │
                                └──────────▲──────────┘
                                           │
                                           │ 2. Lấy Job xử lý
                                           │
                                ┌──────────┴──────────┐
                                │   Queue (Redis)     │◄─── 1. Đẩy job sau khi confirm
                                └─────────────────────┘
```

#### Quy trình Tải tệp lên (Presigned URL Flow):
1. **Client** gửi metadata (tên file, kích thước, mime type) đến API qua `POST /api/files/upload-url`.
2. **API** kiểm tra hạn mức lưu trữ (quota) của người dùng. Nếu hợp lệ, API dùng S3 SDK sinh một `Presigned PUT URL` có hạn dùng ngắn (15 phút) và trả về cho Client.
3. **Client** sử dụng URL này để tải file trực tiếp lên bucket `drive-files` của MinIO. Thao tác này giúp API không bị nghẽn mạng (I/O bottleneck) khi nhiều người upload file lớn cùng lúc.
4. Sau khi MinIO nhận đủ file, **Client** gọi `POST /api/files/confirm`.
5. **API** xác thực file tồn tại trong MinIO, lưu metadata vào PostgreSQL, cập nhật dung lượng đã dùng của user, và đẩy job vào Redis queue `thumbnail_jobs`.
6. **Worker** đón job, tải ảnh gốc, tạo thumbnail 256px và lưu vào bucket `drive-thumbnails`, cập nhật trạng thái trong database thành `ready`.

---

### 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (POSTGRESQL)

```sql
-- 1. Bảng Người dùng
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    quota_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1 GB
    used_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Thư mục
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Tệp tin
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(127) NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    thumbnail_key VARCHAR(512) DEFAULT NULL,
    thumb_status VARCHAR(32) NOT NULL DEFAULT 'none', -- none, pending, processing, ready, failed
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Chia sẻ công khai (Public Shares)
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    permission VARCHAR(32) NOT NULL DEFAULT 'view',
    password_hash VARCHAR(255) DEFAULT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Chia sẻ giữa người dùng (User Shares)
CREATE TABLE user_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL DEFAULT 'view',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (file_id, shared_with_user_id)
);
```

---

### 4. THIẾT KẾ & ĐẶC TẢ API

| Phương thức | Endpoint | Chức năng | Quyền |
|---|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản mới | Công khai |
| `POST` | `/api/auth/login` | Đăng nhập nhận JWT Token | Công khai |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản hiện tại | JWT |
| `GET` | `/api/files?folder_id=&search=&type=` | Danh sách file & thư mục con kèm breadcrumbs | JWT |
| `POST` | `/api/files/upload-url` | Kiểm tra quota, sinh Presigned PUT URL | JWT |
| `POST` | `/api/files/confirm` | Xác nhận upload, lưu metadata, kích hoạt worker | JWT |
| `GET` | `/api/files/:id/download` | Lấy Presigned GET URL tải file | JWT / Shared |
| `GET` | `/api/files/:id/view` | Lấy Presigned GET URL xem trước inline | JWT / Shared |
| `PATCH` | `/api/files/:id` | Đổi tên hoặc di chuyển file sang thư mục khác | JWT |
| `DELETE` | `/api/files/:id` | Xóa mềm file (chuyển vào thùng rác) | JWT |
| `POST` | `/api/files/:id/restore` | Khôi phục file từ thùng rác | JWT |
| `DELETE` | `/api/files/:id/permanent` | Xóa vĩnh viễn file khỏi PostgreSQL và MinIO | JWT |
| `POST` | `/api/folders` | Tạo thư mục mới | JWT |
| `PATCH` | `/api/folders/:id` | Đổi tên hoặc di chuyển thư mục | JWT |
| `DELETE` | `/api/folders/:id` | Xóa mềm thư mục và các tệp bên trong | JWT |
| `GET` | `/api/trash` | Danh sách tệp & thư mục trong thùng rác | JWT |
| `POST` | `/api/trash/empty` | Dọn sạch thùng rác (xóa vĩnh viễn) | JWT |
| `POST` | `/api/files/:id/share` | Tạo liên kết chia sẻ công khai (mật khẩu, hạn dùng) | JWT |
| `GET` | `/s/:token` | Truy cập tệp chia sẻ công khai (kiểm tra mật khẩu) | Công khai |
| `POST` | `/api/files/:id/user-share` | Chia sẻ tệp cho người dùng khác theo email | JWT |
| `GET` | `/api/shares/shared-with-me` | Danh sách tệp được chia sẻ với tôi | JWT |
| `GET` | `/api/me/usage` | Thống kê dung lượng đã dùng, còn lại, chi tiết loại file | JWT |

---

### 5. CƠ CHẾ XỬ LÝ BẤT ĐỒNG BỘ (QUEUE & WORKER)

1. **Hàng đợi Redis:**
   - Sử dụng Redis List (`thumbnail_jobs`) với các thao tác `RPUSH` (Producer - API) và `BLPOP` (Consumer - Worker).
   - Đảm bảo độ trễ gần như bằng 0 (realtime event-driven).
2. **Worker xử lý:**
   - Được viết bằng Node.js kết hợp thư viện xử lý ảnh siêu tốc `sharp`.
   - Cơ chế Retry tự động tối đa 3 lần với exponential backoff nếu gặp lỗi kết nối hoặc MinIO bận.
   - Resize ảnh về kích thước chuẩn 256x256 pixel, định dạng WebP chất lượng 80% để tối ưu dung lượng và tốc độ tải trang trên giao diện.
   - Cập nhật trường `thumb_status` từ `pending` ➔ `processing` ➔ `ready` (hoặc `failed` nếu quá số lần thử lại).

---

### 6. HẠ TẦNG & DEVOPS (CÁC ĐIỂM ĂN ĐIỂM TỐI ĐA)

#### 6.1. Terraform (IaC)
- Thư mục: `infra/terraform/`
- Tự động hóa tạo tài nguyên trên MinIO và Kubernetes:
  + Provider `aminueza/minio`: Khởi tạo 2 bucket chuẩn `drive-files` (private) và `drive-thumbnails` (public-read).
  + Provider `hashicorp/kubernetes`: Khởi tạo Kubernetes Namespace `drive-mini`, `postgres-pvc` (10Gi), và `minio-pvc` (50Gi).

#### 6.2. Ingress & Giới hạn upload 100M
- File cấu hình: `infra/k8s/10-ingress.yaml` và `infra/nginx/nginx.conf`
- Cấu hình chú thích Ingress Controller:
  ```yaml
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
  ```
- Định tuyến:
  + `/api/*` ➔ `api-service:5000`
  + `/*` ➔ `frontend-service:80`

#### 6.3. Sao lưu Object Storage định kỳ (Kubernetes CronJob)
- File cấu hình: `infra/k8s/11-cronjob-backup.yaml`
- Sử dụng container chính thức `minio/mc` chạy theo lịch trình Cron định kỳ (`0 2 * * *` - lúc 2 giờ sáng mỗi ngày):
  + Kết nối MinIO bằng alias `source`.
  + Thực hiện lệnh:
    ```sh
    /usr/bin/mc mirror --overwrite source/drive-files /backup/drive-files-backup/
    /usr/bin/mc mirror --overwrite source/drive-thumbnails /backup/drive-thumbnails-backup/
    ```
  + Ghi dữ liệu trực tiếp vào Persistent Volume Claim sao lưu `backup-storage-pvc`.

#### 6.4. Đóng gói Container & Docker Compose
- Tất cả dịch vụ (`postgres`, `minio`, `redis`, `api`, `worker`, `frontend`, `ingress`) đều được đóng gói độc lập với Dockerfile tối ưu (multi-stage build, Alpine Linux nhẹ và bảo mật).
- Triển khai tức thì chỉ bằng một câu lệnh: `docker-compose up -d`.

---

### 7. HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH

Xem chi tiết tại tệp [`HUONG_DAN_CHAY.md`](./HUONG_DAN_CHAY.md).

---

### 8. KỊCH BẢN KIỂM THỬ & DEMO

| STT | Kịch bản kiểm thử | Kết quả mong đợi | Đánh giá |
|---|---|---|---|
| 1 | Đăng ký & Đăng nhập | Tạo tài khoản thành công, nhận JWT token, hiển thị dung lượng 0 B / 1 GB | Đạt |
| 2 | Tạo thư mục & điều hướng | Thư mục xuất hiện, breadcrumb cập nhật chính xác | Đạt |
| 3 | Upload file hình ảnh (JPG/PNG) | Tiến trình 0-100%, upload trực tiếp lên MinIO qua Presigned URL, cập nhật quota | Đạt |
| 4 | Worker sinh thumbnail | File ảnh sau vài giây xuất hiện thumbnail thu nhỏ mượt mà trên card | Đạt |
| 5 | Tạo link chia sẻ công khai có mật khẩu | Truy cập `/s/:token` hiển thị ô nhập mật khẩu; nhập đúng thì mở khóa tải file | Đạt |
| 6 | Chia sẻ cho người dùng khác | Người nhận đăng nhập thấy tệp trong mục "Được chia sẻ với tôi" | Đạt |
| 7 | Xóa mềm & Khôi phục | File biến mất khỏi Drive và chuyển sang Thùng rác; bấm Khôi phục thì quay lại vị trí cũ | Đạt |
| 8 | Giới hạn Ingress 100M | Upload file lớn hơn 100MB qua Ingress bị từ chối với mã lỗi HTTP 413 | Đạt |
| 9 | CronJob Backup | Job chạy `mc mirror` đồng bộ toàn bộ file sang thư mục backup thành công | Đạt |

