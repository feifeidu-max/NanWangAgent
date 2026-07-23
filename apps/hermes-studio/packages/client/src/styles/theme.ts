import type { GlobalThemeOverrides } from 'naive-ui'

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#005bac',
    primaryColorHover: '#00458a',
    primaryColorPressed: '#003a75',
    primaryColorSuppl: '#005bac',
    bodyColor: '#fafafa',
    cardColor: '#ffffff',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    tableColor: '#ffffff',
    inputColor: '#ffffff',
    actionColor: '#f0f0f0',
    textColorBase: '#1a1a1a',
    textColor1: '#1a1a1a',
    textColor2: '#666666',
    textColor3: '#999999',
    dividerColor: '#e0e0e0',
    borderColor: '#e0e0e0',
    hoverColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontSize: '14px',
    fontSizeMedium: '14px',
    heightMedium: '36px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'JetBrains Mono, Fira Code, Consolas, monospace',
  },
  Layout: {
    color: '#fafafa',
    siderColor: '#f5f5f5',
    headerColor: '#fafafa',
  },
  Menu: {
    itemTextColorActive: '#00458a',
    itemTextColorActiveHover: '#003a75',
    itemTextColorChildActive: '#00458a',
    itemIconColorActive: '#005bac',
    itemIconColorActiveHover: '#00458a',
    itemColorActive: 'rgba(0, 91, 172, 0.10)',
    itemColorActiveHover: 'rgba(0, 91, 172, 0.16)',
    arrowColorActive: '#005bac',
  },
  Button: {
    textColorPrimary: '#ffffff',
    colorPrimary: '#005bac',
    colorHoverPrimary: '#00458a',
    colorPressedPrimary: '#003a75',
  },
  Input: {
    color: '#ffffff',
    colorFocus: '#ffffff',
    border: '1px solid #e0e0e0',
    borderHover: '1px solid #999999',
    borderFocus: '1px solid #005bac',
    borderDisabled: '1px solid #ebebeb',
    groupLabelBorder: '1px solid #e0e0e0',
    placeholderColor: '#999999',
    caretColor: '#005bac',
  },
  InternalSelection: {
    border: '1px solid #e0e0e0',
    borderHover: '1px solid #999999',
    borderActive: '1px solid #005bac',
    borderFocus: '1px solid #005bac',
  },
  Card: {
    color: '#ffffff',
    borderColor: '#e0e0e0',
  },
  Modal: {
    color: '#ffffff',
  },
  Tag: {
    borderRadius: '6px',
  },
}

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#4f9be0',
    primaryColorHover: '#76b6ea',
    primaryColorPressed: '#9cc8ef',
    primaryColorSuppl: '#4f9be0',
    bodyColor: '#1a1a1a',
    cardColor: '#2a2a2a',
    modalColor: '#2a2a2a',
    popoverColor: '#2a2a2a',
    tableColor: '#2a2a2a',
    inputColor: '#2a2a2a',
    actionColor: '#252525',
    textColorBase: '#e0e0e0',
    textColor1: '#e0e0e0',
    textColor2: '#a0a0a0',
    textColor3: '#666666',
    dividerColor: '#3a3a3a',
    borderColor: '#3a3a3a',
    hoverColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontSize: '14px',
    fontSizeMedium: '14px',
    heightMedium: '36px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'JetBrains Mono, Fira Code, Consolas, monospace',
  },
  Layout: {
    color: '#1a1a1a',
    siderColor: '#202020',
    headerColor: '#1a1a1a',
  },
  Menu: {
    itemTextColorActive: '#4f9be0',
    itemTextColorActiveHover: '#76b6ea',
    itemTextColorChildActive: '#4f9be0',
    itemIconColorActive: '#4f9be0',
    itemIconColorActiveHover: '#76b6ea',
    itemColorActive: 'rgba(79, 155, 224, 0.16)',
    itemColorActiveHover: 'rgba(79, 155, 224, 0.24)',
    arrowColorActive: '#4f9be0',
  },
  Button: {
    textColorPrimary: '#06243f',
    colorPrimary: '#4f9be0',
    colorHoverPrimary: '#76b6ea',
    colorPressedPrimary: '#9cc8ef',
  },
  Input: {
    color: '#2a2a2a',
    colorFocus: '#2a2a2a',
    border: '1px solid #555555',
    borderHover: '1px solid #777777',
    borderFocus: '1px solid #4f9be0',
    borderDisabled: '1px solid #3a3a3a',
    groupLabelBorder: '1px solid #555555',
    placeholderColor: '#666666',
    caretColor: '#4f9be0',
  },
  InternalSelection: {
    border: '1px solid #555555',
    borderHover: '1px solid #777777',
    borderActive: '1px solid #4f9be0',
    borderFocus: '1px solid #4f9be0',
  },
  Card: {
    color: '#2a2a2a',
    borderColor: '#3a3a3a',
  },
  Modal: {
    color: '#2a2a2a',
  },
  Tag: {
    borderRadius: '6px',
  },
  Switch: {
    railColor: '#3a3a3a',
    railColorActive: '#4f9be0',
    loadingColor: '#e0e0e0',
    opacityDisabled: 0.4,
  },
}

export function getThemeOverrides(isDark: boolean, isComic?: boolean): GlobalThemeOverrides {
  const base = isDark ? darkThemeOverrides : lightThemeOverrides
  if (!isComic) return base
  const comicFont = "'Comic Neue', 'ZCOOL KuaiLe', 'Zen Maru Gothic', 'Gaegu', cursive, sans-serif"
  return {
    ...base,
    common: {
      ...base.common!,
      fontFamily: comicFont,
    },
  }
}
