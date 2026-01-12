console.log("Email writer extension - Content script loaded");

function createAIButton() {
    const button = document.createElement('div');
    button.className = 'T-I J-J5-Ji aoO v7 T-I-at1 L3 ai-reply-button';
    button.style.marginRight = '8px';
    button.style.backgroundColor = '#0b57d0';  // Gmail Send button color (blue)
    button.style.color = 'white';
    button.style.fontWeight = 'bold';
    button.style.border = 'none';
    button.style.padding = '8px 16px';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.display = 'inline-block';
    button.style.textAlign = 'center';
    button.style.fontSize = '14px';
    button.style.minWidth = '64px';
    button.style.userSelect = 'none';
    button.innerHTML = 'AI Reply';
    button.setAttribute('role', 'button');
    button.setAttribute('data-tooltip', 'Generate AI Reply');

    // Hover effect
    button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#174ea6'; // Darker blue on hover
    });

    button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#0b57d0'; // Reset to original color
    });

    return button;
}

function getEmailContent() {
    const selectors = ['.h7', '.a3s.ail', '.gmail_quote', '[role="presentation"]'];
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) {
            return content.innerText.trim();
        }
    }
    return null;
}

function findComposeToolbar() {
    const selectors = ['.btC', '.aDh', '[role="toolbar"]', '.gU.Up'];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) {
            return toolbar;
        }
    }
    return null;
}

function injectButton() {
    if (document.querySelector('.ai-reply-button')) {
        console.log("AI button already present, skipping injection.");
        return;
    }

    const toolbar = findComposeToolbar();
    if (!toolbar) {
        console.log("Toolbar not found, retrying...");
        setTimeout(injectButton, 500);
        return;
    }

    console.log("Toolbar found, creating AI button...");
    const button = createAIButton();
    button.addEventListener('click', async () => {
        try {
            button.innerHTML = 'Generating...';
            button.disabled = true;

            const emailContent = getEmailContent();
            if (!emailContent) {
                alert('No email content found.');
                throw new Error('No email content found.');
            }

            const response = await fetch('http://localhost:8080/api/email/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailContent: emailContent, Tone: "professional" })
            });

            if (!response.ok) throw new Error('API Request Failed');

            const generatedReply = await response.text();
            const composeBox = document.querySelector('[role="textbox"][contenteditable="true"]');

            if (composeBox) {
                composeBox.focus();
                document.execCommand('insertText', false, generatedReply);
            } else {
                console.error('Compose box was not found.');
            }

        } catch (error) {
            console.error(error);
            alert('Failed to generate reply');
        } finally {
            button.innerHTML = 'AI Reply';
            button.disabled = false;
        }
    });

    toolbar.insertBefore(button, toolbar.firstChild);
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasComposeElements = addedNodes.some(node => 
            node && node.nodeType === 1 && // Ensure node is an element (1 = ELEMENT_NODE)
            (node.matches?.('.aDh,.btC, [role="dialog"]') || node.querySelector?.('.aDh, .btC, [role="dialog"]'))
        );
        if (hasComposeElements) {
            console.log("Compose window detected.");
            setTimeout(injectButton, 500);
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });
