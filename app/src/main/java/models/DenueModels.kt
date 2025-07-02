package com.promotoresavivatunegocio_1.models

import com.google.gson.annotations.SerializedName

/* ---------- DTO TAL CUAL LLEGA DEL DENUE ---------- */
data class DenueNegocio(
    @SerializedName("Id")             val id: String,
    @SerializedName("Nombre")         val Nombre: String,
    @SerializedName("Razon_social")   val Razon_social: String,
    @SerializedName("Codigo_act")     val Codigo_act: String,
    @SerializedName("Nombre_act")     val Nombre_act: String,
    @SerializedName("Latitud")        val Latitud: String,
    @SerializedName("Longitud")       val Longitud: String,
    @SerializedName("Calle")          val Calle: String,
    @SerializedName("Numero_ext")     val Numero_ext: String? = null,
    @SerializedName("Numero_int")     val Numero_int: String? = null,
    @SerializedName("Colonia")        val Colonia: String,
    @SerializedName("CP")             val CP: String,
    @SerializedName("Localidad")      val Localidad: String,
    @SerializedName("Municipio")      val Municipio: String,
    @SerializedName("Estado")         val Estado: String,
    @SerializedName("Telefono")       val Telefono: String? = null,
    @SerializedName("Correo_e")       val Correoelec: String? = null,
    @SerializedName("Sitio_internet") val Sitio_internet: String? = null
)

/* ---------- ENTIDAD DE DOMINIO QUE USARÁ LA APP ---------- */
data class NegocioDenue(
    val id: String,
    val nombre: String,
    val razonSocial: String?,
    val codigoActividad: String,
    val nombreActividad: String,
    val latitud: Double,
    val longitud: Double,
    val direccion: String,
    val telefono: String? = null,
    val email: String? = null,
    val sitioWeb: String? = null
)