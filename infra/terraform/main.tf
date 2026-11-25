# MinIO Provider Configuration
provider "minio" {
  minio_server   = var.minio_server
  minio_user     = var.minio_access_key
  minio_password = var.minio_secret_key
  minio_ssl      = var.minio_ssl
}

# Kubernetes Provider Configuration
provider "kubernetes" {
  config_path = var.kube_config_path
}

# 1. MinIO Buckets
resource "minio_s3_bucket" "drive_files" {
  bucket = "drive-files"
  acl    = "private"
}

resource "minio_s3_bucket" "drive_thumbnails" {
  bucket = "drive-thumbnails"
  acl    = "public-read"
}

# 2. Kubernetes Namespace
resource "kubernetes_namespace" "drive_namespace" {
  metadata {
    name = var.k8s_namespace
    labels = {
      app         = "drive-mini"
      environment = "production"
    }
  }
}

# 3. Kubernetes PersistentVolumeClaims (PVCs) for PostgreSQL and MinIO
resource "kubernetes_persistent_volume_claim" "postgres_pvc" {
  metadata {
    name      = "postgres-pvc"
    namespace = kubernetes_namespace.drive_namespace.metadata[0].name
    labels = {
      app  = "drive-mini"
      tier = "database"
    }
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = var.postgres_pvc_size
      }
    }
  }
}

resource "kubernetes_persistent_volume_claim" "minio_pvc" {
  metadata {
    name      = "minio-pvc"
    namespace = kubernetes_namespace.drive_namespace.metadata[0].name
    labels = {
      app  = "drive-mini"
      tier = "storage"
    }
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = var.minio_pvc_size
      }
    }
  }
}

