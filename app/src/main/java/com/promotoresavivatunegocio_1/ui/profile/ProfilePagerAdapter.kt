package com.promotoresavivatunegocio_1.ui.profile

import androidx.fragment.app.Fragment
import androidx.viewpager2.adapter.FragmentStateAdapter

/**
 * Adapter para los tabs del perfil
 */
class ProfilePagerAdapter(fragment: Fragment) : FragmentStateAdapter(fragment) {

    override fun getItemCount(): Int = 2

    override fun createFragment(position: Int): Fragment {
        return when (position) {
            0 -> BadgesFragment()
            1 -> CareerFragment()
            else -> BadgesFragment()
        }
    }
}
