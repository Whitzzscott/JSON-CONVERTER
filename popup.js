function getFormData() {
    const charPersona = {
        persona: document.getElementById('char_persona')?.value || '',
        world_scenario: document.getElementById('world_scenario')?.value || '',
        personality: document.getElementById('personality')?.value || '',
        char_greeting: document.getElementById('char_greeting')?.value || ''
    };

    return {
        char_name: document.getElementById('char_name')?.value || '',
        char_persona,
        example_dialogue: document.getElementById('example_dialogue')?.value || '',
        name: document.getElementById('name')?.value || '',
        description: document.getElementById('description')?.value || '',
        first_mes: document.getElementById('first_mes')?.value || '',
        scenario: document.getElementById('scenario')?.value || '',
        example_conversation: document.getElementById('example_conversation')?.value || '',
        model: document.getElementById('model')?.value || ''
    };
}

function saveData() {
    chrome.storage.local.get(['savedData'], (result) => {
        const existingData = result.savedData || {};
        const newData = getFormData();
        const updatedData = { ...existingData, ...newData };

        chrome.storage.local.set({ savedData: updatedData });
    });
}

function loadData() {
    chrome.storage.local.get(['savedData'], (result) => {
        const data = result.savedData || {};
        const formData = getFormData();

        Object.keys(formData).forEach(key => {
            if (key === 'char_persona') {
                Object.keys(formData[key]).forEach(subKey => {
                    const element = document.getElementById(subKey);
                    if (element && data.char_persona && data.char_persona[subKey] !== undefined) {
                        element.value = data.char_persona[subKey];
                    }
                });
            } else {
                const element = document.getElementById(key);
                if (element && data[key] !== undefined) {
                    element.value = data[key];
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    const convertToJsonBtn = document.getElementById('convertToJson');
    if (convertToJsonBtn) {
        convertToJsonBtn.addEventListener('click', () => {
            try {
                const formData = getFormData();
                const jsonData = JSON.stringify({
                    ...formData,
                    metadata: {
                        version: 1,
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        source: null,
                        tool: {
                            name: "JSON CONVERTER",
                            version: "1.0.0",
                            url: "https://github.com/Whitzzscott?tab=repositories"
                        }
                    }
                }, null, 2);
                const output = document.getElementById('output');
                if (output) {
                    output.textContent = jsonData;
                }
            } catch (error) {
                console.error('Error converting to JSON:', error);
                alert('Error converting to JSON');
            }
        });
    }

    const importFromJsonBtn = document.getElementById('importFromJson');
    if (importFromJsonBtn) {
        importFromJsonBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInputFromJson');
            if (fileInput) {
                fileInput.click();
            }
        });
    }

    const fileInput = document.getElementById('fileInputFromJson');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const jsonData = JSON.parse(e.target.result);
                        const formData = getFormData();

                        Object.keys(formData).forEach(key => {
                            if (key === 'char_persona') {
                                const personaData = jsonData[key] || {};
                                Object.keys(formData[key]).forEach(subKey => {
                                    const element = document.getElementById(subKey);
                                    if (element && personaData[subKey] !== undefined) {
                                        element.value = personaData[subKey];
                                    }
                                });
                            } else {
                                const element = document.getElementById(key);
                                if (element && jsonData[key] !== undefined) {
                                    element.value = jsonData[key];
                                }
                            }
                        });

                        saveData();
                    } catch (error) {
                        console.error('Error parsing JSON file:', error);
                        alert('Error parsing JSON file');
                    }
                };
                reader.readAsText(file);
            } else {
                alert('Please upload a valid JSON file');
            }
        });
    }

    document.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', saveData);
    });
});

autoSave();

