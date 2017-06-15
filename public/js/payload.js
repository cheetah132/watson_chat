// The PayloadPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true, PayloadPanel: true*/

var PayloadPanel = (function() {
  var settings = {
    selectors: {
      payloadColumn: '#payload-column',
      payloadInitial: '#payload-initial-message',
      payloadRequest: '#payload-request',
      payloadResponse: '#payload-response'
    },
    payloadTypes: {
      request: 'request',
      response: 'response'
    }
  };

  Vue.component('watson-curr', {
    // 이제 todo-item 컴포넌트는 "prop" 이라고 하는
    // 사용자 정의 속성 같은 것을 입력받을 수 있습니다.
    // 이 prop은 todo라는 이름으로 정의했습니다.
    props: ['item'],
    template: '<div class="curr"><ul><li><a href="#none" style="color:#3498DB; font-size:1rem">{{ item.item.name }}</a></li><li><a href="#none" style="color:white; font-size:1.618rem">{{ item.item.confidence }}</a></li></ul></div>'
  })

  Vue.component('watson-context', {
    props: ['item'],
    template: '<div class="items"><ul><li><a href="#none" style="color:#CE8EFF;">{{ item.item.name }}</a></li><li><a href="#none" style="color:white;">{{ item.item.confidence }}</a></li></ul></div>'
  })

  Vue.component('watson-recog', {
    props: ['item'],
    template: '<div class="items"><ul><li><a href="#none" style="color:#54EED0">{{ item.item.name }}</a></li><li><a href="#none" style="color:white;">{{ item.item.confidence }}</a></li></ul></div>'
  })

  Vue.component('watson-node', {
    props: ['item'],
    template: '<div class="items"><ul><li><a href="#none" style="color:#3498DB;">{{ item.item.name }}</a></li><li><a href="#none" style="color:white;">{{ item.item.confidence }}</a></li></ul></div>'
  })

  var watson = new Vue({
    el: '#watson',
    data: {
      current : [{item : {name : "IBM Watson", confidence: "서울대학교 평생교육원"}}],
      context: [],
      recog: [],
      node: []
    }
  })

  // Publicly accessible methods defined
  return {
    init: init,
    togglePanel: togglePanel
  };

  // Initialize the module
  function init() {
    payloadUpdateSetup();
  }

  // Toggle panel between being:
  // reduced width (default for large resolution apps)
  // hidden (default for small/mobile resolution apps)
  // full width (regardless of screen size)
  function togglePanel(event, element) {
    var payloadColumn = document.querySelector(settings.selectors.payloadColumn);
    if (element.classList.contains('full')) {
      element.classList.remove('full');
      payloadColumn.classList.remove('full');
    } else {
      element.classList.add('full');
      payloadColumn.classList.add('full');
    }
  }

  // Set up callbacks on payload setters in Api module
  // This causes the displayPayload function to be called when messages are sent / received
  function payloadUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function(newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      //displayPayload(settings.payloadTypes.request);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function(newPayload) {
      currentResponsePayloadSetter.call(Api, newPayload);
      //displayPayload(settings.payloadTypes.response);
      displayWatson(settings.payloadTypes.response)
    };
  }

  function displayWatson(typeValue){
    var isRequest = checkRequestType(typeValue);
    if (isRequest !== null){
      var data = isRequest? Api.getRequestPayload() : Api.getResponsePayload()

      //
      watson.node = []
      watson.context = []
      watson.recog = []

      if (data.hasOwnProperty('output')){
        var nodes = data.output.nodes_visited
        var i = 0
        nodes.forEach(function(node) {
          if (node) {
            item = node.split('.')
            watson.node.push({ item: {name : '#'+item[0], confidence: item[1]}})
            watson.current = [{item : {name : '#'+item[0], confidence: item[1]}}]
          }
        })
      }

      if (data.hasOwnProperty('intents')){
        var intents = data.intents
        intents.forEach(function(intent) {
          if (intent) {
            watson.recog.push({ item: {name :'#'+intent.intent, confidence: (intent.confidence * 100).toFixed(0) + "%"  }})
          }
        })
      }

      if (data.hasOwnProperty('entities')){
        var entities = data.entities
        entities.forEach(function(entity) {
          if (entity) {
            watson.recog.push({ item: {name :'@' + entity.value + ' : ' + entity.value , confidence: (entity.confidence * 100).toFixed(0) + "%"  }})
          }
        })
      }

      var context_table = ['past_days', 'after', 'emotion','repeat', 'dates', 'times', 'numbers', 'partner_sex']

      if (data.hasOwnProperty('context')){
        context_table.forEach(function(item){
        if (data.context.hasOwnProperty(item)){
          if (data.context[item]) {
            watson.context.push({ item: {name :item, confidence: data.context[item] }})
          }
        }})   
      }
    }
  }

  // Display a request or response payload that has just been sent/received
  function displayPayload(typeValue) {
    var isRequest = checkRequestType(typeValue);
    if (isRequest !== null) {
      // Create new payload DOM element
      var payloadDiv = buildPayloadDomElement(isRequest);
      var payloadElement = document.querySelector(isRequest
              ? settings.selectors.payloadRequest : settings.selectors.payloadResponse);
      // Clear out payload holder element
      while (payloadElement.lastChild) {
        payloadElement.removeChild(payloadElement.lastChild);
      }
      // Add new payload element
      payloadElement.appendChild(payloadDiv);
      // Set the horizontal rule to show (if request and response payloads both exist)
      // or to hide (otherwise)
      var payloadInitial = document.querySelector(settings.selectors.payloadInitial);
      if (Api.getRequestPayload() || Api.getResponsePayload()) {
        payloadInitial.classList.add('hide');
      }
    }
  }

  // Checks if the given typeValue matches with the request "name", the response "name", or neither
  // Returns true if request, false if response, and null if neither
  // Used to keep track of what type of payload we're currently working with
  function checkRequestType(typeValue) {
    if (typeValue === settings.payloadTypes.request) {
      return true;
    } else if (typeValue === settings.payloadTypes.response) {
      return false;
    }
    return null;
  }

  // Constructs new DOM element to use in displaying the payload
  function buildPayloadDomElement(isRequest) {
    var payloadPrettyString = jsonPrettyPrint(isRequest
            ? Api.getRequestPayload() : Api.getResponsePayload());

    var payloadJson = {
      'tagName': 'div',
      'children': [{
        // <div class='header-text'>
        'tagName': 'div',
        'text': isRequest ? 'User input' : 'Watson understands',
        'classNames': ['header-text']
      }, {
        // <div class='code-line responsive-columns-wrapper'>
        'tagName': 'div',
        'classNames': ['code-line', 'responsive-columns-wrapper'],
        'children': [{
          // <div class='line-numbers'>
          'tagName': 'pre',
          'text': createLineNumberString((payloadPrettyString.match(/\n/g) || []).length + 1),
          'classNames': ['line-numbers']
        }, {
          // <div class='payload-text responsive-column'>
          'tagName': 'pre',
          'classNames': ['payload-text', 'responsive-column'],
          'html': payloadPrettyString
        }]
      }]
    };

    return Common.buildDomElement(payloadJson);
  }

  // Format (payload) JSON to make it more readable
  function jsonPrettyPrint(json) {
    if (json === null) {
      return '';
    }
    var convert = JSON.stringify(json, null, 2);

    convert = convert.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(
      />/g, '&gt;');
    convert = convert
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function(match) {
          var cls = 'number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'key';
            } else {
              cls = 'string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'boolean';
          } else if (/null/.test(match)) {
            cls = 'null';
          }
          return '<span class="' + cls + '">' + match + '</span>';
        });
    return convert;
  }

  // Used to generate a string of consecutive numbers separated by new lines
  // - used as line numbers for displayed JSON
  function createLineNumberString(numberOfLines) {
    var lineString = '';
    var prefix = '';
    for (var i = 1; i <= numberOfLines; i++) {
      lineString += prefix;
      lineString += i;
      prefix = '\n';
    }
    return lineString;
  }
}());
