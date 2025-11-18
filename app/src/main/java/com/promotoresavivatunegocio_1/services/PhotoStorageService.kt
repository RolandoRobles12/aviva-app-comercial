package com.promotoresavivatunegocio_1.services

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageReference
import kotlinx.coroutines.tasks.await
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class PhotoStorageService(private val context: Context) {
    private val storage = FirebaseStorage.getInstance()
    private val auth = FirebaseAuth.getInstance()

    companion object {
        private const val TAG = "PhotoStorageService"
        private const val ATTENDANCE_PHOTOS_PATH = "attendance_photos"
        private const val PROFILE_PHOTOS_PATH = "profile_photos"
        private const val MAX_IMAGE_SIZE = 1024 * 1024 * 5 // 5MB
        private const val COMPRESSION_QUALITY = 85
        private const val MAX_IMAGE_DIMENSION = 1920
    }

    // ATTENDANCE PHOTO UPLOAD
    suspend fun uploadAttendancePhoto(
        photoUri: Uri,
        userId: String,
        kioskId: String,
        attendanceType: String
    ): Result<String> {
        return try {
            val user = auth.currentUser
            if (user == null) {
                return Result.failure(Exception("Usuario no autenticado"))
            }

            // Validate and compress image
            val compressedImageData = compressImage(photoUri)
            if (compressedImageData == null) {
                return Result.failure(Exception("Error al procesar la imagen"))
            }

            // Generate unique filename
            val timestamp = System.currentTimeMillis()
            val dateFormat = SimpleDateFormat("yyyy/MM/dd", Locale.getDefault())
            val datePath = dateFormat.format(Date())
            val filename = "${userId}_${kioskId}_${attendanceType}_${timestamp}.jpg"
            val photoPath = "$ATTENDANCE_PHOTOS_PATH/$datePath/$filename"

            // Upload to Firebase Storage
            val storageRef = storage.reference.child(photoPath)
            val metadata = com.google.firebase.storage.StorageMetadata.Builder()
                .setContentType("image/jpeg")
                .setCustomMetadata("userId", userId)
                .setCustomMetadata("kioskId", kioskId)
                .setCustomMetadata("attendanceType", attendanceType)
                .setCustomMetadata("timestamp", timestamp.toString())
                .build()

            val uploadTask = storageRef.putBytes(compressedImageData, metadata).await()
            val downloadUrl = storageRef.downloadUrl.await()

            Log.d(TAG, "Foto de asistencia subida exitosamente: $photoPath")
            Result.success(downloadUrl.toString())

        } catch (e: Exception) {
            Log.e(TAG, "Error al subir foto de asistencia", e)
            Result.failure(e)
        }
    }

    // PROFILE PHOTO UPLOAD
    suspend fun uploadProfilePhoto(photoUri: Uri, userId: String): Result<String> {
        return try {
            val user = auth.currentUser
            if (user == null) {
                return Result.failure(Exception("Usuario no autenticado"))
            }

            // Validate and compress image
            val compressedImageData = compressImage(photoUri, 512) // Smaller for profile photos
            if (compressedImageData == null) {
                return Result.failure(Exception("Error al procesar la imagen"))
            }

            // Generate filename
            val timestamp = System.currentTimeMillis()
            val filename = "${userId}_profile_${timestamp}.jpg"
            val photoPath = "$PROFILE_PHOTOS_PATH/$filename"

            // Upload to Firebase Storage
            val storageRef = storage.reference.child(photoPath)
            val metadata = com.google.firebase.storage.StorageMetadata.Builder()
                .setContentType("image/jpeg")
                .setCustomMetadata("userId", userId)
                .setCustomMetadata("type", "profile")
                .setCustomMetadata("timestamp", timestamp.toString())
                .build()

            val uploadTask = storageRef.putBytes(compressedImageData, metadata).await()
            val downloadUrl = storageRef.downloadUrl.await()

            // Delete old profile photo if exists
            deleteOldProfilePhotos(userId)

            Log.d(TAG, "Foto de perfil subida exitosamente: $photoPath")
            Result.success(downloadUrl.toString())

        } catch (e: Exception) {
            Log.e(TAG, "Error al subir foto de perfil", e)
            Result.failure(e)
        }
    }

    // IMAGE COMPRESSION AND PROCESSING
    private fun compressImage(
        imageUri: Uri,
        maxDimension: Int = MAX_IMAGE_DIMENSION
    ): ByteArray? {
        return try {
            val inputStream = context.contentResolver.openInputStream(imageUri)
            val originalBitmap = BitmapFactory.decodeStream(inputStream)
            inputStream?.close()

            if (originalBitmap == null) {
                Log.e(TAG, "No se pudo decodificar la imagen")
                return null
            }

            // Fix orientation
            val rotatedBitmap = fixImageOrientation(imageUri, originalBitmap)

            // Calculate new dimensions
            val (newWidth, newHeight) = calculateNewDimensions(
                rotatedBitmap.width,
                rotatedBitmap.height,
                maxDimension
            )

            // Resize if needed
            val resizedBitmap = if (newWidth != rotatedBitmap.width || newHeight != rotatedBitmap.height) {
                Bitmap.createScaledBitmap(rotatedBitmap, newWidth, newHeight, true)
            } else {
                rotatedBitmap
            }

            // Compress to JPEG
            val outputStream = ByteArrayOutputStream()
            resizedBitmap.compress(Bitmap.CompressFormat.JPEG, COMPRESSION_QUALITY, outputStream)
            val compressedData = outputStream.toByteArray()

            // Cleanup
            if (resizedBitmap != rotatedBitmap) {
                resizedBitmap.recycle()
            }
            if (rotatedBitmap != originalBitmap) {
                rotatedBitmap.recycle()
            }
            originalBitmap.recycle()
            outputStream.close()

            // Check final size
            if (compressedData.size > MAX_IMAGE_SIZE) {
                Log.w(TAG, "Imagen comprimida aún es muy grande: ${compressedData.size} bytes")
            }

            compressedData

        } catch (e: Exception) {
            Log.e(TAG, "Error al comprimir imagen", e)
            null
        }
    }

    private fun fixImageOrientation(imageUri: Uri, bitmap: Bitmap): Bitmap {
        return try {
            val inputStream = context.contentResolver.openInputStream(imageUri)
            val exif = ExifInterface(inputStream!!)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            inputStream.close()

            val matrix = Matrix()
            when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
                ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
                else -> return bitmap
            }

            val rotatedBitmap = Bitmap.createBitmap(
                bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true
            )

            if (rotatedBitmap != bitmap) {
                bitmap.recycle()
            }

            rotatedBitmap
        } catch (e: Exception) {
            Log.e(TAG, "Error al corregir orientación de imagen", e)
            bitmap
        }
    }

    private fun calculateNewDimensions(
        originalWidth: Int,
        originalHeight: Int,
        maxDimension: Int
    ): Pair<Int, Int> {
        val aspectRatio = originalWidth.toFloat() / originalHeight.toFloat()

        return if (originalWidth > originalHeight) {
            // Landscape
            if (originalWidth > maxDimension) {
                val newWidth = maxDimension
                val newHeight = (newWidth / aspectRatio).toInt()
                Pair(newWidth, newHeight)
            } else {
                Pair(originalWidth, originalHeight)
            }
        } else {
            // Portrait
            if (originalHeight > maxDimension) {
                val newHeight = maxDimension
                val newWidth = (newHeight * aspectRatio).toInt()
                Pair(newWidth, newHeight)
            } else {
                Pair(originalWidth, originalHeight)
            }
        }
    }

    // DELETE OPERATIONS
    suspend fun deletePhoto(photoUrl: String): Result<Boolean> {
        return try {
            val storageRef = storage.getReferenceFromUrl(photoUrl)
            storageRef.delete().await()

            Log.d(TAG, "Foto eliminada exitosamente: $photoUrl")
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al eliminar foto", e)
            Result.failure(e)
        }
    }

    private suspend fun deleteOldProfilePhotos(userId: String) {
        try {
            val profilePhotosRef = storage.reference.child(PROFILE_PHOTOS_PATH)
            val listResult = profilePhotosRef.listAll().await()

            listResult.items.forEach { item ->
                if (item.name.startsWith("${userId}_profile_")) {
                    try {
                        item.delete().await()
                        Log.d(TAG, "Foto de perfil anterior eliminada: ${item.name}")
                    } catch (e: Exception) {
                        Log.w(TAG, "No se pudo eliminar foto anterior: ${item.name}", e)
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error al limpiar fotos de perfil anteriores", e)
        }
    }

    // CLEANUP OPERATIONS (For automated jobs)
    suspend fun cleanupOldAttendancePhotos(daysToKeep: Int = 90): Result<Int> {
        return try {
            val cutoffDate = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_MONTH, -daysToKeep)
            }.time

            var deletedCount = 0
            val attendancePhotosRef = storage.reference.child(ATTENDANCE_PHOTOS_PATH)

            // This would need to be implemented recursively for all date folders
            // For now, we'll implement a basic version
            val listResult = attendancePhotosRef.listAll().await()

            listResult.prefixes.forEach { datePrefix ->
                try {
                    val dateFolderList = datePrefix.listAll().await()
                    dateFolderList.items.forEach { photoRef ->
                        val metadata = photoRef.metadata.await()
                        val uploadTime = Date(metadata.creationTimeMillis)

                        if (uploadTime.before(cutoffDate)) {
                            photoRef.delete().await()
                            deletedCount++
                            Log.d(TAG, "Foto antigua eliminada: ${photoRef.name}")
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error al procesar carpeta de fecha: ${datePrefix.name}", e)
                }
            }

            Log.d(TAG, "Limpieza completada: $deletedCount fotos eliminadas")
            Result.success(deletedCount)

        } catch (e: Exception) {
            Log.e(TAG, "Error en limpieza de fotos", e)
            Result.failure(e)
        }
    }

    // UTILITY METHODS
    fun validateImageFile(uri: Uri): ValidationResult {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri)
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeStream(inputStream, null, options)
            inputStream?.close()

            val fileSize = getFileSize(uri)

            when {
                options.outWidth <= 0 || options.outHeight <= 0 ->
                    ValidationResult(false, "Archivo de imagen no válido")
                fileSize > MAX_IMAGE_SIZE ->
                    ValidationResult(false, "Imagen muy grande (máximo 5MB)")
                options.outMimeType?.startsWith("image/") != true ->
                    ValidationResult(false, "Tipo de archivo no soportado")
                else ->
                    ValidationResult(true, "Imagen válida")
            }
        } catch (e: Exception) {
            ValidationResult(false, "Error al validar imagen: ${e.message}")
        }
    }

    private fun getFileSize(uri: Uri): Long {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri)
            val size = inputStream?.available()?.toLong() ?: 0L
            inputStream?.close()
            size
        } catch (e: Exception) {
            0L
        }
    }

    // PHOTO METADATA
    suspend fun getPhotoMetadata(photoUrl: String): PhotoMetadata? {
        return try {
            val storageRef = storage.getReferenceFromUrl(photoUrl)
            val metadata = storageRef.metadata.await()

            PhotoMetadata(
                name = storageRef.name,
                path = storageRef.path,
                size = metadata.sizeBytes,
                contentType = metadata.contentType ?: "",
                createdTime = Date(metadata.creationTimeMillis),
                updatedTime = Date(metadata.updatedTimeMillis),
                customMetadata = metadata.customMetadataKeys.associateWith { key ->
                    metadata.getCustomMetadata(key) ?: ""
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener metadatos de foto", e)
            null
        }
    }

    // TEMPORARY FILE MANAGEMENT
    fun createTempImageFile(): File? {
        return try {
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val imageFileName = "JPEG_${timestamp}_"
            val storageDir = context.getExternalFilesDir("temp_images")

            if (storageDir?.exists() != true) {
                storageDir?.mkdirs()
            }

            File.createTempFile(imageFileName, ".jpg", storageDir)
        } catch (e: IOException) {
            Log.e(TAG, "Error al crear archivo temporal", e)
            null
        }
    }

    fun cleanupTempFiles() {
        try {
            val tempDir = context.getExternalFilesDir("temp_images")
            tempDir?.listFiles()?.forEach { file ->
                try {
                    if (file.isFile && file.name.endsWith(".jpg")) {
                        val age = System.currentTimeMillis() - file.lastModified()
                        val maxAge = 24 * 60 * 60 * 1000 // 24 hours

                        if (age > maxAge) {
                            file.delete()
                            Log.d(TAG, "Archivo temporal eliminado: ${file.name}")
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error al eliminar archivo temporal: ${file.name}", e)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al limpiar archivos temporales", e)
        }
    }

    // DATA CLASSES
    data class ValidationResult(
        val isValid: Boolean,
        val message: String
    )

    data class PhotoMetadata(
        val name: String,
        val path: String,
        val size: Long,
        val contentType: String,
        val createdTime: Date,
        val updatedTime: Date,
        val customMetadata: Map<String, String>
    )

    data class UploadProgress(
        val bytesTransferred: Long,
        val totalBytes: Long,
        val isComplete: Boolean
    ) {
        val progressPercentage: Int
            get() = if (totalBytes > 0) ((bytesTransferred * 100) / totalBytes).toInt() else 0
    }
}