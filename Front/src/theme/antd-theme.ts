import type { ThemeConfig } from 'antd';

export const reaccionVitalTheme: ThemeConfig = {
  token: {
    colorPrimary: '#9f1d2d',
    colorSuccess: '#3f7d5b',
    colorWarning: '#b7791f',
    colorError: '#b4232f',
    colorInfo: '#2563a6',
    colorText: '#20242a',
    colorTextSecondary: '#626a73',
    colorBgLayout: '#f3f4f6',
    colorBgContainer: '#ffffff',
    colorBorder: '#d8dce1',
    colorBorderSecondary: '#e7e9ec',
    borderRadius: 7,
    borderRadiusLG: 9,
    boxShadow: '0 1px 3px rgba(20, 27, 36, 0.08)',
    boxShadowSecondary: '0 2px 8px rgba(20, 27, 36, 0.08)',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 15,
    controlHeight: 40,
    controlHeightLG: 44,
    lineHeight: 1.5,
    padding: 16,
    paddingLG: 24,
    margin: 16,
    marginLG: 24,
  },
  components: {
    Layout: {
      bodyBg: '#f3f4f6',
      headerBg: '#ffffff',
      siderBg: '#22272e',
    },
    Menu: {
      darkItemBg: '#22272e',
      darkSubMenuItemBg: '#22272e',
      darkItemColor: '#cdd2d8',
      darkItemHoverBg: '#2c333b',
      darkItemSelectedBg: '#3a252b',
      darkItemSelectedColor: '#ffffff',
      itemBorderRadius: 6,
      itemHeight: 42,
    },
    Button: {
      primaryShadow: 'none',
      dangerShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 600,
    },
    Card: {
      boxShadow: 'none',
      headerBg: '#ffffff',
    },
    Table: {
      headerBg: '#f7f7f8',
      headerColor: '#3f464f',
      headerSplitColor: '#e2e5e9',
      rowHoverBg: '#fafafa',
    },
    Modal: {
      titleFontSize: 18,
    },
    Typography: {
      titleMarginBottom: 0,
    },
  },
};
