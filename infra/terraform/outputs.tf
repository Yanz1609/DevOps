output "minio_files_bucket" {
  description = "Name of the main files bucket"
  value       = minio_s3_bucket.drive_files.bucket
}

output "minio_thumbnails_bucket" {
  description = "Name of the thumbnails bucket"
  value       = minio_s3_bucket.drive_thumbnails.bucket
}

output "k8s_namespace" {
  description = "Kubernetes namespace created"
  value       = kubernetes_namespace.drive_namespace.metadata[0].name
}

output "postgres_pvc_name" {
  description = "PostgreSQL PersistentVolumeClaim name"
  value       = kubernetes_persistent_volume_claim.postgres_pvc.metadata[0].name
}

output "minio_pvc_name" {
  description = "MinIO PersistentVolumeClaim name"
  value       = kubernetes_persistent_volume_claim.minio_pvc.metadata[0].name
}

