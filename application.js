/**
 * (c) Lauritz Holtmann, https://security.lauritz-holtmann.de
 */

let run = document.getElementById("run");
let saveUrl = document.getElementById("saveUrl");
let restoreUrl = document.getElementById("restoreUrl");
let attacksList = document.getElementById("attacksList");
let analysisList = document.getElementById("analysisList");
let noAuthRequest = document.getElementById("noAuthRequest");
let searchHistory = document.getElementById("searchHistory");
let parameterForm = document.getElementById("parameterForm");
let parameterTable = document.getElementById("parameterTable");
let observationsList = document.getElementById("observationsList");
let authRequestsForm = document.getElementById("authRequestsForm");
let analysisContainer = document.getElementById("analysisContainer");
let parameterFormInput = document.getElementById("parameterFormInput");
let parameterFormSelect = document.getElementById("parameterFormSelect");
let parameterFormButton = document.getElementById("parameterFormButton");
let authRequestsFormButton = document.getElementById("authRequestsFormButton");
let authRequestsFormSelect = document.getElementById("authRequestsFormSelect");
let authRequestsFormNoResults = document.getElementById("authRequestsFormNoResults");

let url;
let urlParams;

let knowledgeBase = {
    "oauthParams": {
        "response_type":{
            "allowed":["code","id_token","code id_token"],
            "deprecated":["token","code token","token id_token"],
            "description":"This parameter specifies which Grant should be used.",
            "required":true
        },
        "redirect_uri":{
            "description":"This parameter specifies where the Auth. Response including sensitive secrets should be sent.",
            "required":false
        },
        "state":{
            "required":false,
            "recommended":true,
            "description":"This parameter SHOULD be used to prevent CSRF, as it enables the client (= relying party) to maintain a state between Auth. Request and Auth. Response. The parameter MUST be bound to the end-user session."
        },
        "client_id":{
            "required":true,
            "description":"This parameter identifies the client."
        },
        "app_id":{
            "required":false,
            "description":"Some Authorization Servers (like Instagram) use this as synonym to the client_id, which normally identifies the client."
        },
        "scope":{
            "required":false,
            "description":"This parameter defines the requested access scope."
        },
        "response_mode":{
            "allowed":["query","fragment"],
            "description":"This parameter allows to specify how the Auth. Response parameters are sent."
        },
        "prompt":{
            "required":false,
            "description":"This parameter specifies whether the Auth. Server should prompt the user for reauthentication or consent."
        },
        "request_uri":{
            "required":false,
            "description":"This optional OpenID Connect parameter allows to pass the request by reference and is well-known to cause SSRF issues."
        }
    }
}

function isAuthRequest(params) {
    // 1) According to rfc6749 response_type and client_id are required
    // 2) app_id is used in some cases by Instagram instead of client_id
    // 3) Facebook requires client_id, redirect_uri and state: https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/?locale=en_US
    return ((params.get('response_type') && (params.get('client_id') || params.get('app_id'))) || // app_id is for instance used by Instagram in some cases...
    (params.get('client_id') && params.get('redirect_uri') && params.get('state')) // Facebook requires client_id, redirect_uri and state
    ); 
}

function processAuthRequest(urlString) {
    url = new URL(urlString);
    urlParams = new URLSearchParams(url.search);

    if (!isAuthRequest(urlParams)) {
        console.log("Error: The given URL does not include all REQUIRED parameters for Auth. Requests. It known that some implementations does not follow the spec and only use client_id or app_id. Thus, there may be a change of the detection rules in the future");
        return -1;
    } else {
        noAuthRequest.style.display = "none";
    }

    updateParamTable(urlParams);
    createParameterForm(urlParams);
    performAnalysis(urlParams);
}

function updateParamTable(params) {
    parameterTable.innerHTML='<th scope="col">Parameter</th><th scope="col">Value</th>';
    params.forEach(function(value, key) {
        let row = parameterTable.insertRow(-1);
        // check if knowledge base includes description for this parameter
        if(knowledgeBase["oauthParams"][key] && knowledgeBase["oauthParams"][key]["description"]) {
            row.title = knowledgeBase["oauthParams"][key]["description"];
        }

        let parameter = row.insertCell(0);
        let val = row.insertCell(1);

        parameter.innerText = key;
        val.innerText = value;
    });
}

function createParameterForm(params) {
    parameterForm.removeAttribute("style");
    parameterFormSelect.innerHTML = "";
    parameterFormInput.innerHTML = "";

    let firstElement = true;
    params.forEach(function(value, key) {
        let option = document.createElement("option");
        option.text = key;
        option.value = key;
        parameterFormSelect.add(option);

        let element;
        element = document.createElement("input");
        element.value = value;
        element.name = key;
        element.size = "80";
        element.type = "text";

        // only display first input field
        if(firstElement) {
            firstElement = false;
        } else {
            element.type = "hidden";
        }

        parameterFormInput.appendChild(element);
    });
    setFocusRecentParameterLocalStorage();
}

function updateParameterForm() {
    let selectedString = parameterFormSelect.value;
    saveRecentParameterLocalStorage(parameterFormSelect.value);

    document.querySelectorAll('#parameterForm input').forEach(function(inputField) {
        if(inputField.name !== selectedString) {
            inputField.type = "hidden";
        } else {
            inputField.type = "text";
        }
    });  
}

function performAnalysis(params) {
    analysisContainer.removeAttribute("style");
    analysisList.innerHTML = "";
    observationsList.innerHTML = "";
    attacksList.innerHTML = "";

    let list_element;
    ////////// Observations
    // Scope includes "openid": https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
    if(params.get('scope') && params.get('scope').includes("openid")) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'The current flow apparently uses OpenID Connect, as the scope includes \'openid\'. <a href="https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest" target="_blank"  rel="noopener noreferrer">See literature.</a>';
        observationsList.appendChild(list_element);
    }
    if(params.get('prompt')) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'The current flow uses a \'prompt\' parameter. If the Auth. Server supports \'prompt=none\' and follows the specification, the user is not asked for consent before they are sent to the client. <a href="https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest" target="_blank"  rel="noopener noreferrer">See literature.</a>';
        observationsList.appendChild(list_element);
    }

    ////////// Checks
    // Deprecated grant types: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-2.1.2
    if(params.get('response_type') && params.get('response_type').includes("token")) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'Clients SHOULD NOT use response types that include \'token\', because for these flows the authorization server includes the access tokens within the authorization response, which may enable access token leakage and access token replay attacks. <a href="https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-2.1.2"  target="_blank" rel="noopener noreferrer">See literature.</a>';
        analysisList.appendChild(list_element);
    }

    // Check CSRF protection: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.7
    if(!params.get("state") && !params.get("code_challenge") && !params.get("nonce")) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'Apparently, no Anti-CSRF measures are used. It is highly recommended to either use a \'state\' value or alternatively use PKCE or the OpenID Connect \'nonce\' value. <a href="https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.7"  target="_blank" rel="noopener noreferrer">See literature.</a>';
        analysisList.appendChild(list_element);
    }

    // "code_challenge_method" should not be used: https://datatracker.ietf.org/doc/html/rfc7636#section-7.2
    if(params.get("code_challenge_method" === "plain")) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'The PKCE extension uses \'code_challenge_method=plain\', which SHOULD NOT be used. <a href="https://datatracker.ietf.org/doc/html/rfc7636#section-7.2"  target="_blank" rel="noopener noreferrer">See literature.</a>';
        analysisList.appendChild(list_element);
    }
    // Public Clients no PKCE: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-2.1.1
    if(!params.get('code_challenge')) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'The client does not use the Proof Key for Code Exchange (PKCE, RFC7636). If the application is a public client (client credentials can not be stored privately), PKCE MUST be used. Check if the implementation is a public client! <a href="https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-2.1.1"  target="_blank" rel="noopener noreferrer">See literature.</a>';
        analysisList.appendChild(list_element);
    }

    ////////// Attacks
    // Implicit Flow supported? https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-2.1.2
    if(params.get('response_type') && !params.get('response_type').includes("token")) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'Even though this flow does not use the deprecated implicit grant type, it may be allowed for this client. <button href="#" id="attackImplicitFlowSupported">Change response_type to \'token\'</button><br> Further, you should try if the <a href="https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthRequest" target="_blank" rel="noopener noreferrer">OIDC hybrid flow</a> is supported. <button href="#" id="attackHybridFlowSupported">Change response_type to \'code token\'</button><br><a href="https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-2.1.2" target="_blank" rel="noopener noreferrer">See literature.</a>';
        attacksList.appendChild(list_element);
        document.getElementById("attackImplicitFlowSupported").addEventListener("click", launchAttackImplicitFlowSupported);
        document.getElementById("attackHybridFlowSupported").addEventListener("click", launchAttackattackHybridFlowSupported);
    }

    // response_mode fragment supported? https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html
    if(!params.get('response_mode')) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'Even though this flow does not use a \'response_mode\' parameter, you may test if it is supported by the authorization server. In combination with an Open Redirect on an allowed \'redirect_uri\', this may enable token disclosure. <button href="#" id="attackResponseMode">Add response_mode \'fragment\'</button>. <a href="https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html"  target="_blank" rel="noopener noreferrer">See literature.</a>';
        attacksList.appendChild(list_element);
        document.getElementById("attackResponseMode").addEventListener("click", launchAttackResponseMode);
    }

    // Change PKCE code_challenge_method to plain: https://datatracker.ietf.org/doc/html/rfc7636#section-7.2
    if(params.get('code_challenge_method') === "S256") {
        list_element = document.createElement("li");
        list_element.innerHTML = 'The current flow uses \'S256\' as code_challenge_method, but \'plain\' may also be allowed. The \'plain\' option only exists for compatibility reasons and SHOULD NOT be used. <button href="#" id="attackPkcePlain">Change code_challenge_method to \'plain\'</button> <a href="https://datatracker.ietf.org/doc/html/rfc7636#section-7.2"  target="_blank" rel="noopener noreferrer">See literature.</a>';
        attacksList.appendChild(list_element);
        document.getElementById("attackPkcePlain").addEventListener("click", launchAttackPkcePlain);
    }

    // Add Request URI: https://publ.sec.uni-stuttgart.de/fettkuestersschmitz-csf-2017.pdf
    if(!params.get('request_uri')) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'The \'request_uri\' parameter is <a href="https://publ.sec.uni-stuttgart.de/fettkuestersschmitz-csf-2017.pdf"  target="_blank" rel="noopener noreferrer">well-known</a> to allow Server-Side Request Forgery by design. Add a request_uri parameter: <form action="#"><input id="attackRequestUriValue" type="text" size="50"><button id="attackRequestUri">Add request_uri</button></form> <a href="https://publ.sec.uni-stuttgart.de/fettkuestersschmitz-csf-2017.pdf"  target="_blank" rel="noopener noreferrer">See literature.</a>';
        attacksList.appendChild(list_element);
        document.getElementById("attackRequestUri").addEventListener("click", launchAttackRequestUri);
    }

    // Adjust Redirect URI: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.1.3
    if(params.get('redirect_uri')) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'If the \'redirect_uri\' parameter is present, the authorization server MUST compare it against pre-defined redirection URI values using simple string comparison (RFC3986). Try to fiddle around with different schemes, (sub-)domains, paths, query parameters and fragments. Lax validation may lead to token disclosure. Exemplary attack ideas: <button class="attackRedirectUri" data-variant="0">Use http:// as scheme</button><button class="attackRedirectUri" data-variant="1">Use aura-test:// as scheme</button><button class="attackRedirectUri" data-variant="2">Append aura-test to path</button><button class="attackRedirectUri" data-variant="3">Add aura-test subdomain</button><button class="attackRedirectUri" data-variant="4">Add ?aura-test=1</button><button class="attackRedirectUri" data-variant="5">Add #aura-test</button> <a href="https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.1.3" target="_blank" rel="noopener noreferrer">See literature.</a>';
        attacksList.appendChild(list_element);
        Array.from(document.getElementsByClassName("attackRedirectUri")).forEach(function(button) {
            button.addEventListener("click", launchAttackRedirectUri, false);
        });
    }
}

