
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Ingreso {
  id: number
  monto?: number | string
  cantidad?: number | string
  fecha?: string
  fecha_ingreso?: string
  descripcion?: string
  concepto?: string
  observacion?: string
  numero_comprobante?: string
  fondo_id?: number
}

interface Gasto {
  id: number
  monto?: number | string
  cantidad?: number | string
  total?: number | string
  fecha?: string
  fecha_gasto?: string
  fecha_comprobante?: string
  descripcion?: string
  concepto?: string
  observacion?: string
  categoria?: string
  categoria_nombre?: string
  tipo_gasto?: string
  numero_comprobante?: string
  proveedor_nombre?: string
}

interface MovimientoReciente {
  id: number
  fecha: string
  descripcion: string
  tipo: 'INGRESO' | 'EGRESO'
  monto: number
}

interface MovimientoGrafica {
  fecha: string
  ingresos: number
  gastos: number
  saldo: number
}

interface GastoCategoria {
  nombre: string
  monto: number
}

/* =========================================================
   CONFIGURACIÓN DE LA API
========================================================= */

const API_URL = 'http://localhost:4000/api'

/* =========================================================
   ESTADO
========================================================= */

const loading = ref(false)
const error = ref('')

const ingresos = ref<Ingreso[]>([])
const gastos = ref<Gasto[]>([])

/* =========================================================
   FILTROS
========================================================= */

const anio = ref(String(new Date().getFullYear()))

const meses = [
  'Todos',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const mes = ref('Todos')

const fechaInicio = ref('')
const fechaFin = ref('')

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

const convertirNumero = (valor: unknown): number => {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0
  }

  if (typeof valor === 'string') {
    const numero = Number(
      valor
        .replace(/,/g, '')
        .replace(/[^\d.-]/g, ''),
    )

    return Number.isFinite(numero) ? numero : 0
  }

  return 0
}

const obtenerMontoIngreso = (ingreso: Ingreso): number => {
  return convertirNumero(
    ingreso.monto ??
    ingreso.cantidad ??
    0,
  )
}

const obtenerMontoGasto = (gasto: Gasto): number => {
  return convertirNumero(
    gasto.monto ??
    gasto.total ??
    gasto.cantidad ??
    0,
  )
}

const obtenerFechaIngreso = (ingreso: Ingreso): string => {
  return (
    ingreso.fecha ??
    ingreso.fecha_ingreso ??
    ''
  )
}

const obtenerFechaGasto = (gasto: Gasto): string => {
  return (
    gasto.fecha ??
    gasto.fecha_gasto ??
    gasto.fecha_comprobante ??
    ''
  )
}

const obtenerDescripcionIngreso = (ingreso: Ingreso): string => {
  return (
    ingreso.descripcion ??
    ingreso.concepto ??
    ingreso.observacion ??
    ingreso.numero_comprobante ??
    'Ingreso de caja'
  )
}

const obtenerDescripcionGasto = (gasto: Gasto): string => {
  return (
    gasto.descripcion ??
    gasto.concepto ??
    gasto.observacion ??
    gasto.proveedor_nombre ??
    gasto.numero_comprobante ??
    'Egreso de caja'
  )
}

const obtenerFechaISO = (fecha: string): string => {
  if (!fecha) {
    return ''
  }

  /*
   * Si viene como YYYY-MM-DD,
   * la dejamos directamente.
   */
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    return fecha.substring(0, 10)
  }

  const fechaObjeto = new Date(fecha)

  if (Number.isNaN(fechaObjeto.getTime())) {
    return fecha.substring(0, 10)
  }

  return fechaObjeto.toISOString().substring(0, 10)
}

