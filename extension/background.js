chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "openNewWindow" && request.url) {
            chrome.windows.create({url: request.url, type: "normal"});
        }
    }
)
