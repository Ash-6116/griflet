const output = require("./output.js");

/**
 * Neph's recommended steps:
 * 1) Get a list of all category channels (filter guild.channels for type=category)
 * 2) Create a function that, given a list of channels, returns the most recent "last posted" timestamp
 * 3) Call the function on the children of the first category
 * 4) When step 3 resolves, call the function on the next category in the list
 * 5) Repeat steps 3/4 until you get through all categories.
**/

function channelData(message) {
  // Need to filter any channel that has type 'GUILD_VOICE' or 'GUILD_CATEGORY' out, leaving only
  // 'GUILD_TEXT' behind.
  console.log('Text Channels on Server: ');
  message.guild.channels.cache.filter(m => m.type === 'GUILD_TEXT').forEach((channel) => {
    retrieveLastPost(channel).then(message => {
      processLastPost(message, channel);
    });
  })
  return;
}

function resolveDate(Timestamp) {
  let d = new Date(Timestamp);
  return d.toDateString() + " " + d.getHours() + ":" + (d.getMinutes()<10?'0':'') + d.getMinutes();
}

function messageFetch(channel) { // problem with deleted messages lives here
  return new Promise((resolve, reject) => {
    if (channel.lastMessageId != undefined) { // deleted messages still have an ID but retrieve no data
        channel.messages.fetch(channel.lastMessageId) // this is what throws the error
          .then(message => {
            resolve(message);
            }).catch(error => {
            reject(error);
          });
    }
  });
}

async function messageLast(map, returnMessage){
  const listKeys = Array.from( map.keys() );
  let outputString = "Report For Categories Containing Text Channels:\n"; // Replace with array to allow for easier splitting?
  const outputArray = [];
  outputArray.push("Report For Categories Containing Text Channels:\n");
  for (let index = 0; index < map.size; index++) {
    let channelList = map.get(listKeys[index]); // we're receiving our list here
    let newestMessageDate = new Date('16 March 2018'); // this was the date that Castle In The Mist had its first message
    let newestMessage; // storage for the newest message
    let newestChannel; // storage for the channel containing the newest message
    for (let y = 0; y < channelList.length; y++) {
      if (channelList[y].lastMessageId != undefined) {
        lastMessage = await messageFetch(channelList[y]).catch(err => console.error("Last message for category " + listKeys[index] + " in channel " + channelList[y].name + " was deleted"));
        if (lastMessage != undefined) {
          currentMessageDate = new Date(lastMessage.createdTimestamp);
          if (currentMessageDate > newestMessageDate) {
            newestMessageDate = currentMessageDate;
            newestMessage = lastMessage;
            newestChannel = channelList[y].name;
          }
        }
      }
    }
    if (newestMessageDate != undefined && newestMessage != undefined && newestChannel != undefined) {
      outputString += "Last Message for category: " + listKeys[index] + "\n\tWritten by: " + newestMessage.author.username + "#" + newestMessage.author.discriminator + "\n\t\ton: " + resolveDate(newestMessageDate) + "\n\t\tin: " + newestChannel + "\n";
      outputArray.push("Last Message for category: " + listKeys[index] + "\n\tWritten by: " + newestMessage.author.username + "#" + newestMessage.author.discriminator + "\n\t\ton: " + resolveDate(newestMessageDate) + "\n\t\tin: " + newestChannel + "\n");
    }
  }
  output.arrayMirror(outputArray, returnMessage);
  return;
}

function childList(category) {
  const listChannels = [];
  category.children.forEach(child => {
    listChannels.push(child)
  });
  return listChannels;
}

function categoryList(message) {
  const map = new Map();
  // A list of each CATEGORY
  const categoryChannels = message.guild.channels.cache.filter(channel => channel.type === 'GUILD_CATEGORY');
  categoryChannels.forEach(category => {
    map.set(category.name, childList(category));
  });
  messageLast(map, message);
  return;
}

module.exports = {categoryList}; // this exports the categoryList function
