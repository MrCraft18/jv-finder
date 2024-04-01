window.addEventListener('CustomEventForExtension', (event) => {
    chrome.runtime.sendMessage({action: "openNewWindow", url: event.detail.url});
})