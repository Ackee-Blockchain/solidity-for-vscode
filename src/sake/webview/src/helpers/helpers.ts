import { writable } from 'svelte/store';
import { loadingMessage, loadingShown } from '../helpers/stores';

export const withTimeout = async (request: Promise<any>, seconds: number = 5) => {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Request timed out'));
        }, seconds * 1000);
    });
    const result = await Promise.race([request, timeout]);
    return result;
};

export const loadWithTimeout = async (
    request: Promise<any>,
    seconds: number = 5,
    message: string = 'Loading...'
) => {
    if (message) {
        loadingMessage.set(message);
    }
    loadingShown.set(true);
    const result = await withTimeout(request, seconds);
    loadingShown.set(false);
    loadingMessage.set(null);
    return result;
};

export function getCssVarWithOpacity(cssVar: string, opacity = 0.5) {
    // Get the CSS variable value
    const rawColor = getComputedStyle(document.documentElement).getPropertyValue(cssVar);

    // Remove any leading or trailing whitespace
    const color = rawColor.trim();

    // Check if the color is in a valid format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        console.error('Invalid color format:', color);
        return color; // Return the original color if it's not in the expected format
    }

    // Convert the color to RGB
    const redHex = parseInt(color.slice(1, 3), 16);
    const greenHex = parseInt(color.slice(3, 5), 16);
    const blueHex = parseInt(color.slice(5, 7), 16);

    // Calculate the new hex value with the specified opacity
    const newRedHex = redHex.toString(16).padStart(2, '0');
    const newGreenHex = greenHex.toString(16).padStart(2, '0');
    const newBlueHex = blueHex.toString(16).padStart(2, '0');
    const opacityHex = Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0');

    const result = `#${newRedHex}${newGreenHex}${newBlueHex}${opacityHex}`;

    return result;
}
