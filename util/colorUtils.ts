// utils/colorUtils.ts

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
    hex = hex.replace(/^#/, '');

    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    let s = max === 0 ? 0 : delta / max;
    let v = max;

    return { h, s: s * 100, v: v * 100 };
}

export function hsvToBasicName(h: number, s: number, v: number): string {
    let colorName = '';

    // Hue → base color
    if (s < 20 && v > 80) {
        return 'White';
    } else if (v < 20) {
        return 'Black';
    } else if (s < 20) {
        return 'Gray';
    }

    if (h >= 0 && h < 15) colorName = 'Red';
    else if (h >= 15 && h < 45) colorName = 'Orange';
    else if (h >= 45 && h < 70) colorName = 'Yellow';
    else if (h >= 70 && h < 170) colorName = 'Green';
    else if (h >= 170 && h < 260) colorName = 'Blue';
    else if (h >= 260 && h < 300) colorName = 'Purple';
    else if (h >= 300 && h < 345) colorName = 'Pink';
    else colorName = 'red'; // wrap-around

    // Light/dark variants
    if (v > 80 && s < 60) {
        return `Light ${colorName}`;
    } else if (v < 40) {
        return `Dark ${colorName}`;
    }

    return colorName;
}
