/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var AssistantV1 = require('watson-developer-cloud/assistant/v1'); // watson sdk

var Actions = require('./functions/actions');
var actions = new Actions();

var BankFunctions = require('./functions/bankFunctions');
var bankFunctions = new BankFunctions();

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper

var assistant = new AssistantV1({
  version: '2018-07-10'
});

var nextMonth = ((new Date().getMonth() + 1) % 12) + 1;

// This is where the end user context is set / injected.
// Ideally the context values would come from an application
// where the user information is maintained.
var userProfileContextData = {
  avatarName: "Sam",
  channel: "web",
  userId: "swamchan",
  firstName: "Swami",
  lastName: "Chandrassekaran",
  //email: "swami@someorg.com",
  phone: "+1 972-123-4567",
  timezone: "-6", // with respect to GMT
  homeCity: "Dallas",
  homeState: "TX",
  office: "123 Spooner Street",
  ibm_function_credentials: "{'api_key':'username:password'}", // IBM Functions service instance API key
  openRequests: 1,
  org: {
    groupId: 156,
    orgId: "US-642"
    //departmentName: "IT",
  },
  previousInteractions: [
      {dateOfInteraction: "10/21/2018", intents: ['Submit_Service_Request', 'Handle_ChitChat']},
      {dateOfInteraction: "10/15/2018", intents: ['Reset_Password', 'Handle_ChitChat']},
  ],
  //enagagement_tone_counter: 0,
  enagagement_tone_array: [],
  private: {
    function_creds: {
      user: process.env.CLOUD_FUNCTION_USER,
      password: process.env.CLOUD_FUNCTION_PASS,
    },
  },
};

// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-intermediate">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-intermediate/blob/master/training/banking_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  // Fetch context. Ideally the context values would come from an application
  // where the user information is maintained.
  var contextWithAcc = Object.assign({}, req.body.context, userProfileContextData);

  var payload = {
    workspace_id: workspace,
    context: contextWithAcc || {},
    input: req.body.input || {}
  };

  // Send the input to the assistant service
  assistant.message(payload, function (err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
    actions.testForAction(data).then(function (d) {
      return res.json(d);
    }).catch(function (error) {
      return res.json(error);
    });

  });
});

app.get('/bank/validate', function (req, res) {
  var value = req.query.value;
  var isAccValid = bankFunctions.validateAccountNumber(Number(value));
  // if accountNum is in list of valid accounts
  if (isAccValid === true) {
    res.send({ result: 'acc123valid' });
  } else {
    // return invalid by default
    res.send({ result: 'acc123invalid' });
  }
});

app.get('/bank/locate', function (req, res) {
  res.send({ result: 'zip123retrieved' });
});

module.exports = app;