function reloadPageWithModifications() {
    let selectedString = parameterFormSelect.value;
    let selectedStringSanitized = selectedString.replaceAll("'", "\\'"); // we need to escape single quotes
    let newValue = document.querySelectorAll(`#parameterForm input[name='${selectedStringSanitized}']`)[0].value;

    setParameterAndReload(selectedString, newValue);
}

async function runAnalysis() {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        let currentUrl = tabs[0].url;
        processAuthRequest(currentUrl);
    })
}

function saveUrlLocalStorage() {
    return chrome.storage.local.set({"savedUrl": url.toString()});
}

function restoreUrlLocalStorage() {
    chrome.storage.local.get("savedUrl", function(result) {
        openPage(result.savedUrl);
    });
}

function replayHistoryAuthRequest() {
    openPage(authRequestsFormSelect.value);
}

function saveRecentParameterLocalStorage(parameter) {
    return chrome.storage.local.set({"recentParameter": parameter});
}

function setFocusRecentParameterLocalStorage() {
    chrome.storage.local.get("recentParameter", function(result) {
        if(result.recentParameter) {
            // only set value of select if the option exists
            let recentParameterSanitized = result.recentParameter.replaceAll("'", "\\'"); // we need to escape single quotes 
            if(document.querySelectorAll(`#parameterFormSelect option[value='${recentParameterSanitized}']`).length === 1) {
                parameterFormSelect.value = result.recentParameter;
                updateParameterForm()
            }
        }
    });
}

function setParameterAndReload(parameterName, parameterValue) {
    urlParams.set(parameterName, parameterValue);
    url.search = urlParams.toString();

    openPage(url.toString());
}

