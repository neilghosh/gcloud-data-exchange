var data = {};
var YOUR_CLIENT_ID =
  "926249069764-7mtuteevhl79kjc9mnd4t9p4liae15s8.apps.googleusercontent.com";
var YOUR_REDIRECT_URI = window.location.origin + "/static/transfer.html";
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
        var headers = lines[0].split(",");
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

        //convert to mutations
        /*
        [
              {
                "upsert": {
                  "key": { "path": [{"kind": "StockPrices", "name": "someName"}] },
                  "properties": { "vacationDays": { "integerValue": 10 }}
                }
              }
            ]
            */
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
function importFile() {
  var mutations = [];
  //var obj = {};
  for (var line of data) {
    var str = '{"upsert": {"key": { "path": [{"kind": "StockPrices", "name": "'+line.symbol+line.timestamp+'"}]},\
    "properties": { \
        "symbol": { "stringValue": "'+line.symbol+'" },\
        "timestamp": { "timestampValue": "'+line.timestamp+'T00:00:00Z" },\
        "close": { "doubleValue": '+line.CLOSE+' },\
        "open": { "doubleValue": '+line.open+' },\
        "high": { "doubleValue": '+line.high+' },\
        "low": { "doubleValue": '+line.low+' },\
        "volume": { "doubleValue": '+line.TOTTRDQTY+' }\
      }}}';
    //console.log(str);
    obj = JSON.parse(str);
    mutations.push(obj);
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
          `<br>imported ${
            JSON.parse(xhr.response).mutationResults.length
          } items`;
      } else if (xhr.readyState === 4 && xhr.status === 401) {
        // Token invalid, so prompt for user permission.
        oauth2SignIn();
      }
    };
    // SELECT * FROM `FeedItem`
    /*
    var obj = `{
      "mode": "NON_TRANSACTIONAL",
      "mutations": [
        {
          "upsert": {
            "key": { "path": [{"kind": "StockPrices", "name": "someName"}] },
            "properties": { "vacationDays": { "integerValue": 10 }}
          }              
        }
      ]
    }`;
    */
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
        var options = ["1", "2", "3", "4", "5"];

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
    // SELECT * FROM `FeedItem`
    xhr.send('{"gqlQuery":{"queryString": "SELECT * FROM `FeedItem`"}}');
  } else {
    oauth2SignIn();
  }
}

function loadQuotes() {
  var params = JSON.parse(localStorage.getItem("oauth2-test-params"));
  if (params && params["access_token"]) {
    var xhr = new XMLHttpRequest();
    var projectId = document.getElementById("selectProject").value;
    xhr.open(
      "POST",
      "https://datastore.googleapis.com/v1/projects/" +
        projectId +
        ":runQuery?" +
        "access_token=" +
        params["access_token"]
    );
    xhr.onreadystatechange = function (e) {
      if (xhr.readyState === 4 && xhr.status === 200) {
        //console.log(xhr.response);
        var result = JSON.parse(xhr.response);
        //Sort by Date
        var entities = result.batch.entityResults;
        chartData = extractChartData(entities);
        drawTable(chartData);
        drawChart(chartData);
        //entities.forEach(renderData);
      } else if (xhr.readyState === 4 && xhr.status === 401) {
        // Token invalid, so prompt for user permission.
        oauth2SignIn();
      }
    };
    // SELECT * FROM `FeedItem`
    var fromDate = document.getElementById("fromDate").value;
    var toDate = document.getElementById("toDate").value;
    var symbol = document.getElementById("symbol").value;
    var startKey = symbol + fromDate;
    var endKey = symbol + toDate;
    //xhr.send('{"gqlQuery":{"allowLiterals":true,"queryString": "SELECT * FROM StockPrices WHERE __key__ > KEY(`StockPrices`, \'SBIN2018-01-01\') AND __key__ < KEY(`StockPrices`, \'SBIN2018-01-07\')"}}');
    xhr.send(
      '{"gqlQuery":{"allowLiterals":true,"queryString": "SELECT * FROM StockPrices WHERE __key__ > KEY(`StockPrices`, \'' +
        startKey +
        "') AND __key__ < KEY(`StockPrices`, '" +
        endKey +
        "')\"}}"
    );
  } else {
    oauth2SignIn();
  }
}

function compare(a, b) {
  var a = a.entity.properties.timestamp.timestampValue;
  var b = b.entity.properties.timestamp.timestampValue;

  if (a.last_nom < b.last_nom) {
    return -1;
  }
  if (a.last_nom > b.last_nom) {
    return 1;
  }
  return 0;
}

function extractChartData(entities) {
  entities.sort(compare);
  var chartData = [];
  chartData.push(["timestamp", "low", "close", "open", "high"]);

  for (i = 0; i < entities.length; i++) {
    var prop = entities[i].entity.properties;
    chartData.push([
      prop.timestamp.timestampValue.substring(0, 10),
      prop.low.doubleValue,
      prop.close.doubleValue,
      prop.open.doubleValue,
      prop.high.doubleValue,
    ]);
  }
  return chartData;
}

// function renderData(entity, index){
//   var prop = entity.entity.properties;
//   //console.log(prop.symbol.stringValue + prop.timestamp.timestampValue + prop.close.doubleValue)
//   // Find a <table> element with id="myTable":
//   var table = document.getElementById("priceOut");
//   // Create an empty <tr> element and add it to the 1st position of the table:
//   var row = table.insertRow(index+1);

//   var cell1 = row.insertCell(0);
//   cell1.innerHTML = prop.symbol.stringValue;
//   var cell2 = row.insertCell(1);
//   cell2.innerHTML = prop.timestamp.timestampValue ;
//   var cell3 = row.insertCell(2);
//   cell3.innerHTML = prop.close.doubleValue ;
// }

function drawChart(chartData) {
  var data = google.visualization.arrayToDataTable(chartData, true);
  var options = {
    legend: "none",
    title: document.getElementById("symbol").value,
  };
  var chart = new google.visualization.CandlestickChart(
    document.getElementById("curve_chart")
  );
  chart.draw(data, options);
}

function drawTable(chartData) {
  var data = new google.visualization.DataTable();
  data.addColumn("string", chartData[0][0]);
  data.addColumn("number", chartData[0][1]);
  data.addColumn("number", chartData[0][2]);
  data.addColumn("number", chartData[0][3]);
  data.addColumn("number", chartData[0][4]);
  chartData.shift();
  data.addRows(chartData);
  var table = new google.visualization.Table(
    document.getElementById("table_chart")
  );
  table.draw(data, { showRowNumber: true, width: "100%", height: "100%" });
}
/*
 * Create form to request access token from Google's OAuth 2.0 server.
 */
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
  //form.setAttribute('redirect_to', YOUR_REDIRECT_URI);
  // form.setAttribute('onsubmit', "window.location.href = 'https://website.com/my-account';");

  // var submitField = document.createElement('input');
  // submitField.setAttribute('type', 'submit');
  // submitField.setAttribute('onclick', "window.location.href = 'https://website.com/my-account';");
  // form.appendChild(submitField);

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
