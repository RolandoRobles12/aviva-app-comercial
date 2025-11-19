package com.promotoresavivatunegocio_1.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.promotoresavivatunegocio_1.database.dao.MetricsCacheDao
import com.promotoresavivatunegocio_1.database.dao.ProspectDao
import com.promotoresavivatunegocio_1.database.dao.SyncQueueDao
import com.promotoresavivatunegocio_1.database.dao.VisitDao
import com.promotoresavivatunegocio_1.database.entities.MetricsCache
import com.promotoresavivatunegocio_1.database.entities.ProspectLocal
import com.promotoresavivatunegocio_1.database.entities.SyncQueue
import com.promotoresavivatunegocio_1.database.entities.VisitLocal

/**
 * Base de datos principal de la aplicación
 *
 * Almacena datos localmente para funcionamiento offline:
 * - Visitas pendientes de sincronizar
 * - Prospectos generados
 * - Caché de métricas
 * - Cola de sincronización
 *
 * @version 1 - Versión inicial con soporte offline completo
 */
@Database(
    entities = [
        VisitLocal::class,
        ProspectLocal::class,
        MetricsCache::class,
        SyncQueue::class
    ],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {

    // DAOs
    abstract fun visitDao(): VisitDao
    abstract fun prospectDao(): ProspectDao
    abstract fun metricsCacheDao(): MetricsCacheDao
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        private const val DATABASE_NAME = "aviva_comercial.db"

        @Volatile
        private var INSTANCE: AppDatabase? = null

        /**
         * Obtiene la instancia singleton de la base de datos
         */
        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DATABASE_NAME
                )
                    // Estrategias de migración
                    .fallbackToDestructiveMigration() // En producción, usar migraciones reales

                    // Permitir queries en el main thread solo para debug
                    // .allowMainThreadQueries() // NO usar en producción

                    .build()

                INSTANCE = instance
                instance
            }
        }

        /**
         * Limpia la instancia (útil para testing)
         */
        fun clearInstance() {
            INSTANCE = null
        }
    }
}
