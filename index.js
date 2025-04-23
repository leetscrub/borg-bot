const fs = require('fs');
const path = require('path');
const { DiceRoll } = require('rpg-dice-roller');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// File paths
const characterPath = path.join(__dirname, 'characters.json');

// Helper functions for loading and saving characters
function loadCharacters() {
  if (!fs.existsSync(characterPath)) return {};
  return JSON.parse(fs.readFileSync(characterPath, 'utf-8'));
}

function saveCharacters(characters) {
  fs.writeFileSync(characterPath, JSON.stringify(characters, null, 2));
}

function getCharacter(userId) {
  const chars = loadCharacters();
  return chars[userId] || null;
}

function saveCharacter(userId, character) {
  const chars = loadCharacters();
  chars[userId] = character;
  saveCharacters(chars);
}

// Discord Client setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`☠️  ${client.user.tag} is lurking in the shadows...`);
});

// Message handler
client.on('messageCreate', message => {
  // Ignore bot messages
  if (message.author.bot) return;

  const content = message.content.trim();

  // Basic help response
  /*if (content === '!help') {
    message.reply(`Here is the help message:
      !help : returns the diffrent messages the bot can receive
      !ping : check if the bot is online
      !roll : try something like !roll 1d20+2 to roll a dice and modifier
      !createcharacter : generate a character
      !sheet : check current character sheet for your account
      !dr : dice roll for a test. Add a stat like !dr str to test an ability  
    `);
  }*/

  // Embed !help response
  if (content === '!help') {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📘 Bot Command Guide')
      .setDescription('Here’s what I can do. Use wisely, traveler.')
      .addFields(
        { name: '🎲 Dice Rolls', value: '`!roll 1d20+2` — Roll a die with a modifier\n`!dr str` — Ability test roll' },
        { name: '🧙 Character Tools', value: '`!createcharacter` — Generate a new character\n`!sheet` — View your character sheet' },
        { name: '🔧 Utility', value: '`!help` — Show this help message\n`!ping` — Check if the bot is online' }
      )

      //.setFooter({ text: 'TTRPG Bot • Type wisely, adventurer 🗺️' });
      // .setThumbnail('https://i.imgur.com/AfFp7pu.png') // replace with your bot icon if you have one
      //.setFooter({ text: 'TTRPG Bot • Page 1 of 1', iconURL: 'https://i.imgur.com/AfFp7pu.png' })
      .setTimestamp();

    message.reply({ embeds: [helpEmbed] });

    }

  // Basic ping response
  if (content === '!ping') {
    message.reply('I hear the shrieking of the damned. (pong)');
  }

  // Dice roller command
  if (content.startsWith('!roll')) {
    const rollInput = content.replace('!roll', '').trim();
    
    if (!rollInput) {
      return message.reply('Try something like `!roll 1d20+2`, doomed one.');
    }

    try {
      const roll = new DiceRoll(rollInput);
      message.reply(`🎲 ${rollOutputFancy(roll)}`);
    } catch (err) {
      message.reply('That roll is cursed or malformed. Try again, wretch.');
    }
  }

  // Character creation
  if (content === '!createcharacter') {
    const char = generateCharacter();
    saveCharacter(message.author.id, char);

    const reply = `🕯️ **${char.name}**  
    **STR**: ${char.strength} | **AGI**: ${char.agility} | **PRE**: ${char.presence} | **TOU**: ${char.toughness}  
    **HP**: ${char.hp} | **Silver**: ${char.silver} shillings  
    **Gear**: ${char.items.join(', ')}
    
    *Saved to your soul.*`;
    
    message.reply(reply);
  }

  // Dice roll with stat checks (e.g., !dr str +1)
  if (content.startsWith('!dr')) {
    const args = content.split(' ').slice(1); // remove "!dr"
    let dr = 12;
    let modifier = 0;
    let statMod = 0;

    const character = getCharacter(message.author.id);

    if (!character) {
      return message.reply("You haven't created a character yet. Use `!createcharacter`.");
    }

    // Parse stat-based rolls like "!dr str" or "!dr agi +1"
    const statArg = args[0]?.toLowerCase();
    const statMap = {
      str: 'strength',
      agi: 'agility',
      pre: 'presence',
      tou: 'toughness'
    };

    if (statMap[statArg]) {
      statMod = Math.floor((character[statMap[statArg]] - 10) / 2);
      args.shift(); // remove stat arg from args
    }

    // Handle custom DR and extra modifier
    if (args.length) {
      const drArg = parseInt(args[0]);
      if (!isNaN(drArg)) {
        dr = drArg;
        args.shift(); // remove dr arg
      }
    }

    const modArg = args[0];
    if (modArg) {
      modifier = parseInt(modArg) || 0;
    }

    const roll = new DiceRoll('1d20');
    const total = roll.total + statMod + modifier;
    const success = total >= dr;

    const parts = [`🎲 Rolled **${roll.total}**`];
    if (statMod) parts.push(`${statMod >= 0 ? '+' : ''}${statMod} (stat)`);
    if (modifier) parts.push(`${modifier >= 0 ? '+' : ''}${modifier} (mod)`);

    const response = `${parts.join(' ')} = **${total}**
    You ${success ? '**succeed** 🎯' : '**fail** 💀'} vs DR${dr}`;

    message.reply(response);
  }

  // Show character sheet
  if (content === '!sheet') {
    const character = getCharacter(message.author.id);

    if (!character) {
      return message.reply("You have no character. Create one with `!createcharacter`.");
    }

    const reply = `🕯️ **${character.name}**  
    **STR**: ${character.strength} | **AGI**: ${character.agility} | **PRE**: ${character.presence} | **TOU**: ${character.toughness}  
    **HP**: ${character.hp} | **Silver**: ${character.silver} shillings  
    **Gear**: ${character.items.join(', ')}`;
    
    message.reply(reply);
  }
});

// Helper to format the dice roll result
function rollOutputFancy(roll) {
  const notation = roll.notation;
  const total = roll.total;
  const details = roll.rolls.map(r => r.rolls).flat().join(', ');
  return `**${notation}** → [${details}] = **${total}**`;
}

// Helper to generate a random character
function generateCharacter() {
  const rollStat = () => new DiceRoll('3d6').total;
  const hp = new DiceRoll('1d8').total;
  const silver = new DiceRoll('3d6').total * 10;

  const character = {
    name: generateName(),
    strength: rollStat(),
    agility: rollStat(),
    presence: rollStat(),
    toughness: rollStat(),
    hp,
    silver,
    items: getStartingItems()
  };

  return character;
}

// Helper to generate a random name
function generateName() {
  const first = ['Grim', 'Dregg', 'Vorn', 'Mal', 'Skor', 'Ylva', 'Thorne', 'Eirik'];
  const last = ['Wretch', 'Graveborn', 'Rotgut', 'Crowcaller', 'Skinsack', 'of the Mire', 'Doomspawn'];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
}

// Helper to get starting items for the character
function getStartingItems() {
  const weapons = ['Rusty sword', 'Femur club', 'Serrated dagger', 'Flail', 'Short bow'];
  const gear = ['Torn rations', 'Lantern', 'Rope', 'Needle & thread', 'Candle', 'Flask of oil'];
  const armor = ['Tattered robes', 'Padded armor', 'Chain shirt', 'None'];

  return [
    weapons[Math.floor(Math.random() * weapons.length)],
    gear[Math.floor(Math.random() * gear.length)],
    armor[Math.floor(Math.random() * armor.length)]
  ];
}

client.login(process.env.DISCORD_TOKEN);
