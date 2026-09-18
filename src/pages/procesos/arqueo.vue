<script setup lang="ts">
import { computed, ref } from 'vue'

const responsable = ref('')
const departamento = ref('')
const lugar = ref('Guatemala')
const hoy = new Date()
const fecha = ref(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`)
const asignado = ref(0)
const observaciones = ref('')
const auditor = ref('')

const denominaciones = ref(
  [1, 5, 10, 25, 50, 100, 500, 1000, 2000, 5000, 10000, 20000].map(centavos => ({
    centavos,
    cantidad: 0,
    descripcion: centavos < 100 ? 'MONEDAS DE' : centavos === 100 ? 'MONEDAS/BILLETES DE' : 'BILLETES DE',
  })),
)

const otros = ref([
  { descripcion: 'CUENTAS BANCARIAS', monto: 0, detalle: false },
  { descripcion: 'FACTURAS NO LIQUIDADAS', monto: 0, detalle: true },
  { descripcion: 'RECIBOS', monto: 0, detalle: true },
  { descripcion: 'VALES', monto: 0, detalle: true },
  { descripcion: 'LIQUIDACIONES EN TRÁMITE', monto: 0, detalle: true },
])

const centavos = (valor: number) => Math.round(Number(valor || 0) * 100)
const total = computed(() => denominaciones.value.reduce((suma, item) => suma + item.centavos * Number(item.cantidad || 0), 0) + otros.value.reduce((suma, item) => suma + centavos(item.monto), 0))
const diferencia = computed(() => total.value - centavos(asignado.value))
const moneda = (valor: number) => `Q${(valor / 100).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fechaTexto = computed(() => fecha.value ? new Date(`${fecha.value}T00:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const formulario = ref<HTMLFormElement>()

const imprimir = () => {
  if (formulario.value?.reportValidity()) window.print()
}
</script>

<template>
  <form ref="formulario" class="arqueo" @submit.prevent="imprimir">
    <div class="acciones d-flex justify-space-between align-center mb-5">
      <h1 class="text-h4">Arqueo de Caja Chica</h1>
      <VBtn type="submit">Imprimir / Guardar PDF</VBtn>
    </div>

    <section class="hoja">
      <header>
        <strong>DIARIOS MODERNOS, S.A.</strong><br>
        <strong>DEPARTAMENTO DE AUDITORÍA INTERNA</strong>
        <div class="encabezado">
          <strong>ARQUEO DE CAJA CHICA</strong>
          <div>
            <b>Lugar y Fecha:</b>
            <input v-model="lugar" aria-label="Lugar" required class="lugar editable">
            <input v-model="fecha" aria-label="Fecha" type="date" required class="editable">
            <span class="impreso">{{ lugar }}, {{ fechaTexto }}</span>
          </div>
        </div>
      </header>

      <div class="datos">
        <label><b>Responsable:</b><input v-model="responsable" required><span class="impreso">{{ responsable }}</span></label>
        <label><b>Monto Asignado:</b><input v-model.number="asignado" type="number" min="0" step="0.01" required><span class="impreso">{{ moneda(centavos(asignado)) }}</span></label>
        <label><b>Área o Departamento:</b><input v-model="departamento" required><span class="impreso">{{ departamento }}</span></label>
      </div>

      <div class="tabla">
        <table>
          <thead><tr><th>EXISTENCIA DE</th><th>VALOR</th><th>CANTIDAD</th><th>TOTAL</th></tr></thead>
          <tbody>
            <tr v-for="item in denominaciones" :key="item.centavos">
              <td>{{ item.descripcion }}</td>
              <td class="numero">{{ moneda(item.centavos) }}</td>
              <td>
                <input v-model.number="item.cantidad" type="number" min="0" step="1" required :aria-label="`Cantidad de ${moneda(item.centavos)}`">
                <span class="impreso">{{ item.cantidad || '' }}</span>
              </td>
              <td class="numero">{{ moneda(item.centavos * Number(item.cantidad || 0)) }}</td>
            </tr>
            <tr v-for="item in otros" :key="item.descripcion">
              <td>{{ item.descripcion }}:</td><td><b v-if="item.detalle">DETALLE EN (A-1)</b></td><td></td>
              <td>
                <input v-model.number="item.monto" type="number" min="0" step="0.01" required :aria-label="`${item.descripcion} en quetzales`">
                <span class="impreso">{{ moneda(centavos(item.monto)) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="totales">
        <div><b>TOTAL EN ARQUEO:</b><strong>{{ moneda(total) }}</strong></div>
        <div class="diferencia"><b>SOBRANTE O FALTANTE:</b><strong>{{ diferencia < 0 ? `(${moneda(Math.abs(diferencia))})` : moneda(diferencia) }}</strong></div>
      </div>
    </section>

    <section class="hoja segunda">
      <label for="observaciones"><b>OBSERVACIONES:</b></label>
      <textarea id="observaciones" v-model="observaciones" rows="8" class="editable" />
      <div class="observaciones impreso">{{ observaciones }}</div>
      <p class="declaracion">AL FINALIZAR EL ARQUEO DE CAJA CHICA SOBRE EL FONDO QUE ESTÁ BAJO MI RESPONSABILIDAD RECIBÍ SATISFACTORIAMENTE TODA LA DOCUMENTACIÓN Y EL EFECTIVO QUE FORMARON PARTE DE ESTE ARQUEO, ADEMÁS SE DA A CONOCER QUE NO EXISTE NINGÚN DOCUMENTO O EFECTIVO QUE NO SE HAYA TOMADO EN CUENTA, POR TAL MOTIVO ACEPTO Y FIRMO CONFORME EL PRESENTE DOCUMENTO.</p>
      <div class="firmas">
        <div><div class="firma">{{ responsable }}</div><b>Responsable de caja chica</b></div>
        <div><input v-model="auditor" aria-label="Nombre del auditor" placeholder="Nombre del auditor" class="editable"><div class="firma">{{ auditor }}</div><b>Auditor</b></div>
      </div>
    </section>
  </form>
</template>

<style scoped>
.hoja { padding: 32px; margin-block-end: 24px; background: white; color: #222; font-family: Arial, sans-serif; }
header { line-height: 1.8; }
.encabezado { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
input, textarea { border: 1px solid #aaa; padding: 5px; background: white; color: #222; border-radius: 2px; max-inline-size: 100%; }
.lugar { inline-size: 120px; margin-inline: 8px; }.datos { margin-block: 22px; }.datos label { display: flex; align-items: center; gap: 12px; margin-block: 8px; }.datos b { inline-size: 190px; text-align: end; }.datos input { flex: 1; }.tabla { overflow-x: auto; }
table { border-collapse: collapse; inline-size: 100%; font-size: 13px; } th, td { border-inline: 1px solid #777; border-block-end: 1px dotted #aaa; padding: 8px; } th { border-block: 1px solid #777; text-decoration: underline; } tr:last-child td { border-block-end: 1px solid #777; } td:first-child { inline-size: 32%; } td:nth-child(2) { inline-size: 23%; } td:nth-child(3) { inline-size: 15%; } td input { inline-size: 100%; min-inline-size: 70px; text-align: end; }.numero { text-align: end; white-space: nowrap; }
.totales { margin-block-start: 24px; margin-inline-start: auto; max-inline-size: 550px; }.totales > div { display: grid; grid-template-columns: 1fr 1fr; align-items: center; }.totales b { text-align: end; padding: 10px; }.totales strong { padding: 12px; border: 1px solid #777; text-align: end; }.diferencia { background: #efd26a; }
.segunda textarea { display: block; inline-size: 100%; margin-block: 16px 32px; }.declaracion { font-size: 13px; margin-block: 32px; }.firmas { display: flex; justify-content: space-around; gap: 40px; margin-block-start: 160px; text-align: center; }.firmas > div { flex: 1; }.firma { border-block-end: 1px solid #222; min-block-size: 35px; margin-block-end: 8px; }.impreso { display: none; }
@media print { @page { size: A4; margin: 15mm; }.acciones, input, .editable { display: none !important; }.impreso { display: inline; }.hoja { padding: 0; margin: 0; font-size: 12px; }.segunda { break-before: page; }.encabezado { gap: 10px; } th, td { padding: 9px 6px; } td:nth-child(3), td:last-child { text-align: end; }.observaciones { display: block; white-space: pre-wrap; overflow-wrap: anywhere; min-block-size: 80mm; line-height: 10mm; background: repeating-linear-gradient(transparent 0, transparent 9.7mm, #aaa 9.8mm, transparent 10mm); }.firmas { margin-block-start: 70mm; break-inside: avoid; } }
</style>

<style>
@media print { body:has(.arqueo) { background: white !important; } body:has(.arqueo) .layout-navbar, body:has(.arqueo) .layout-vertical-nav, body:has(.arqueo) .layout-footer, body:has(.arqueo) .layout-horizontal-nav, body:has(.arqueo) .customizer-toggler { display: none !important; } body:has(.arqueo) .layout-content-wrapper { padding: 0 !important; margin: 0 !important; } body:has(.arqueo) .layout-page-content { padding: 0 !important; max-inline-size: none !important; } }
</style>
