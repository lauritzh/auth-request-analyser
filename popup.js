/**
 * (c) Lauritz Holtmann, https://security.lauritz-holtmann.de
 */

let run = document.getElementById("run");
let saveUrl = document.getElementById("saveUrl");
let restoreUrl = document.getElementById("restoreUrl");
let analysisContainer = document.getElementById("analysisContainer");
let attacksList = document.getElementById("attacksList");
let analysisList = document.getElementById("analysisList");
let observationsList = document.getElementById("observationsList");
let parameterTable = document.getElementById("parameterTable");
let parameterForm = document.getElementById("parameterForm");
let parameterFormInput = document.getElementById("parameterFormInput");
let parameterFormSelect = document.getElementById("parameterFormSelect");
let parameterFormButton = document.getElementById("parameterFormButton");

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
            "recommended":true
        },
        "client_id":{
            "required":true
        },
        "scope":{
            "required":false
        },
        "response_mode":{
            "allowed":["query","fragment"],
            "description":"This parameter allows to specify how the Auth. Response parameters are sent."
        }
    }
}

function isAuthRequest(params) {
    return (params.get('response_type') && params.get('client_id'))
}

function processAuthRequest(urlString) {
    url = new URL(urlString);
    urlParams = new URLSearchParams(url.search);

    if (!isAuthRequest(urlParams)) {
        alert("Error: The given URL does not include all REQUIRED parameters for Auth. Requests.");
        return -1;
    }

    updateParamTable(urlParams);
    createParameterForm(urlParams);
    performAnalysis(urlParams);
}

function updateParamTable(params) {
    parameterTable.innerHTML="<th>Parameter</th><th>Value</th>";
    params.forEach(function(value, key) {
        var row = parameterTable.insertRow(-1);
        if(knowledgeBase["oauthParams"][key] && knowledgeBase["oauthParams"][key]["description"]) {
            row.title = knowledgeBase["oauthParams"][key]["description"];
        }

        var parameter = row.insertCell(0);
        var val = row.insertCell(1);

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
}

function updateParameterForm() {
    let selectedString = parameterFormSelect.value;

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
    if(params.get('scope').includes("openid")) {
        list_element = document.createElement("li");
        list_element.innerText = "The current flow apparently uses OpenID Connect, as the scope includes 'openid'.";
        observationsList.appendChild(list_element);
    }


    ////////// Checks
    // Deprecated grant types: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-2.1.2
    if(params.get('response_type').includes("token")) {
        list_element = document.createElement("li");
        list_element.innerText = "Clients SHOULD NOT use response types that include 'token', because for these flows the authorization server includes the access tokens within the authorization response, which may enable access token leakage and access token replay attacks.";
        analysisList.appendChild(list_element);
    }

    // Check CSRF protection: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.7
    if(!params.get("state") && !params.get("code_challenge") && !params.get("code_challenge")) {
        list_element = document.createElement("li");
        list_element.innerText = "Apparently, no Anti-CSRF measures are used. It is highly recommended to either use a 'state' value or alternatively use PKCE or the OpenID Connect 'nonce' value."
        analysisList.appendChild(list_element);
    }

    // "code_challenge_method" should not be used: https://datatracker.ietf.org/doc/html/rfc7636#section-7.2
    if(params.get("code_challenge_method" === "plain")) {
        list_element = document.createElement("li");
        list_element.innerText = "The PKCE extension uses 'code_challenge_method=plain', which SHOULD NOT be used.";
        analysisList.appendChild(list_element);
    }

    ////////// Attacks
    // Implicit Flow supported?
    if(!params.get('response_type').includes("token")) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'Even though this flow does not use the deprecated implicit grant type, it may be allowed for this client. <a href="#" id="attackImplicitFlowSupported">Change response_type to \'token\'.</a>';
        attacksList.appendChild(list_element);
        document.getElementById("attackImplicitFlowSupported").addEventListener("click", launchAttackImplicitFlowSupported);
    }

    // response_mode fragment supported?

    // Change PKCE code_challenge_method to plain https://datatracker.ietf.org/doc/html/rfc7636#section-7.2
    if(params.get('code_challenge_method') === "S256") {
        list_element = document.createElement("li");
        list_element.innerHTML = 'The current flow uses \'S256\' as code_challenge_method, but \'plain\' may also be allowed. The \'plain\' option only exists for compatibility reasons and SHOULD NOT be used´. <a href="#" id="attackPkcePlain">Change code_challenge_method to \'plain\'.</a>';
        attacksList.appendChild(list_element);
        document.getElementById("attackPkcePlain").addEventListener("click", launchAttackPkcePlain);
    }

    // Add Request URI
    if(!params.get('request_uri')) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'The \'request_uri\' parameter is well-known to allow Server-Side Request Forgery by design. Add a request_uri parameter: <form action="#"><input id="attackRequestUriValue" type="text" size="50"><button id="attackRequestUri">Add request_uri</button></form>';
        attacksList.appendChild(list_element);
        document.getElementById("attackRequestUri").addEventListener("click", launchAttackRequestUri);
    }

    // Adjust Redirect URI
    if(params.get('redirect_uri')) {
        list_element = document.createElement("li");
        list_element.innerHTML = 'If the \'redirect_uri\' parameter is present, the authorization server MUST compare it against pre-defined redirection URI values using simple string comparison (RFC3986). Try to fiddle around with different schemes, (sub-)domains, paths, query parameters and fragments. Lax validation may lead to token disclosure.';
        attacksList.appendChild(list_element);
    }
}

function reloadPageWithModifications() {
    let selectedString = parameterFormSelect.value;
    let newValue = document.querySelectorAll(`#parameterForm input[name="${selectedString}"]`)[0].value;

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
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
            chrome.tabs.update(tabs[0].id, { url: result.savedUrl });
        });
    });
}

function setParameterAndReload(parameterName, parameterValue) {
    urlParams.set(parameterName, parameterValue);
    url.search = urlParams.toString();

    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        chrome.tabs.update(tabs[0].id, { url: url.toString() });
    });
}

////////// Attacks
function launchAttackImplicitFlowSupported() {
    setParameterAndReload("response_type", "token");
}

function launchAttackPkcePlain() {
    setParameterAndReload("code_challenge_method", "plain");
}

function launchAttackRequestUri() {
    setParameterAndReload("request_uri", document.getElementById("attackRequestUriValue").value);
}

/**************************************************************************************************/
document.addEventListener("DOMContentLoaded", function() {
    // Event listeners for UI elements
    parameterFormSelect.addEventListener("change", updateParameterForm);
    parameterFormButton.addEventListener("click", reloadPageWithModifications);
    run.addEventListener("click", runAnalysis);
    saveUrl.addEventListener("click", saveUrlLocalStorage);
    restoreUrl.addEventListener("click", restoreUrlLocalStorage);

    // make sure to trigger analysis if popup is opened during page browse
    chrome.tabs.onUpdated.addListener(runAnalysis);

    // Initial analysis on popup open
    runAnalysis();
});