import type { ThemeDefinition } from 'vuetify'

/*
|--------------------------------------------------------------------------
| COLOR PRINCIPAL
|--------------------------------------------------------------------------
| Dorado más sobrio que el anterior.
| Mantiene la identidad actual sin saturar toda la interfaz.
|--------------------------------------------------------------------------
*/

export const staticPrimaryColor = '#A67C1B'
export const staticPrimaryDarkenColor = '#876312'

export const themes: Record<string, ThemeDefinition> = {
  /*
  |--------------------------------------------------------------------------
  | TEMA CLARO
  |--------------------------------------------------------------------------
  */
  light: {
    dark: false,

    colors: {
      // Colores principales
      primary: staticPrimaryColor,
      'on-primary': '#FFFFFF',
      'primary-darken-1': staticPrimaryDarkenColor,

      secondary: '#6D6B77',
      'on-secondary': '#FFFFFF',
      'secondary-darken-1': '#56545F',

      // Estados
      success: '#2E9D65',
      'on-success': '#FFFFFF',
      'success-darken-1': '#237D50',

      info: '#3478C8',
      'on-info': '#FFFFFF',
      'info-darken-1': '#285FA0',

      warning: '#C5821B',
      'on-warning': '#FFFFFF',
      'warning-darken-1': '#9F6815',

      error: '#D34E4E',
      'on-error': '#FFFFFF',
      'error-darken-1': '#B23B3B',

      // Fondo general
      background: '#F4F5F7',
      'on-background': '#2F2B3D',

      // Tarjetas, tablas, navbar, etc.
      surface: '#FFFFFF',
      'on-surface': '#2F2B3D',

      // Escala de grises
      'grey-50': '#FAFAFB',
      'grey-100': '#F2F3F5',
      'grey-200': '#E6E7EA',
      'grey-300': '#D7D9DE',
      'grey-400': '#B9BBC2',
      'grey-500': '#92949C',
      'grey-600': '#74767E',
      'grey-700': '#565860',
      'grey-800': '#3C3E45',
      'grey-900': '#24252A',
      'grey-light': '#F2F3F5',

      'perfect-scrollbar-thumb': '#B9BBC2',

      'skin-bordered-background': '#F7F7F9',
      'skin-bordered-surface': '#FFFFFF',

      'expansion-panel-text-custom-bg': '#F0F1F3',
    },

    variables: {
      'code-color': '#A67C1B',

      'overlay-scrim-background': '#2F2B3D',
      'tooltip-background': '#2F2B3D',

      'overlay-scrim-opacity': 0.45,

      'hover-opacity': 0.06,
      'focus-opacity': 0.1,
      'selected-opacity': 0.08,
      'activated-opacity': 0.16,
      'pressed-opacity': 0.14,
      'dragged-opacity': 0.1,
      'disabled-opacity': 0.4,

      'border-color': '#D7D9DE',
      'border-opacity': 0.75,

      'table-header-color': '#4B465C',

      'high-emphasis-opacity': 0.9,
      'medium-emphasis-opacity': 0.72,

      'switch-opacity': 0.2,
      'switch-disabled-track-opacity': 0.3,
      'switch-disabled-thumb-opacity': 0.4,
      'switch-checked-disabled-opacity': 0.3,

      'track-bg': '#E6E7EA',

      // Sombras suaves
      'shadow-key-umbra-color': '#2F2B3D',
      'shadow-xs-opacity': 0.06,
      'shadow-sm-opacity': 0.08,
      'shadow-md-opacity': 0.1,
      'shadow-lg-opacity': 0.12,
      'shadow-xl-opacity': 0.14,
    },
  },

  /*
  |--------------------------------------------------------------------------
  | TEMA OSCURO
  |--------------------------------------------------------------------------
  */
  dark: {
    dark: true,

    colors: {
      primary: '#C29B36',
      'on-primary': '#17130A',
      'primary-darken-1': '#A7832B',

      secondary: '#8C8996',
      'on-secondary': '#FFFFFF',
      'secondary-darken-1': '#74717D',

      success: '#3AA675',
      'on-success': '#FFFFFF',
      'success-darken-1': '#2F8B61',

      info: '#4B8FD8',
      'on-info': '#FFFFFF',
      'info-darken-1': '#3675BB',

      warning: '#D49A36',
      'on-warning': '#17130A',
      'warning-darken-1': '#B47E27',

      error: '#E05D5D',
      'on-error': '#FFFFFF',
      'error-darken-1': '#C74747',

      background: '#17161B',
      'on-background': '#E7E5EA',

      surface: '#222126',
      'on-surface': '#E7E5EA',

      'grey-50': '#242329',
      'grey-100': '#2A292F',
      'grey-200': '#34333A',
      'grey-300': '#45434C',
      'grey-400': '#66636D',
      'grey-500': '#8C8993',
      'grey-600': '#ABA8B1',
      'grey-700': '#C8C5CC',
      'grey-800': '#DEDBE1',
      'grey-900': '#F0EEF2',
      'grey-light': '#2A292F',

      'perfect-scrollbar-thumb': '#57545E',

      'skin-bordered-background': '#17161B',
      'skin-bordered-surface': '#222126',

      'expansion-panel-text-custom-bg': '#2A292F',
    },

    variables: {
      'code-color': '#D0AA43',

      'overlay-scrim-background': '#000000',
      'tooltip-background': '#2A292F',

      'overlay-scrim-opacity': 0.55,

      'hover-opacity': 0.08,
      'focus-opacity': 0.12,
      'selected-opacity': 0.1,
      'activated-opacity': 0.16,
      'pressed-opacity': 0.14,
      'dragged-opacity': 0.12,
      'disabled-opacity': 0.4,

      'border-color': '#49464F',
      'border-opacity': 0.65,

      'table-header-color': '#D0CDD5',

      'high-emphasis-opacity': 0.95,
      'medium-emphasis-opacity': 0.75,

      'switch-opacity': 0.4,
      'switch-disabled-track-opacity': 0.4,
      'switch-disabled-thumb-opacity': 0.8,
      'switch-checked-disabled-opacity': 0.3,

      'track-bg': '#343239',

      'shadow-key-umbra-color': '#000000',
      'shadow-xs-opacity': 0.16,
      'shadow-sm-opacity': 0.18,
      'shadow-md-opacity': 0.2,
      'shadow-lg-opacity': 0.22,
      'shadow-xl-opacity': 0.24,
    },
  },
}

export default themes
