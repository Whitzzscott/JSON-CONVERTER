chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
        switch (message.action) {
            case 'fetchData':
                const response = await fetch(message.url);
                if (!response.ok) throw new Error('Failed to fetch');
                const textData = await response.text();
                sendResponse({ data: textData });
                break;

            case 'saveData':
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set(message.data, () => {
                        chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError)) : resolve();
                    });
                });
                sendResponse({ status: 'success' });
                break;

            case 'loadData':
                const result = await new Promise((resolve, reject) => {
                    chrome.storage.local.get(Object.keys(message.data), (items) => {
                        chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError)) : resolve(items);
                    });
                });
                sendResponse({ data: result });
                break;

            case 'importJson':
                try {
                    const jsonData = JSON.parse(message.data);
                    sendResponse({ data: jsonData });
                } catch (error) {
                    sendResponse({ error: 'Invalid JSON' });
                }
                break;

            default:
                sendResponse({ error: 'Unknown action' });
                break;
        }
    } catch (error) {
        sendResponse({ error: error.message });
    }

    return true;
});
