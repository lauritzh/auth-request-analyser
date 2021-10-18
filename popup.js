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

let url = "";
let urlParams = "";

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

        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);

        cell1.innerText = key;
        cell2.innerText = value;
    });
}

function createParameterForm(params) {
    parameterForm.removeAttribute("style");
    parameterFormSelect.innerHTML="";
    parameterFormInput.innerHTML="";

    let firstElement = true;
    params.forEach(function(value, key) {
        let option = document.createElement("option");
        option.text = key;
        parameterFormSelect.add(option);

        let input = document.createElement("input");
        input.value = value;
        input.name = key;
        input.size = 100;

        // only display first input field
        if(firstElement) {
            firstElement = false;
            input.type = "text";
        } else {
            input.type = "hidden";
        }

        parameterFormInput.appendChild(input);
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
    // Add Request URI

    // Adjust Redirect URI


}

function reloadPageWithModifications() {
    let selectedString = parameterFormSelect.value;
    let newValue = document.querySelectorAll(`#parameterForm input[name="${selectedString}"]`)[0].value;

    urlParams.set(selectedString, newValue);
    url.search = urlParams.toString();
    
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        chrome.tabs.update(tabs[0].id, { url: url.toString() });
    })
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

document.addEventListener("DOMContentLoaded", function() {
    // Event listeners
    parameterFormSelect.addEventListener("change", updateParameterForm);
    parameterFormButton.addEventListener("click", reloadPageWithModifications);
    run.addEventListener("click", runAnalysis);
    saveUrl.addEventListener("click", saveUrlLocalStorage);
    restoreUrl.addEventListener("click", restoreUrlLocalStorage);

    // Initial analysis
    runAnalysis();
});