/**
 * (c) Lauritz Holtmann, https://security.lauritz-holtmann.de
 */

function isAuthRequest(params) {
    return (params.get('response_type') && (params.get('client_id') || params.get('app_id'))); // app_id is for instance used by Instagram...
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.active) {
        let url = new URL(tab.url);
        let urlParams = new URLSearchParams(url.search);

        if(isAuthRequest(urlParams)) {
            chrome.action.setBadgeBackgroundColor({ color: "maroon" });
            chrome.action.setBadgeText({text: "!", tabId: tabId});
        }
    }
});