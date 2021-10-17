let run = document.getElementById("run");
let resultTable = document.getElementById("results");
let parameterForm = document.getElementById("parameterForm");
let parameterFormInput = document.getElementById("parameterFormInput");
let parameterFormSelect = document.getElementById("parameterFormSelect");
let parameterFormButton = document.getElementById("parameterFormButton");

url = "";
urlParams = "";

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
}

function updateParamTable(params) {
    resultTable.innerHTML="";
    params.forEach(function(value, key) {
        var row = resultTable.insertRow(0);

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

function reloadPage() {
    let selectedString = parameterFormSelect.value;
    let newValue = document.querySelectorAll(`#parameterForm input[name="${selectedString}"]`)[0].value;

    urlParams.set(selectedString, newValue);
    url.search = urlParams.toString();
    
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        chrome.tabs.update(tabs[0].id, { url: url.toString() });
    })
}

// Event listeners
document.addEventListener("DOMContentLoaded", function() {
    parameterFormSelect.addEventListener("change", updateParameterForm);
    parameterFormButton.addEventListener("click", reloadPage);

    run.addEventListener("click", async () => {
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
            let currentUrl = tabs[0].url;
            processAuthRequest(currentUrl);
        })
    });
});