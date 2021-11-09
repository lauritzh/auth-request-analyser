/**
 * (c) Lauritz Holtmann, https://security.lauritz-holtmann.de
 */

function isAuthRequest(params) {
    // 1) According to rfc6749 response_type and client_id are required
    // 2) app_id is used in some cases by Instagram instead of client_id
    // 3) Facebook requires client_id, redirect_uri and state: https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/?locale=en_US
    return ((params.get('response_type') && (params.get('client_id') || params.get('app_id'))) || // app_id is for instance used by Instagram in some cases...
    (params.get('client_id') && params.get('redirect_uri') && params.get('state')) // Facebook requires client_id, redirect_uri and state
    ); 
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