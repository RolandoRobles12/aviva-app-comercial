package com.promotoresavivatunegocio_1.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.promotoresavivatunegocio_1.R

class KiosksAdminFragment : Fragment() {

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_kiosks_admin, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val textView = view.findViewById<TextView>(R.id.tvKiosksPlaceholder)
        textView.text = "🏪 Gestión de Kioscos\n\n" +
                "Esta sección permitirá:\n" +
                "• Ver kioscos registrados\n" +
                "• Agregar nuevos kioscos\n" +
                "• Asignar promotores a kioscos\n" +
                "• Gestionar ubicaciones\n\n" +
                "🚧 En desarrollo..."
    }
}