import { loadingMessage, loadingShown } from '../stores/appStore';

export const withTimeout = async (request: Promise<any>, seconds: number = 5) => {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Request timed out'));
        }, seconds * 1000);
    });
    return Promise.race([request, timeout]);
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
