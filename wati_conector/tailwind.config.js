module.exports = {
    content: ['./frontend/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif',
                    'Apple Color Emoji',
                    'Segoe UI Emoji',
                    'Segoe UI Symbol',
                    'Noto Color Emoji',
                ],
                display: [
                    'Inter Display',
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif',
                    'Apple Color Emoji',
                    'Segoe UI Emoji',
                    'Segoe UI Symbol',
                    'Noto Color Emoji',
                ],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Courier', 'monospace'],
            },
            colors: {
                // ─── Primary & Backgrounds (from Figma) ───
                primary: {
                    DEFAULT: '#048A0E',
                    dark: '#036B0B',
                    light: '#E6FCE8',
                },
                surface: {
                    white: '#FFFFFF',
                    light: '#F6F8FC',
                    muted: '#F2F4F8',
                    red: '#FFECE3',
                    pink: '#FFF2FA',
                },
                // ─── KPI Semantic Colors ───
                kpi: {
                    positive: '#006400',
                    neutral: '#1D1F25',
                    warning: '#AA2D00',
                    negative: '#B10F41',
                },
                // ─── Chart / Support Colors ───
                chart: {
                    greenSoft: '#73b48a',
                    brownDark: '#3a332a',
                    blueVega: '#4c78a8',
                    blueLight: '#9ecae9',
                    orange: '#f58518',
                    orangeLight: '#ffbf79',
                    yellowGold: '#fac235',
                    pinkRed: '#ec4f76',
                    cyan: '#46bfdd',
                    purple: '#ad7fe1',
                    greenVivid: '#6ec764',
                },
                // ─── Airtable palette (existing, extended) ───
                blue: {
                    DEFAULT: 'rgb(22, 110, 225)',
                    dark1: 'rgb(13, 82, 172)',
                    light1: 'rgb(160, 198, 255)',
                    light2: 'rgb(209, 226, 255)',
                    light3: 'rgb(241, 245, 255)',
                },
                green: {
                    DEFAULT: '#048A0E',
                    dark1: '#006400',
                    light1: 'rgb(154, 224, 149)',
                    light2: 'rgb(207, 245, 209)',
                    light3: '#E6FCE8',
                    whatsapp: '#25D366',
                    bubble: '#DCF8C6',
                    selected: '#E6FCE8',
                },
                purple: {
                    DEFAULT: 'rgb(124, 55, 239)',
                    dark1: 'rgb(98, 49, 174)',
                    light1: 'rgb(191, 174, 252)',
                    light2: 'rgb(224, 218, 253)',
                    light3: 'rgb(252, 243, 255)',
                },
                gray: {
                    25: 'rgb(249, 250, 251)',
                    50: '#F6F8FC',
                    75: '#F2F4F8',
                    100: 'rgb(229, 233, 240)',
                    200: 'rgb(218, 222, 230)',
                    300: 'rgb(196, 199, 205)',
                    400: 'rgb(151, 154, 160)',
                    500: 'rgb(97, 102, 112)',
                    600: 'rgb(65, 69, 77)',
                    700: 'rgb(49, 53, 62)',
                    800: '#1D1F25',
                    900: 'rgb(17, 18, 21)',
                },
                red: {
                    DEFAULT: 'rgb(220, 4, 59)',
                    light2: 'rgb(255, 212, 224)',
                },
                orange: {
                    DEFAULT: 'rgb(213, 68, 1)',
                    light2: 'rgb(255, 224, 204)',
                },
                black: '#000000',
                white: '#FFFFFF',
            },
            // ─── Typography (from Figma design system) ───
            fontSize: {
                // Label / Muted: 11px / weight 400 / opacity 0.75
                'label': ['0.6875rem', { lineHeight: '1rem', fontWeight: '400' }],
                // Body Text: 13px / weight 400 / line-height 18px
                'body': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],
                // Table Header: 14px / weight 700
                'table-header': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '700' }],
                // Card Heading: 15px / weight 500 / line-height 18.75px
                'card-heading': ['0.9375rem', { lineHeight: '1.171875rem', fontWeight: '500' }],
                // Section Heading: 31px / weight 675 / line-height 38.75px
                'section-heading': ['1.9375rem', { lineHeight: '2.421875rem', fontWeight: '675' }],
                // Numbers/Metrics: 40px weight 500
                'metric': ['2.5rem', { lineHeight: '3rem', fontWeight: '500' }],
                // Unit prefix: 26px weight 500
                'metric-unit': ['1.625rem', { lineHeight: '2rem', fontWeight: '500' }],
                // Standard Tailwind overrides
                'xs': ['0.6875rem', '1rem'],
                'sm': ['0.75rem', '1.125rem'],
                'base': ['0.8125rem', '1.25rem'],
                'lg': ['0.9375rem', '1.375rem'],
                'xl': ['1.0625rem', '1.5rem'],
                '2xl': ['1.3125rem', '1.625rem'],
                '3xl': ['1.4375rem', '1.8125rem'],
            },
            borderRadius: {
                sm: '0.1875rem',
                DEFAULT: '0.375rem',
                md: '0.5rem',
                lg: '0.875rem',
                xl: '1rem',
                '2xl': '1.25rem',
            },
            boxShadow: {
                xs: '0px 0px 1px rgba(0, 0, 0, 0.32), 0px 0px 2px rgba(0, 0, 0, 0.08), 0px 1px 3px rgba(0, 0, 0, 0.08)',
                sm: '0px 0px 1px rgba(0, 0, 0, 0.32), 0px 0px 3px rgba(0, 0, 0, 0.11), 0px 1px 4px rgba(0, 0, 0, 0.12)',
                md: '0px 0px 1px 0px rgba(0, 0, 0, 0.24), 0px 0px 2px 0px rgba(0, 0, 0, 0.08), 0px 2px 4px 0px rgba(0, 0, 0, 0.08)',
                modal: '0px 4px 24px rgba(0, 0, 0, 0.16), 0px 0px 2px rgba(0, 0, 0, 0.08)',
            },
            spacing: {
                'sidebar': '48px',
                'conversations': '300px',
                'detail': '320px',
            },
            animation: {
                'fade-in': 'fadeIn 200ms ease-out',
                'slide-up': 'slideUp 200ms ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
