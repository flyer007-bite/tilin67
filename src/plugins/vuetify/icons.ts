import type { IconAliases, IconProps } from 'vuetify'
import { h } from 'vue'

const aliases: Partial<IconAliases> = {
  'mdi-checkbox-blank-outline': 'tabler-square',
  'mdi-checkbox-marked': 'tabler-square-check',
  'mdi-minus-box': 'tabler-square-minus',
  'mdi-radiobox-marked': 'tabler-circle-dot',
  'mdi-radiobox-blank': 'tabler-circle',
  calendar: 'tabler-calendar',
  collapse: 'tabler-chevron-up',
  complete: 'tabler-check',
  cancel: 'tabler-x',
  close: 'tabler-x',
  delete: 'tabler-circle-x-filled',
  clear: 'tabler-circle-x',
  success: 'tabler-circle-check',
  info: 'tabler-info-circle',
  warning: 'tabler-alert-triangle',
  error: 'tabler-alert-circle',
  prev: 'tabler-chevron-left',
  ratingEmpty: 'tabler-star',
  ratingFull: 'tabler-star-filled',
  ratingHalf: 'tabler-star-half-filled',
  next: 'tabler-chevron-right',
  delimiter: 'tabler-circle',
  sort: 'tabler-arrow-up',
  expand: 'tabler-chevron-down',
  menu: 'tabler-menu-2',
  subgroup: 'tabler-caret-down',
  dropdown: 'tabler-chevron-down',
  edit: 'tabler-pencil',
  loading: 'tabler-refresh',
  first: 'tabler-player-skip-back',
  last: 'tabler-player-skip-forward',
  unfold: 'tabler-arrows-move-vertical',
  file: 'tabler-paperclip',
  plus: 'tabler-plus',
  minus: 'tabler-minus',
  sortAsc: 'tabler-arrow-up',
  sortDesc: 'tabler-arrow-down',
}

export const iconify = {
  component: (props: IconProps) => {
    return h(
      props.tag,
      {
        ...props,

        // As we are using class based icons
        class: [props.icon],

        // Remove used props from DOM rendering
        tag: undefined,
        icon: undefined,
      },
    )
  },
}

export const icons = {
  defaultSet: 'iconify',
  aliases,
  sets: {
    iconify,
  },
}
