package com.promotoresavivatunegocio_1.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayoutMediator
import com.promotoresavivatunegocio_1.R

class AdminFragment : Fragment() {

    private lateinit var tabLayout: TabLayout
    private lateinit var viewPager: ViewPager2
    private lateinit var pagerAdapter: AdminPagerAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_admin, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        initViews(view)
        setupViewPager()
        setupTabs()
    }

    private fun initViews(view: View) {
        tabLayout = view.findViewById(R.id.tabLayout)
        viewPager = view.findViewById(R.id.viewPager)
    }

    private fun setupViewPager() {
        pagerAdapter = AdminPagerAdapter(requireActivity())
        viewPager.adapter = pagerAdapter
    }

    private fun setupTabs() {
        TabLayoutMediator(tabLayout, viewPager) { tab, position ->
            tab.text = pagerAdapter.getTabTitle(position)
        }.attach()
    }
}