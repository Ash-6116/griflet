const {
  getAuthToken,
  getSpreadsheet,
  getSpreadsheetValues,
  writeSpreadsheetValues
} = require ('./googleSheetsService.js');

const spreadsheetId = '1orT1wsZNaxR2cYrfY_bZ1dhOQFxldskdGXgSxjq5b9I'; // Id goes here
const sheetName = 'Roster'; // Sheet name goes here

const date = require('date-and-time');

async function testGetSpreadSheet() {
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

async function testGetSpreadSheetValues() {
  try {
    const auth = await getAuthToken();
    const response = await getSpreadsheetValues({
      spreadsheetId,
      sheetName,
      auth
    });
    console.log("Active Blades (excluding Council Members)");
    //console.log(typeof outputStringify); // tests typeof named variable
    //console.log(getActiveBlades(response.data["values"]));
    let blades = getActiveBlades(response.data["values"]);
    let downtime = buildDowntimeArray(blades);
    testWriteSpreadsheetValues(downtime);
  } catch (error) {
    console.log(error.message, error.stack);
  }
}

async function testWriteSpreadsheetValues(values) {
  console.log("Trying to write data to sheet...");
  try {
    const auth = await getAuthToken();
    writeSpreadsheetValues({
      spreadsheetId,
      sheetName,
      auth,
      values,
    });
  } catch (error) {
    console.log(error.message, error.stack);
  }
}

function main() {
  testGetSpreadSheetValues();
}

main()
