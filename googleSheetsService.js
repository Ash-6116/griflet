// googleSheetsService.js
const {google} = require('googleapis');
const sheets = google.sheets('v4');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

const GCLOUD_PROJECT = process.env.GCLOUD_PROJECT;
//const GCLOUD_PROJECT = 'warm-composite-329019';
async function getAuthToken() {
  const auth = new google.auth.GoogleAuth({
    scopes: SCOPES
  });
  const authToken = await auth.getClient();
  return authToken;
}

async function getSpreadsheet({spreadsheetId, auth}) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    auth,
  });
  return res;
}

async function getSpreadsheetValues({spreadsheetId, auth, sheetName}) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    auth,
    range: sheetName
  });
  return res;
}

async function writeSpreadsheetValues({spreadsheetId, auth, values}) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    auth,
    range: "Ledger",
    valueInputOption: "USER_ENTERED",
    resource: {
      values,
    },
  });
}

module.exports = {
  getAuthToken,
  getSpreadsheet,
  getSpreadsheetValues,
  writeSpreadsheetValues
}
