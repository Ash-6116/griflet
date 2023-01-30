Griflet - A Discord Admin Bot

What this project is for?
Griflet started as a means to automate a specific task on a D&D Roleplay Server involving checking activity in Discord channels.  To do this, Griflet builds a list of Categories on a server, then checks each Category for the last message date for each Channel, before reducing the result to the last message date per Category and outputting the results as a reply to the message that triggered the command.

Over time, Griflet has grown to encompass more administrative tasks for the D&D Roleplay Server.  As a result, a few of the modules that encompass Griflet are specially made to accomplish such tasks.  However, the Categories.js module, the Output.js module, and the Index.js module are more general in nature.  The following outlines each module's current use case:
- Categories.js - used to profile a server and display last write times for each category.
- Downtime.js - used to perform a weekly downtime routine for a D&D Roleplay Server.
- Index.js - contains the code to boot up Griflet and the commands that Griflet can run.  These commands usually refer to code in another module such as Categories or Downtime.
- Ledger.js - currently under construction, intended to be paired with Downtime.js so that Griflet can write data to a Google Sheets ledger in addition to the output Downtime.js produces on the server.
- Output.js - contains functions to ensure output from other modules can be written to both the bot's output console and to Discord.
- Prompts.txt - a set of prompts for the D&D Roleplay Server, with Griflet selecting one at random during performance of the Downtime routine and sending it to the Discord server.

Griflet is licensed under the Internet Software Consortium (ISC) license.  It is open-source, and can be copied, modified and reused for free for either private or commercial use, so long as it carries the copyright notice found in the LICENSE.md file or at the bottom of this README.  Meaning that Griflet's code can be customised for any Discord server by anyone who wishes to do so.

Copyright (c) 2021, Ash#6116

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
