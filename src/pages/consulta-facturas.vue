
<script setup lang="ts">
import { ref } from 'vue'

interface Gasto {
  id: number
  fondo_id: number
  tipo_comprobante_id: number
  tipo_comprobante: string
  serie_comprobante: string | null
  numero_comprobante: string
  fecha_comprobante: string
  proveedor_id: number
  proveedor_nombre: string
  persona_realizo_gasto_id: number
  persona_realizo_gasto: string
  usuario_registro_id: number
  usuario_registro: string
  monto: number
  motivo_gasto: string
  observaciones: string | null
  documento_url: string | null
  estado: string
  mes: number
  anio: number
  creado_en: string
}

const API_URL = 'http://localhost:4000/api'

const numeroFactura = ref('')
const serieFactura = ref('')

const gastos = ref<Gasto[]>([])

const loading = ref(false)
const buscando = ref(false)

const errorMessage = ref('')
const successMessage = ref('')

const facturaEncontrada = ref(false)

/*
|--------------------------------------------------------------------------
| BUSCAR FACTURA
|--------------------------------------------------------------------------
*/

const buscarFactura = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  facturaEncontrada.value = false
  gastos.value = []

  const numero = numeroFactura.value.trim()
  const serie = serieFactura.value.trim()

  if (!numero) {
    errorMessage.value =
      'Ingresa el número de factura o comprobante.'
    return
  }

  buscando.value = true
  loading.value = true

  try {
    /*
     * Construimos la URL de búsqueda.
     */
    let url =
      `${API_URL}/gastos?numero_comprobante=${encodeURIComponent(numero)}`

    /*
     * Si se ingresó una serie también la enviamos.
     */
    if (serie) {
      url +=
        `&serie_comprobante=${encodeURIComponent(serie)}`
    }

    console.log(
      '🔎 Buscando factura:',
      url
    )

    const response = await fetch(url)

    const resultado = await response.json()

    console.log(
      '📥 Resultado de búsqueda:',
      resultado
    )

    if (!response.ok) {
      throw new Error(
        resultado.detalles ||
          resultado.message ||
          'No se pudo realizar la búsqueda.'
      )
    }

    /*
     * Dependiendo de cómo responda el backend,
     * aceptamos directamente un arreglo o
     * un objeto que contenga gastos.
     */
    const resultados: Gasto[] =
      Array.isArray(resultado)
        ? resultado
        : resultado.gastos || []

    gastos.value = resultados

    if (resultados.length === 0) {
      errorMessage.value =
        'No se encontró ninguna factura con ese número.'
      facturaEncontrada.value = false
    } else {
      successMessage.value =
        `Se encontraron ${resultados.length} resultado(s).`
      facturaEncontrada.value = true
    }
  } catch (error: any) {
    console.error(
      '❌ Error al buscar factura:',
      error
    )

    errorMessage.value =
      error.message ||
      'Error al buscar la factura.'
  } finally {
    buscando.value = false
    loading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| LIMPIAR BÚSQUEDA
|--------------------------------------------------------------------------
*/

const limpiarBusqueda = () => {
  numeroFactura.value = ''
  serieFactura.value = ''

  gastos.value = []

  errorMessage.value = ''
  successMessage.value = ''

  facturaEncontrada.value = false
}

/*
|--------------------------------------------------------------------------
| FORMATO MONEDA
|--------------------------------------------------------------------------
*/

const formatoMoneda = (
  valor: number
) => {
  return new Intl.NumberFormat(
    'es-GT',
    {
      style: 'currency',
      currency: 'GTQ',
    }
  ).format(Number(valor))
}

/*
|--------------------------------------------------------------------------
| FORMATO FECHA
|--------------------------------------------------------------------------
*/

const formatoFecha = (
  fecha: string
) => {
  if (!fecha) {
    return ''
  }

  const partes =
    fecha
      .split('T')[0]
      .split('-')

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

/*
|--------------------------------------------------------------------------
| COLOR DEL ESTADO
|--------------------------------------------------------------------------
*/

const colorEstado = (
  estado: string
) => {
  switch (estado) {
    case 'aprobado':
      return 'success'

    case 'rechazado':
      return 'error'

    case 'anulado':
      return 'secondary'

    case 'pendiente':
      return 'warning'

    default:
      return 'default'
  }
}
</script>

<template>
  <div>
    <!-- ============================================================
         TARJETA PRINCIPAL
    ============================================================= -->

    <VCard>
      <VCardItem>
        <VCardTitle>
          Consulta de Facturas
        </VCardTitle>

        <VCardSubtitle>
          Busca gastos registrados mediante el número de factura
          o comprobante.
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <!-- ========================================================
             MENSAJES
        ========================================================= -->

        <VAlert
          v-if="successMessage"
          type="success"
          variant="tonal"
          closable
          class="mb-4"
        >
          {{ successMessage }}
        </VAlert>

        <VAlert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          closable
          class="mb-4"
        >
          {{ errorMessage }}
        </VAlert>

        <!-- ========================================================
             BUSCADOR
        ========================================================= -->

        <VRow>
          <!-- SERIE -->
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="serieFactura"
              label="Serie"
              placeholder="Ej. A"
              clearable
              @keyup.enter="buscarFactura"
            />
          </VCol>

          <!-- NUMERO -->
          <VCol
            cols="12"
            md="5"
          >
            <VTextField
              v-model="numeroFactura"
              label="Número de factura *"
              placeholder="Ej. 1111"
              clearable
              autofocus
              @keyup.enter="buscarFactura"
            />
          </VCol>

          <!-- BOTONES -->
          <VCol
            cols="12"
            md="4"
            class="d-flex align-center gap-3"
          >
            <VBtn
              color="primary"
              prepend-icon="ri-search-line"
              :loading="buscando"
              @click="buscarFactura"
            >
              Buscar
            </VBtn>

            <VBtn
              variant="tonal"
              prepend-icon="ri-refresh-line"
              :disabled="buscando"
              @click="limpiarBusqueda"
            >
              Limpiar
            </VBtn>
          </VCol>
        </VRow>

        <!-- ========================================================
             RESULTADOS
        ========================================================= -->

        <div
          v-if="facturaEncontrada"
          class="mt-6"
        >
          <div
            class="d-flex align-center justify-space-between mb-4"
          >
            <div>
              <h3 class="text-h6">
                Resultado de la búsqueda
              </h3>

              <p class="text-body-2 text-medium-emphasis">
                Factura encontrada correctamente.
              </p>
            </div>

            <VChip
              color="success"
              variant="tonal"
            >
              {{ gastos.length }} resultado(s)
            </VChip>
          </div>

          <!-- ======================================================
               TARJETAS DE RESULTADOS
          ======================================================= -->

          <VRow>
            <VCol
              v-for="gasto in gastos"
              :key="gasto.id"
              cols="12"
            >
              <VCard
                variant="outlined"
              >
                <VCardItem>
                  <template #prepend>
                    <VAvatar
                      color="primary"
                      variant="tonal"
                    >
                      <VIcon
                        icon="ri-file-text-line"
                      />
                    </VAvatar>
                  </template>

                  <VCardTitle>
                    {{ gasto.tipo_comprobante }}
                  </VCardTitle>

                  <VCardSubtitle>
                    Comprobante:
                    <strong>
                      <span
                        v-if="gasto.serie_comprobante"
                      >
                        {{ gasto.serie_comprobante }}-
                      </span>

                      {{ gasto.numero_comprobante }}
                    </strong>
                  </VCardSubtitle>

                  <template #append>
                    <VChip
                      :color="
                        colorEstado(gasto.estado)
                      "
                      label
                    >
                      {{ gasto.estado }}
                    </VChip>
                  </template>
                </VCardItem>

                <VCardText>
                  <VRow>
                    <!-- FECHA -->
                    <VCol
                      cols="12"
                      sm="6"
                      md="3"
                    >
                      <div
                        class="text-caption text-medium-emphasis"
                      >
                        Fecha
                      </div>

                      <div class="font-weight-medium">
                        {{
                          formatoFecha(
                            gasto.fecha_comprobante
                          )
                        }}
                      </div>
                    </VCol>

                    <!-- PROVEEDOR -->
                    <VCol
                      cols="12"
                      sm="6"
                      md="3"
                    >
                      <div
                        class="text-caption text-medium-emphasis"
                      >
                        Proveedor
                      </div>

                      <div class="font-weight-medium">
                        {{
                          gasto.proveedor_nombre ||
                          'Sin proveedor'
                        }}
                      </div>
                    </VCol>

                    <!-- MONTO -->
                    <VCol
                      cols="12"
                      sm="6"
                      md="3"
                    >
                      <div
                        class="text-caption text-medium-emphasis"
                      >
                        Monto
                      </div>

                      <div
                        class="text-h6 font-weight-bold"
                      >
                        {{
                          formatoMoneda(
                            gasto.monto
                          )
                        }}
                      </div>
                    </VCol>

                    <!-- ID -->
                    <VCol
                      cols="12"
                      sm="6"
                      md="3"
                    >
                      <div
                        class="text-caption text-medium-emphasis"
                      >
                        ID del gasto
                      </div>

                      <div class="font-weight-medium">
                        #{{ gasto.id }}
                      </div>
                    </VCol>

                    <!-- MOTIVO -->
                    <VCol cols="12">
                      <VDivider class="my-2" />

                      <div
                        class="text-caption text-medium-emphasis mb-1"
                      >
                        Motivo del gasto
                      </div>

                      <div>
                        {{
                          gasto.motivo_gasto ||
                          'Sin motivo registrado'
                        }}
                      </div>
                    </VCol>

                    <!-- OBSERVACIONES -->
                    <VCol
                      v-if="gasto.observaciones"
                      cols="12"
                    >
                      <div
                        class="text-caption text-medium-emphasis mb-1"
                      >
                        Observaciones
                      </div>

                      <div>
                        {{ gasto.observaciones }}
                      </div>
                    </VCol>

                    <!-- PERSONA -->
                    <VCol
                      cols="12"
                      sm="6"
                    >
                      <div
                        class="text-caption text-medium-emphasis"
                      >
                        Persona que realizó el gasto
                      </div>

                      <div class="font-weight-medium">
                        {{
                          gasto.persona_realizo_gasto ||
                          'No disponible'
                        }}
                      </div>
                    </VCol>

                    <!-- USUARIO -->
                    <VCol
                      cols="12"
                      sm="6"
                    >
                      <div
                        class="text-caption text-medium-emphasis"
                      >
                        Registrado por
                      </div>

                      <div class="font-weight-medium">
                        {{
                          gasto.usuario_registro ||
                          'No disponible'
                        }}
                      </div>
                    </VCol>

                    <!-- DOCUMENTO -->
                    <VCol
                      v-if="gasto.documento_url"
                      cols="12"
                    >
                      <VBtn
                        :href="
                          gasto.documento_url
                        "
                        target="_blank"
                        variant="tonal"
                        prepend-icon="ri-file-text-line"
                      >
                        Ver documento
                      </VBtn>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </div>

        <!-- ========================================================
             ESTADO INICIAL
        ========================================================= -->

        <div
          v-else-if="
            !loading &&
            !errorMessage &&
            !buscando
          "
          class="text-center py-10"
        >
          <VIcon
            icon="ri-search-line"
            size="60"
            class="mb-4 text-medium-emphasis"
          />

          <h3 class="text-h6 mb-2">
            Buscar una factura
          </h3>

          <p class="text-body-2 text-medium-emphasis">
            Ingresa el número de la factura o comprobante
            para consultar sus datos.
          </p>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>
```

