var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup - Add LUIS recognizer to point ot model.
//             This is using an existing Cortana App
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs - Expand dialog with input from screen by
// 				  passing an array of functions.
//              - Add mulitiple dialog branches to track
//				  and retain information that the user
//				  has entered.
//              - Add intents to the dialog to gauge what
//                the users intentions are and route the
//                responses accordingly.
//=========================================================

var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/c413b2ef-382c-45bd-8ff0-f76d60e2a821?subscription-key=1761fdbd4ee24d96b82d8ba54b324f8e&q=';
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({recognizers: [recognizer]});

bot.dialog('/', intents);

// Add intent handlers
intents.matches('builtin.intent.alarm.set_alarm', builder.DialogAction.send('Creating Alarm'));
intents.matches('builtin.intent.alarm.delete_alarm', builder.DialogAction.send('Deleting Alarm'));
intents.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I can only create & delete alarms."));

/*
intents.matches(/^change name/i, [
    function (session) {
        session.beginDialog('/profile');
    },
    function (session, results) {
        session.send('Ok... Changed your name to %s', session.userData.name);
    }
]);
intents.onDefault([
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    }
]);

bot.dialog('/profile', [
	function (session) {
		builder.Prompts.text(session, 'Hi! What is your name?');
	},
	function (session, results) {
	    session.userData.name = results.response;
	    session.endDialog();
	}
]);*/
