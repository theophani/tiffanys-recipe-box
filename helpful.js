var ajax = function () {

  function handle_response (dataType, onsuccess, onerror) {
    return function (e) {
      var request = e.currentTarget;
      var response = request.response;
      if (request.status > 399) {
        if (typeof onerror == "function") {
          onerror(request);
        }
      } else {
        if (typeof onsuccess == "function") {
          if (dataType == "json") {
            response = JSON.parse(request.responseText);
          }
          onsuccess(response);
        }
      }
    }
  }

  var responseTypes = {
    "json": "application/json"
  };

  return function (options) {
    var type = options.type || "GET";
    var url = options.url || window.location.href;
    var dataType = options.dataType || "json";
    var responseType = responseTypes[dataType] || dataType;

    var request = new XMLHttpRequest();
    request.open(type, url);
    request.responseType = responseType;
    request.onload = handle_response(dataType, options.success, options.error);
    request.send();
    return request;
  }

}();