const formatearFecha = (fecha: string): string => {
  if (!fecha) {
    return '-'
  }

  const fechaISO = obtenerFechaISO(fecha)

  if (!fechaISO) {
    return '-'
  }

  const partes = fechaISO.split('-')

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const formatearMoneda = (valor: number): string => {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(valor)
}

/* =========================================================
   CARGAR INGRESOS
========================================================= */

const cargarIngresos = async () => {
  const respuesta = await fetch(
    `${API_URL}/ingresos`,
  )

  if (!respuesta.ok) {
    throw new Error(
      `Error al consultar ingresos: ${respuesta.status}`,
    )
  }

  const data = await respuesta.json()

  if (Array.isArray(data)) {
    ingresos.value = data
  }
  else if (Array.isArray(data.data)) {
    ingresos.value = data.data
  }
  else if (Array.isArray(data.ingresos)) {
    ingresos.value = data.ingresos
  }
  else {
    ingresos.value = []
  }

  console.log('Ingresos cargados:', ingresos.value)
}

/* =========================================================
   CARGAR GASTOS
========================================================= */

const cargarGastos = async () => {
  const respuesta = await fetch(
    `${API_URL}/gastos`,
  )

  if (!respuesta.ok) {
    throw new Error(
      `Error al consultar gastos: ${respuesta.status}`,
    )
  }

  const data = await respuesta.json()

  if (Array.isArray(data)) {
    gastos.value = data
  }
  else if (Array.isArray(data.data)) {
    gastos.value = data.data
  }
  else if (Array.isArray(data.gastos)) {
    gastos.value = data.gastos
  }
  else if (Array.isArray(data.egresos)) {
    gastos.value = data.egresos
  }
  else {
    gastos.value = []
  }

  console.log('Gastos cargados:', gastos.value)
}

/* =========================================================
   CARGAR DASHBOARD
========================================================= */

const cargarDashboard = async () => {
  loading.value = true
  error.value = ''

  try {
    await Promise.all([
      cargarIngresos(),
      cargarGastos(),
    ])
  }
  catch (err) {
    console.error(
      'Error cargando Dashboard:',
      err,
    )

    error.value =
      err instanceof Error
        ? err.message
        : 'No se pudieron cargar los datos.'
  }
  finally {
    loading.value = false
  }
}

/* =========================================================
   FILTROS
========================================================= */

const fechaCumpleFiltro = (
  fecha: string,
): boolean => {
  if (!fecha) {
    return false
  }

  const fechaISO = obtenerFechaISO(fecha)

  if (!fechaISO) {
    return false
  }

  /* Año */

  if (
    anio.value &&
    anio.value !== 'Todos'
  ) {
    if (
      !fechaISO.startsWith(anio.value)
    ) {
      return false
    }
  }

  /* Mes */

  if (mes.value !== 'Todos') {
    const numeroMes =
      meses.indexOf(mes.value)

    if (numeroMes > 0) {
      const mesISO =
        String(numeroMes).padStart(2, '0')

      if (
        fechaISO.substring(5, 7) !== mesISO
      ) {
        return false
      }
    }
  }

  /* Fecha inicial */

  if (
    fechaInicio.value &&
    fechaISO < fechaInicio.value
  ) {
    return false
  }

  /* Fecha final */

  if (
    fechaFin.value &&
    fechaISO > fechaFin.value
  ) {
    return false
  }

  return true
}

/* =========================================================
   INGRESOS FILTRADOS
========================================================= */

const ingresosFiltrados = computed(() => {
  return ingresos.value.filter(ingreso =>
    fechaCumpleFiltro(
      obtenerFechaIngreso(ingreso),
    ),
  )
})

/* =========================================================
   GASTOS FILTRADOS
========================================================= */

const gastosFiltrados = computed(() => {
  return gastos.value.filter(gasto =>
    fechaCumpleFiltro(
      obtenerFechaGasto(gasto),
    ),
  )
})

/* =========================================================
   TOTALES
========================================================= */

const totalIngresos = computed(() => {
  return ingresosFiltrados.value.reduce(
    (total, ingreso) =>
      total +
      obtenerMontoIngreso(ingreso),
    0,
  )
})

const totalGastos = computed(() => {
  return gastosFiltrados.value.reduce(
    (total, gasto) =>
      total +
      obtenerMontoGasto(gasto),
    0,
  )
})

const saldo = computed(() => {
  return (
    totalIngresos.value -
    totalGastos.value
  )
})

const cajaDisponible = computed(() => {
  return saldo.value
})

/* =========================================================
   ESTADÍSTICAS
========================================================= */

const estadisticas = computed(() => [
  {
    title: 'Total ingresos',
    value: formatearMoneda(
      totalIngresos.value,
    ),
    icon: 'tabler-arrow-down',
    color: 'success',
  },

  {
    title: 'Total egresos',
    value: formatearMoneda(
      totalGastos.value,
    ),
    icon: 'tabler-arrow-up',
    color: 'error',
  },

  {
    title: 'Saldo',
    value: formatearMoneda(
      saldo.value,
    ),
    icon: 'tabler-wallet',
    color: 'primary',
  },

  {
    title: 'Caja disponible',
    value: formatearMoneda(
      cajaDisponible.value,
    ),
    icon: 'tabler-cash',
    color: 'info',
  },
])

/* =========================================================
   MOVIMIENTOS RECIENTES
========================================================= */

const movimientosRecientes =
  computed<MovimientoReciente[]>(() => {
    const lista: MovimientoReciente[] = []

    ingresosFiltrados.value.forEach(
      ingreso => {
        lista.push({
          id: ingreso.id,
          fecha:
            obtenerFechaIngreso(
              ingreso,
            ),
          descripcion:
            obtenerDescripcionIngreso(
              ingreso,
            ),
          tipo: 'INGRESO',
          monto:
            obtenerMontoIngreso(
              ingreso,
            ),
        })
      },
    )

    gastosFiltrados.value.forEach(
      gasto => {
        lista.push({
          id: gasto.id,
          fecha:
            obtenerFechaGasto(gasto),
          descripcion:
            obtenerDescripcionGasto(
              gasto,
            ),
          tipo: 'EGRESO',
          monto:
            obtenerMontoGasto(gasto),
        })
      },
    )

    return lista
      .sort((a, b) => {
        const fechaA =
          new Date(a.fecha).getTime()

        const fechaB =
          new Date(b.fecha).getTime()

        return fechaB - fechaA
      })
      .slice(0, 10)
  })

/* =========================================================
   GRÁFICA DE MOVIMIENTOS
========================================================= */

const movimientosGrafica =
  computed<MovimientoGrafica[]>(() => {
    const datos = new Map<
      string,
      {
        ingresos: number
        gastos: number
      }
    >()

    ingresosFiltrados.value.forEach(
      ingreso => {
        const fecha =
          obtenerFechaISO(
            obtenerFechaIngreso(
              ingreso,
            ),
          )

        if (!fecha) {
          return
        }

        if (!datos.has(fecha)) {
          datos.set(fecha, {
            ingresos: 0,
            gastos: 0,
          })
        }

        datos.get(
          fecha,
        )!.ingresos +=
          obtenerMontoIngreso(
            ingreso,
          )
      },
    )

    gastosFiltrados.value.forEach(
      gasto => {
        const fecha =
          obtenerFechaISO(
            obtenerFechaGasto(
              gasto,
            ),
          )

        if (!fecha) {
          return
        }

        if (!datos.has(fecha)) {
          datos.set(fecha, {
            ingresos: 0,
            gastos: 0,
          })
        }

        datos.get(
          fecha,
        )!.gastos +=
          obtenerMontoGasto(
            gasto,
          )
      },
    )

    const fechas =
      Array.from(
        datos.keys(),
      ).sort()

    let saldoAcumulado = 0

    return fechas.map(fecha => {
      const dato =
        datos.get(fecha)!

      saldoAcumulado +=
        dato.ingresos -
        dato.gastos

      return {
        fecha:
          formatearFecha(fecha),
        ingresos:
          dato.ingresos,
        gastos:
          dato.gastos,
        saldo:
          saldoAcumulado,
      }
    })
  })

/* =========================================================
   SERIES DE GRÁFICA
========================================================= */

const chartSeries = computed(() => [
  {
    name: 'Ingresos',

    data:
      movimientosGrafica.value.map(
        movimiento =>
          movimiento.ingresos,
      ),
  },

  {
    name: 'Egresos',

    data:
      movimientosGrafica.value.map(
        movimiento =>
          movimiento.gastos,
      ),
  },

  {
    name: 'Saldo',

    data:
      movimientosGrafica.value.map(
        movimiento =>
          movimiento.saldo,
      ),
  },
])

const chartOptions = computed(() => ({
  chart: {
    type: 'area',

    toolbar: {
      show: false,
    },
  },

  stroke: {
    curve: 'smooth',

    width: 3,
  },

  dataLabels: {
    enabled: false,
  },

  xaxis: {
    categories:
      movimientosGrafica.value.map(
        movimiento =>
          movimiento.fecha,
      ),
  },

  yaxis: {
    labels: {
      formatter: (
        value: number,
      ) =>
        formatearMoneda(value),
    },
  },

  tooltip: {
    y: {
      formatter: (
        value: number,
      ) =>
        formatearMoneda(value),
    },
  },

  legend: {
    position: 'top',
  },
}))

/* =========================================================
   EGRESOS POR CATEGORÍA
========================================================= */

const gastosCategoria =
  computed<GastoCategoria[]>(() => {
    const categorias =
      new Map<string, number>()

    gastosFiltrados.value.forEach(
      gasto => {
        const categoria =
          gasto.categoria_nombre ??
          gasto.categoria ??
          gasto.tipo_gasto ??
          'Otros'

        const monto =
          obtenerMontoGasto(
            gasto,
          )

        categorias.set(
          categoria,
          (
            categorias.get(
              categoria,
            ) ?? 0
          ) + monto,
        )
      },
    )

    return Array.from(
      categorias.entries(),
    )
      .map(
        ([nombre, monto]) => ({
          nombre,
          monto,
        }),
      )
      .sort(
        (a, b) =>
          b.monto - a.monto,
      )
  })

const donutSeries = computed(() => {
  return gastosCategoria.value.map(
    categoria =>
      categoria.monto,
  )
})

const donutOptions = computed(() => ({
  labels:
    gastosCategoria.value.map(
      categoria =>
        categoria.nombre,
    ),

  legend: {
    position: 'bottom',
  },

  tooltip: {
    y: {
      formatter: (
        value: number,
      ) =>
        formatearMoneda(value),
    },
  },

  dataLabels: {
    enabled: true,

    formatter: (
      value: number,
    ) =>
      `${value.toFixed(1)}%`,
  },
}))

/* =========================================================
   ACTUALIZACIÓN AUTOMÁTICA
========================================================= */

let intervalo:
  ReturnType<typeof setInterval> | null =
  null

const actualizarDashboard = () => {
  cargarDashboard()
}

/* =========================================================
   CICLO DE VIDA
========================================================= */

onMounted(async () => {
  await cargarDashboard()

  /*
   * Actualizamos cada 5 segundos.
   *
   * Si agregas o eliminas un ingreso/gasto,
   * el Dashboard volverá a consultar MySQL.
   */

  intervalo = setInterval(() => {
    cargarDashboard()
  }, 5000)
})

onUnmounted(() => {
  if (intervalo) {
    clearInterval(intervalo)
  }
})
</script>

<template>
  <div>

    <!-- =====================================================
         ENCABEZADO
    ====================================================== -->

    <div
      class="d-flex align-center justify-space-between mb-6"
    >
      <div>
        <h4 class="text-h4 mb-1">
          Dashboard
        </h4>

        <p
          class="text-body-1 mb-0 text-medium-emphasis"
        >
          Resumen de movimientos de caja chica
        </p>
      </div>

      <VBtn
        :loading="loading"
        prepend-icon="tabler-refresh"
        @click="actualizarDashboard"
      >
        Actualizar
      </VBtn>
    </div>

    <!-- =====================================================
         ERROR
    ====================================================== -->

    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6"
    >
      {{ error }}
    </VAlert>

    <!-- =====================================================
         FILTROS
    ====================================================== -->

    <VCard class="mb-6">
      <VCardText>
        <VRow>

          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <VSelect
              v-model="anio"
              label="Año"
              :items="[
                'Todos',
                '2025',
                '2026',
                '2027',
              ]"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <VSelect
              v-model="mes"
              label="Mes"
              :items="meses"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <VTextField
              v-model="fechaInicio"
              type="date"
              label="Fecha inicial"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <VTextField
              v-model="fechaFin"
              type="date"
              label="Fecha final"
            />
          </VCol>

        </VRow>
      </VCardText>
    </VCard>

    <!-- =====================================================
         ESTADÍSTICAS
    ====================================================== -->

    <VRow class="mb-2">

      <VCol
        v-for="estadistica in estadisticas"
        :key="estadistica.title"
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>

            <div
              class="d-flex justify-space-between"
            >

              <div>
                <div
                  class="text-body-1 text-medium-emphasis mb-2"
                >
                  {{ estadistica.title }}
                </div>

                <h4 class="text-h4">
                  {{ estadistica.value }}
                </h4>
              </div>

              <VAvatar
                :color="estadistica.color"
                variant="tonal"
                rounded
              >
                <VIcon
                  :icon="estadistica.icon"
                />
              </VAvatar>

            </div>

          </VCardText>
        </VCard>
      </VCol>

    </VRow>

    <!-- =====================================================
         GRÁFICAS
    ====================================================== -->

    <VRow>

      <!-- GRÁFICA PRINCIPAL -->

      <VCol
        cols="12"
        md="8"
      >
        <VCard>

          <VCardItem>
            <VCardTitle>
              Movimientos
            </VCardTitle>

            <VCardSubtitle>
              Ingresos, egresos y saldo
            </VCardSubtitle>
          </VCardItem>

          <VCardText>

            <div
              v-if="
                movimientosGrafica.length === 0
              "
              class="text-center py-12 text-medium-emphasis"
            >
              No hay movimientos para el período seleccionado.
            </div>

            <VueApexCharts
              v-else
              type="area"
              height="350"
              :options="chartOptions"
              :series="chartSeries"
            />

          </VCardText>

        </VCard>
      </VCol>

      <!-- GRÁFICA DE CATEGORÍAS -->

      <VCol
        cols="12"
        md="4"
      >
        <VCard>

          <VCardItem>
            <VCardTitle>
              Egresos por categoría
            </VCardTitle>

            <VCardSubtitle>
              Distribución de gastos
            </VCardSubtitle>
          </VCardItem>

          <VCardText>

            <div
              v-if="
                gastosCategoria.length === 0
              "
              class="text-center py-12 text-medium-emphasis"
            >
              No hay egresos registrados.
            </div>

            <VueApexCharts
              v-else
              type="donut"
              height="350"
              :options="donutOptions"
              :series="donutSeries"
            />

          </VCardText>

        </VCard>
      </VCol>

    </VRow>

    <!-- =====================================================
         MOVIMIENTOS RECIENTES
    ====================================================== -->

    <VCard class="mt-6">

      <VCardItem>

        <VCardTitle>
          Movimientos recientes
        </VCardTitle>

        <VCardSubtitle>
          Últimos ingresos y egresos registrados
        </VCardSubtitle>

      </VCardItem>

      <VCardText>

        <VTable>

          <thead>
            <tr>

              <th>
                Fecha
              </th>

              <th>
                Descripción
              </th>

              <th>
                Tipo
              </th>

              <th class="text-end">
                Monto
              </th>

            </tr>
          </thead>

          <tbody>

            <tr
              v-for="
                movimiento in movimientosRecientes
              "
              :key="
                `${movimiento.tipo}-${movimiento.id}`
              "
            >

              <td>
                {{
                  formatearFecha(
                    movimiento.fecha,
                  )
                }}
              </td>

              <td>
                {{
                  movimiento.descripcion
                }}
              </td>

              <td>

                <VChip
                  :color="
                    movimiento.tipo ===
                    'INGRESO'
                      ? 'success'
                      : 'error'
                  "
                  size="small"
                  variant="tonal"
                >
                  {{ movimiento.tipo }}
                </VChip>

              </td>

              <td
                class="text-end font-weight-medium"
              >
                {{
                  formatearMoneda(
                    movimiento.monto,
                  )
                }}
              </td>

            </tr>

            <tr
              v-if="
                movimientosRecientes.length === 0
              "
            >

              <td
                colspan="4"
                class="text-center py-8 text-medium-emphasis"
              >
                No hay movimientos registrados.
              </td>

            </tr>

          </tbody>

        </VTable>

      </VCardText>

    </VCard>

  </div>
</template>

