const {
  getAuthToken,
  getSpreadsheet,
  getSpreadsheetValues,
  writeSpreadsheetValues
} = require ('./googleSheetsService.js');

//const spreadsheetId = '1orT1wsZNaxR2cYrfY_bZ1dhOQFxldskdGXgSxjq5b9I'; // Id goes here - change to envVariable or argument
//const sheetName = 'Roster'; // Sheet name goes here
//const range = 'Ledger'

const date = require('date-and-time');

async function testGetSpreadSheet(spreadsheetId) {
  try {
    const auth = await getAuthToken();
    const response = await getSpreadsheet({
      spreadsheetId,
      auth
    });
    console.log('output for getSpreadsheet', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(error.message, error.stack);
  }
}

function getActiveBlades(rosterValues) {
  let activeBlades = [];
  for (let i=1; i<rosterValues.length; i++) {
    if (rosterValues[i][12] != "Council Member" && rosterValues[i][12] != undefined) {
      activeBlades.push(rosterValues[i][2]);
    }
  }
  return activeBlades;
}

function buildDowntimeArray(activeBlades) {
  // NEED something along the lines of:
  // ["Tulizza Val'Sorren", 0, 0, 0, 1, 0, "Downtime", "Weekly Reward: TEST DATA"]
  // for each Active Blade
  let outArray = [];
  let currDate = new Date();
  for (let i=0; i<activeBlades.length; i++) {
    outArray.push([activeBlades[i], 0, 0, 0, 1, 0, "Downtime", "Weekly Reward: " + date.format(currDate, 'YYYY.MM.DD')]);
  }
  console.log(outArray);
  return outArray;
}

async function testGetSpreadSheetValues(spreadsheetId, sheetName) {
  try {
    const auth = await getAuthToken();
    const response = await getSpreadsheetValues({
      spreadsheetId,
      sheetName,
      auth
    });
    console.log("Active Blades (excluding Council Members)");
    //console.log(typeof outputStringify); // tests typeof named variable
    let blades = getActiveBlades(response.data["values"]);
    let downtime = buildDowntimeArray(blades);
    testWriteSpreadsheetValues(spreadsheetId, sheetName, downtime, process.env.range);
  } catch (error) {
    console.log(error.message, error.stack);
  }
}

async function testWriteSpreadsheetValues(spreadsheetId, sheetName, values, range) {
  console.log("Trying to write data to sheet...");
  try {
    const auth = await getAuthToken();
    writeSpreadsheetValues({
      spreadsheetId,
      sheetName,
      auth,
      values,
      range,
    });
  } catch (error) {
    console.log(error.message, error.stack);
  }
}

function main() {
  testGetSpreadSheetValues(process.env.spreadsheetId, process.env.sheetName);
}

module.exports = {main}
