import { ref } from 'vue'

// Numeración de las filas visibles, independiente de los ID de la base.
export const useTableNumbering = () => {
  const numberPage = ref(1)
  const numberPageSize = ref(10)
  const rowNumber = (index: number) =>
    (numberPageSize.value > 0 ? (numberPage.value - 1) * numberPageSize.value : 0) + index + 1

  return { numberPage, numberPageSize, rowNumber }
}