document.getElementById('importLink').addEventListener('click', async () => {
    const link = prompt('Enter the character download link:');
    if (link) {
        try {
            const url = new URL(link);
            let jsonData = null;

            if (url.hostname === 'pygmalion.chat') {
                if (await checkDownloadOption(url)) {
                    jsonData = await downloadCharacter(url);
                    if (!jsonData) {
                        jsonData = await extractFromShowCharacter(url);
                    }
                } else {
                    const response = await fetch(link);
                    if (!response.ok) throw new Error('Failed to fetch the link');
                    const textData = await response.text();
                    jsonData = extractPygmalionData(textData);
                }
            } else if (url.hostname === 'character.ai') {
                if (await checkDownloadOption(url)) {
                    jsonData = await downloadCharacter(url);
                } else {
                    const response = await fetch(link);
                    if (!response.ok) throw new Error('Failed to fetch the link');
                    const textData = await response.text();
                    jsonData = extractCharacterAIData(textData);
                }
            } else {
                alert('Unsupported link. Please use a supported platform.');
                return;
            }

            if (jsonData) {
                if (jsonData.char_persona) {
                    Object.keys(jsonData.char_persona).forEach(key => {
                        const element = document.getElementById(key);
                        if (element) {
                            element.value = jsonData.char_persona[key] || '';
                        }
                    });
                }
                Object.keys(jsonData).forEach(key => {
                    if (key !== 'char_persona') {
                        const element = document.getElementById(key);
                        if (element && jsonData[key] !== undefined) {
                            element.value = jsonData[key];
                        }
                    }
                });
                document.getElementById('output').textContent = JSON.stringify(jsonData, null, 2);
                saveData();
            } else {
                alert('Error parsing the character data');
            }
        } catch (error) {
            alert('Error fetching or parsing the link data');
        }
    }
});

async function checkDownloadOption(url) {
    try {
        const response = await fetch(url);
        const textData = await response.text();
        return textData.includes('Download') || textData.includes('Show Character');
    } catch (error) {
        console.error('Error checking download option:', error);
        return false;
    }
}

async function downloadCharacter(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to download the character');
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = () => resolve(JSON.parse(reader.result));
            reader.onerror = reject;
            reader.readAsText(blob);
        });
    } catch (error) {
        alert('Error downloading the character');
        return null;
    }
}

async function extractFromShowCharacter(url) {
    try {
        const response = await fetch(url);
        const textData = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(textData, 'text/html');
        const showCharacterButton = doc.querySelector('button.show-character');
        if (showCharacterButton) {
            showCharacterButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            const characterContent = doc.querySelector('.character-content');
            if (characterContent) {
                const extractedData = JSON.parse(characterContent.textContent.trim());
                return extractedData;
            }
        }
        return null;
    } catch (error) {
        alert('Error extracting character from Pygmalion');
        return null;
    }
}

function extractPygmalionData(textData) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(textData, 'text/html');
        const selectors = {
            char_name: '.char-name-selector',
            char_persona: '.char-persona-selector',
            char_greeting: '.char-greeting-selector',
            world_scenario: '.world-scenario-selector',
            example_dialogue: '.example-dialogue-selector',
            name: '.name-selector',
            description: '.description-selector',
            first_mes: '.first-mes-selector',
            scenario: '.scenario-selector',
            example_conversation: '.example-conversation-selector',
            personality: '.personality-selector',
            model: '.model-selector'
        };
        const extractedData = {};
        for (const [key, selector] of Object.entries(selectors)) {
            extractedData[key] = doc.querySelector(selector)?.textContent.trim() || '';
        }
        return extractedData;
    } catch (error) {
        alert('Error parsing Pygmalion data');
        return null;
    }
}

function extractCharacterAIData(textData) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(textData, 'text/html');
        const selectors = {
            char_name: '.character-name-selector',
            char_persona: '.character-persona-selector',
            char_greeting: '.character-greeting-selector',
            world_scenario: '.world-scenario-selector',
            example_dialogue: '.example-dialogue-selector',
            name: '.name-selector',
            description: '.description-selector',
            first_mes: '.first-mes-selector',
            scenario: '.scenario-selector',
            example_conversation: '.example-conversation-selector',
            personality: '.personality-selector',
            model: '.model-selector'
        };
        const extractedData = {};
        for (const [key, selector] of Object.entries(selectors)) {
            extractedData[key] = doc.querySelector(selector)?.textContent.trim() || '';
        }
        return extractedData;
    } catch (error) {
        alert('Error parsing Character.ai data');
        return null;
    }
}

document.getElementById('copyJson').addEventListener('click', () => {
    const output = document.getElementById('output').textContent;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(output)
            .then(() => {
                alert('JSON copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                fallbackCopyTextToClipboard(output);
            });
    } else {
        fallbackCopyTextToClipboard(output);
    }
});

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        alert('JSON copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }

    document.body.removeChild(textArea);
}
