variable "minio_server" {
  description = "MinIO Server API host:port"
  type        = string
  default     = "localhost:9000"
}

variable "minio_access_key" {
  description = "MinIO Root / Access Key"
  type        = string
  default     = "minioadmin"
  sensitive   = true
}

variable "minio_secret_key" {
  description = "MinIO Secret Key"
  type        = string
  default     = "minioadmin123"
  sensitive   = true
}

variable "minio_ssl" {
  description = "Whether to use HTTPS with MinIO"
  type        = bool
  default     = false
}

variable "kube_config_path" {
  description = "Path to the kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "k8s_namespace" {
  description = "Kubernetes namespace for Drive Mini"
  type        = string
  default     = "drive-mini"
}

variable "postgres_pvc_size" {
  description = "Storage size for PostgreSQL PVC"
  type        = string
  default     = "10Gi"
}

variable "minio_pvc_size" {
  description = "Storage size for MinIO Object Storage PVC"
  type        = string
  default     = "50Gi"
}

variable "storage_class_name" {
  description = "StorageClass for PVCs (standard, local-path, etc.)"
  type        = string
  default     = "standard"
}

