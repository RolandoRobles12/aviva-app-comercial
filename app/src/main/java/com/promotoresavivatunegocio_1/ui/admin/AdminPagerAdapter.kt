package com.promotoresavivatunegocio_1.ui.admin

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.viewpager2.adapter.FragmentStateAdapter

class AdminPagerAdapter(fragmentActivity: FragmentActivity) : FragmentStateAdapter(fragmentActivity) {

    private val fragments = listOf(
        HubSpotMetricsFragment(),  // ⭐ NUEVA: Pestaña de HubSpot primero
        UsersAdminFragment(),
        ProductsAdminFragment(),
        CitiesAdminFragment(),
        KiosksAdminFragment()
    )

    private val tabTitles = listOf(
        "📊 HubSpot",              // ⭐ NUEVA pestaña
        "👥 Usuarios",
        "📦 Productos",
        "🏙️ Ciudades",
        "🏪 Kioscos"
    )

    override fun getItemCount(): Int = fragments.size

    override fun createFragment(position: Int): Fragment = fragments[position]

    fun getTabTitle(position: Int): String = tabTitles.getOrElse(position) { "Tab $position" }
}