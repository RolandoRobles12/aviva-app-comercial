package com.promotoresavivatunegocio_1

import android.content.Context

class AdminUtils(private val context: Context) {

    fun isAdmin(): Boolean {
        val sharedPref = context.getSharedPreferences("admin_prefs", Context.MODE_PRIVATE)
        return sharedPref.getBoolean("is_admin", false)
    }

    fun hasPermission(permission: String): Boolean {
        val sharedPref = context.getSharedPreferences("admin_prefs", Context.MODE_PRIVATE)
        val permissions = sharedPref.getStringSet("permissions", emptySet()) ?: emptySet()
        return permissions.contains(permission)
    }

    companion object {
        const val PERMISSION_VIEW_REPORTS = "view_reports"
        const val PERMISSION_MANAGE_USERS = "manage_users"
        const val PERMISSION_VIEW_DASHBOARD = "view_dashboard"
    }
}