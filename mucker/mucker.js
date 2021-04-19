var data = {};
var headers = {};
var YOUR_CLIENT_ID =
  "926249069764-7mtuteevhl79kjc9mnd4t9p4liae15s8.apps.googleusercontent.com";
var YOUR_REDIRECT_URI = window.location.origin + window.location.pathname;
var fragmentString = location.hash.substring(1);

// Parse query string to see if page request is coming from OAuth 2.0 server.
var params = {};
var regex = /([^&=]+)=([^&]*)/g,
  m;
while ((m = regex.exec(fragmentString))) {
  params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
}
if (Object.keys(params).length > 0) {
  localStorage.setItem("oauth2-test-params", JSON.stringify(params));
  if (params["state"] && params["state"] == "try_sample_request") {
    loadProjects();
  }
}
// self executing function here
window.addEventListener(
  "DOMContentLoaded",
  function () {
    google.charts.load("current", { packages: ["corechart"] });
    google.charts.load("current", { packages: ["table"] });

    params = JSON.parse(localStorage.getItem("oauth2-test-params"));

    //Read the CSV File
    var readFile = function () {
      var reader = new FileReader();
      reader.onload = function () {
        var lines = reader.result.split("\n");
        //remove if there is a extra new line at the end.
        if (lines[lines.length - 1] == "") {
          lines.pop();
        }
        var result = [];
        //TODO make header optional
        headers = lines[0].split(",");
        console.log(headers)

        for (var i = 1; i < lines.length; i++) {
          var obj = {};
          var currentLine = lines[i].split(",");

          for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentLine[j];
          }

          result.push(obj);
        }
        document.getElementById(
          "infilerowcount"
        ).innerHTML = `importing ${result.length} items`;
        data = result;
      };
      // start reading the file. When it is done, calls the onload event defined above.
      reader.readAsBinaryString(fileInput.files[0]);
    };
    var fileInput = document.getElementById("infile");
    fileInput.addEventListener("change", readFile);
  },
  false
);
// If there's an access token, try an API request.
// Otherwise, start OAuth 2.0 flow.

function buildKey(keyName, line) {
      //key is made out of two or more columns
      var keys = keyName.split(",");
      var keyValue = line[keys[0]];
      if(keys.length > 1) {
        for(i=1;i<keys.length;i++) {
          keyValue = keyValue.concat("-",line[keys[i]]);
        }
      }
      return keyValue;
}

function importFile() {
  var kind = document.getElementById("kind").value;
  var keyName = document.getElementById("key").value;
  //fetch the headers 

  var mutations = [];
  
  for (var line of data) {
    var path = new Object();
    path.kind = kind;
    
    path.name = buildKey(keyName, line);

    var paths = [];
    paths.push(path);


    var key = new Object();
    key.path = paths;

    var properties = new Object();
    for (var field of headers) {
      var properyValue = new Object();
      properyValue.stringValue = line[field];
      properties[field] = properyValue;
    }

    var upsert = new Object();
    upsert.key = key;
    upsert.properties = properties;

    //https://cloud.google.com/datastore/docs/reference/data/rest/v1/Entity
    var mutation = new Object();
    mutation.upsert = upsert;

    //console.log(JSON.stringify(mutation));

    mutations.push(mutation);

  }

  //Split into batches of 500;
  var mutation_batches = [],
    size = 500;
  while (mutations.length > 0) mutation_batches.push(mutations.splice(0, size));
  mutation_batches.forEach(callDatastore);
}

function callDatastore(mutationBatch) {
  if (params && params["access_token"]) {
    var xhr = new XMLHttpRequest();
    var projectId = document.getElementById("selectProject").value;
    xhr.open(
      "POST",
      "https://datastore.googleapis.com/v1/projects/" +
      projectId +
      ":commit?" +
      "access_token=" +
      params["access_token"]
    );

    xhr.onreadystatechange = function (e) {
      if (xhr.readyState === 4 && xhr.status === 200) {
        //console.log(xhr.response);

        document.getElementById("out").innerHTML =
          document.getElementById("out").innerHTML +
          `<br>imported ${JSON.parse(xhr.response).mutationResults.length
          } items`;
      } else if (xhr.readyState === 4 && xhr.status === 401) {
        // Token invalid, so prompt for user permission.
        oauth2SignIn();
      }
    };

    var obj =
      `{
      "mode": "NON_TRANSACTIONAL",
      "mutations": ` +
      JSON.stringify(mutationBatch) +
      `
    }`;
    xhr.send(obj);
  } else {
    oauth2SignIn();
  }
}

function loadProjects() {
  var params = JSON.parse(localStorage.getItem("oauth2-test-params"));
  if (params && params["access_token"]) {
    var xhr = new XMLHttpRequest();

    //https://www.googleapis.com/auth/cloud-platform.read-only
    xhr.open(
      "GET",
      "https://cloudresourcemanager.googleapis.com/v1/projects?" +
      "access_token=" +
      params["access_token"]
    );
    xhr.onreadystatechange = function (e) {
      if (xhr.readyState === 4 && xhr.status === 200) {
        //console.log(xhr.response);
        var projects = JSON.parse(xhr.response).projects;
        var select = document.getElementById("selectProject");

        for (var i = 0; i < projects.length; i++) {
          var opt = projects[i].projectId;
          var el = document.createElement("option");
          el.textContent = opt;
          el.value = opt;
          select.appendChild(el);
        }
      } else if (xhr.readyState === 4 && xhr.status === 401) {
        // Token invalid, so prompt for user permission.
        oauth2SignIn();
      }
    };
    xhr.send();
  } else {
    oauth2SignIn();
  }
}

function oauth2SignIn() {
  // Google's OAuth 2.0 endpoint for requesting an access token
  var oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

  // Create element to open OAuth 2.0 endpoint in new window.
  var form = document.createElement("form");
  form.setAttribute("method", "GET"); // Send as a GET request.
  form.setAttribute("action", oauth2Endpoint);

  // Parameters to pass to OAuth 2.0 endpoint.
  var params = {
    client_id: YOUR_CLIENT_ID,
    redirect_uri: YOUR_REDIRECT_URI,
    scope:
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloudplatformprojects.readonly",
    state: "try_sample_request",
    include_granted_scopes: "true",
    response_type: "token",
  };

  // Add form parameters as hidden input values.
  for (var p in params) {
    var input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", p);
    input.setAttribute("value", params[p]);
    form.appendChild(input);
  }

  // Add form to page and submit it to open the OAuth 2.0 endpoint.
  document.body.appendChild(form);
  form.submit();
}

function revokeAccess() {
  var accessToken;
  var params = JSON.parse(localStorage.getItem("oauth2-test-params"));
  if (params) {
    accessToken = params["access_token"];
  }
  localStorage.removeItem("oauth2-test-params");
  // Google's OAuth 2.0 endpoint for revoking access tokens.
  var revokeTokenEndpoint = "https://oauth2.googleapis.com/revoke";

  // Create <form> element to use to POST data to the OAuth 2.0 endpoint.
  var form = document.createElement("form");
  form.setAttribute("method", "post");

  form.setAttribute("action", revokeTokenEndpoint);

  // Add access token to the form so it is set as value of 'token' parameter.
  // This corresponds to the sample curl request, where the URL is:
  //      https://oauth2.googleapis.com/revoke?token={token}
  var tokenField = document.createElement("input");
  tokenField.setAttribute("type", "hidden");
  tokenField.setAttribute("name", "token");
  tokenField.setAttribute("value", accessToken);
  form.appendChild(tokenField);

  // Add form to page and submit it to actually revoke the token.
  document.body.appendChild(form);
  form.submit();
}