function searchHistoryAuthRequest() {
    authRequestsFormSelect.innerHTML = "";
    authRequestsForm.removeAttribute("style");

    chrome.history.search({ text:"client_id", maxResults:10000 }, function(data) {
        let mapTupleSet = []
        data.some(function(page) {
            // check if history item matches our heuristics for auth requests and to
            // include each client at an IdP only once, we use the client_id to match
            let testUrl = new URL(page.url);
            let testUrlParams = new URLSearchParams(testUrl.search);

            let mapTuple = {"idp": testUrl.hostname, "client_id" : testUrlParams.get('client_id')};
            if(isAuthRequest(testUrlParams) && 
            !mapTupleSet.some(tuple => (tuple.idp == mapTuple["idp"] && tuple.client_id == mapTuple["client_id"]))) {
                
                // add our new mapTuple to the list of tuples
                mapTupleSet.push(mapTuple);


                let option = document.createElement("option");
                // the client_id is often not human readable, thus we print the redirect_uri instead
                option.text = `${testUrl.hostname}: ${testUrlParams.get('redirect_uri')}`;
                option.value = page.url;
                authRequestsFormSelect.add(option);

                // limit the maximal count of entries
                return authRequestsFormSelect.length === 10;
            }
        });
        if(!authRequestsFormSelect.innerHTML) {
            authRequestsFormNoResults.removeAttribute("style");
        }
    });
}

function openPage(url) {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        chrome.tabs.update(tabs[0].id, { url: url });
    });
}

////////// Attacks
function launchAttackImplicitFlowSupported() {
    setParameterAndReload("response_type", "token");
}

function launchAttackattackHybridFlowSupported() {
    setParameterAndReload("response_type", "code token");
}

function launchAttackPkcePlain() {
    setParameterAndReload("code_challenge_method", "plain");
}

function launchAttackRequestUri() {
    setParameterAndReload("request_uri", document.getElementById("attackRequestUriValue").value);
}

function launchAttackResponseMode() {
    setParameterAndReload("response_mode", "fragment");
}

function launchAttackRedirectUri(event) {
    let variant = parseInt(event.target.dataset.variant);
    let redirect_uri = new URL(urlParams.get("redirect_uri"));

    // Manipulate redirect_uri depending on the clicked button
    switch (variant) {
        case 0:
            // Use http:// scheme (we assume here that the default is https://)
            redirect_uri.protocol = "http:";
            break;
        case 1:
            // Use aura-test:// scheme (should be non-existent)
            // Scenario: If this works, a native app could be used to leak the Auth. Response
            redirect_uri.protocol = "aura-test:";
            break;
        case 2:
            // Append something to path
            // Scenario: If this works, a XSS or open redirect can be used to leak the Auth. Response
            if(redirect_uri.pathname.slice(-1) === "/") {
                redirect_uri.pathname = redirect_uri.pathname + "aura-test";
            }
            else {
                redirect_uri.pathname = redirect_uri.pathname + "/aura-test";
            }
            break;
        case 3:
            // Use imaginary Subdomain
            // Scenario: If this works, a XSS or open redirect or subdomain takeover can be used to leak the Auth. Response on any subdomain
            redirect_uri.hostname = "aura-test." + redirect_uri.hostname;
            break;
        case 4:
            // Add arbitrary parameter
            // Scenario: If this works, 1) this may enable open redirect or XSS issues, 2) this may allow parameter pollution: https://security.lauritz-holtmann.de/post/sso-security-redirect-uri-ii/
            redirect_uri.searchParams.set("aura-test", 1);
            break;
        case 5:
            // Add arbitrary location hash - variant of 4
            if(redirect_uri.hash) {
                redirect_uri.hash = redirect_uri.hash + "&aura-test=1";
            } else {
                redirect_uri.hash = "aura-test";
            }
            break;
        default:
            alert("Whoops, something went wrong :(");
      }
      setParameterAndReload("redirect_uri", redirect_uri.toString());
}

/**************************************************************************************************/
document.addEventListener("DOMContentLoaded", function() {
    // Event listeners for UI elements
    parameterFormSelect.addEventListener("change", updateParameterForm);
    parameterFormButton.addEventListener("click", reloadPageWithModifications);
    run.addEventListener("click", runAnalysis);
    saveUrl.addEventListener("click", saveUrlLocalStorage);
    restoreUrl.addEventListener("click", restoreUrlLocalStorage);
    searchHistory.addEventListener("click", searchHistoryAuthRequest);
    authRequestsFormButton.addEventListener("click", replayHistoryAuthRequest);

    // make sure to trigger analysis if popup is opened during page browse
    chrome.tabs.onUpdated.addListener(runAnalysis);

    // Initial analysis on popup open
    runAnalysis();
});