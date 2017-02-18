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
intents.matches('builtin.intent.alarm.set_alarm', [
	function (session, args, next) {
		// Resolve and store and entities passed from LUIS.
		var title = builder.EntityRecognizer.findEntity(args.entities, 'builtin.alarm.title');
		var time = builder.EntityRecognizer.resolveTime(args.entities);
		var alarm = session.dialogData.alarm = {
			title: title ? title.entity : null,
			timestamp: time ? time.getTime() : null
		};

		// Prompt for title
		if (!alarm.title) {
			builder.Prompts.text(session, 'What would you like to call your alarm?');
		} else {
			next();
		}
    },
	function (session, results, next) {
		var alarm = session.dialogData.alarm;
		if (results.response){
			alarm.title = results.response;
		}

		// Prompt for time (title will be blank if the user said cancel)
		if (alarm.title && !alarm.timestamp){
			builder.Prompts.time(session, 'What time would you like to set the alarm for?');
		} else {
			next();
		}
    },
	function (session, results) {
		var alarm = session.dialogData.alarm;
		if (results.response){
			var time = builder.EntityRecognizer.resolveTime([results.response]);
			alarm.timestamp = time ? time.getTime() : null;
		}

		// Set the alarm (if title or timestamp is blank the user said cancel)
		if (alarm.title && alarm.timestamp){
			//Save address of who to notify and write to scheduler.
			alarm.address = session.message.address;
			alarms[alarm.title] = alarm;

			// Send confirmation to user
			var date = new Date(alarm.timestamp);
			var isAM = date.getHours() < 12;
			session.send('Creating alarm name "%s" for %d/%d/%d %d:%02d%s',
				alarm.title,
				date.getMonth() + 1, date.getDate(), date.getFullYear(),
				isAM ? date.getHours() : date.getHours() - 12, date.getMinutes(), isAM ? 'am' : 'pm');
		} else {
			session.send('Ok... no problem.');
		}
    }
]);

intents.matches('builtin.intent.alarm.delete_alarm', [
	function (session, args, next) {
		// Resolve entities passed from LUIS.
		var title;
		var entity = builder.EntityRecognizer.findEntity(args.entities, 'builtin.alarm.title');
		if (entity) {
			// Verify its in our set of alarms.
			title = builder.EntityRecognizer.findBestMatch(alarms, entity.entity);
		}

		// Prompt for alarm name
		if (!title) {
			builder.Prompts.choice(session, 'Which alarm would you like to delete?', alarms);
		} else {
			next({ response: title});
		}
    },
	function (session, results) {
		// If response is null the user canceled the task
		if (results.response) {
			delete alarms[results.response.entity];
			session.send("Deleted the '%s' alarm.", results.response.entity);
		} else {
			session.send('Ok... no problem');
		}
    }
]);

intents.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I can only create & delete alarms."));

// Very simple alarm scheduler
var alarms = {};
setInterval(function () {
	var now = new Date().getTime();
	for (var key in alarms) {
		var alarm = alarms[key];
		if (now >= alarm.timestamp){
			var msg = new builder.Message().address(alarm.address).text("Here's your '%s' alarm.", alarm.title);
			bot.send(msg);
			delete alarms[key];
		}
	}
}, 15000);

