const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www,googleapis.com/auth/spreadsheets.readonly'];
// The file token/json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = 'token.json';

/**
// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorise a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), ledger);
});
**/

/**
* Create an OAuth2 client with the given credentials,
* and then execute the given callback function.
* @param {Object} credentials The authorization client credentials
* @Param {function} callback The callback to call with the authorized client.
*/
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client  The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function pullList(auth) {
   let Blades = [];
   const sheets = google.sheets({version: 'v4', auth});
   sheets.spreadsheets.values.get({
     spreadsheetId: '1orT1wsZNaxR2cYrfY_bZ1dhOQFxldskdGXgSxjq5b9I',
     range: 'Roster!C2:M',
   }, (err, res) => {
     if (err) return console.log("The API returned an error: " + err);
     const rows = res.data.values;
     if (rows.length) {
       console.log('Name\t\tRank');
       // Prints the columns A and E, which correspond to indices 0 and 4.
       rows.map((row) => {
         if (row[10] != 'Council Member') {
           console.log(`${row[0]}, ${row[10]}`);
           //var date = new Date();
           //var date = {return new Date() };
           let date = new Date();
           console.log("Date: " + date);
           Blades.push([row[0], "0", "0", "0", "1", "0", "Downtime", "Weekly Reward: " + date.getFullYear() + "." + date.getMonth().toString().padStart(2, '0') + "." + date.getDate().toString().padStart(2, '0')]); // need current DATE
         }
       });
       console.log(Blades);
       const requestBody = { values: Blades, };
       sheets.spreadsheets.values.append({
         spreadsheetId: '1orT1wsZNaxR2cYrfY_bZ1dhOQFxldskdGXgSxjq5b9I',
         range: 'Ledger!A:H',
         valueInputOption: 'raw',
         requestBody,
       }, (err, res) => {
         if (err) return console.log("The API returned an error on writing: " + err);
         console.log("Values written");
       });
     } else {
       console.log('No data found.');
     }
   });
   return Blades;
}

function ledger(auth) {
  Blades = pullList(auth);
  console.log(Blades);
}

function main (args) {
  // Load client secrets from a local file.
 fs.readFile('client_secret.json', (err, content) => {
   if (err) return console.log('Error loading client secret file:', err);
   // Authorise a client with credentials, then call the Google Sheets API.
   authorize(JSON.parse(content), ledger);
 });

}

module.exports = {main}
