require('dotenv').config();

var Jimp = require('jimp');
var Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');

const prefix = '!ezm';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
})

client.on('error', (err) => {
    console.error(err);
})

client.on('message', msg => {
    if (!msg.content.toLowerCase().startsWith(prefix) || msg.author.bot) {
        return;
    }

    let args = msg.content.slice(prefix.length).trim().split(/ +/);
    let cmd = args.shift();
    let data = args;
    handleCommand(cmd, msg, data);

})

client.login(process.env.token);

function handleCommand(cmd, msg, data) {
    switch (cmd) {
        case 'add' :
            msg.reply('add');
            break;
        default:
            if (data.length < 1) {
                msg.reply('Please provide some text for the meme. !ezm template text to add');
                return;
            }
            let text = data.join(' ');
            memeMaker(msg, cmd, text)
    }
}

function memeMaker(msg, imageTemplate, text) {

    if (!fs.existsSync(`./base/${imageTemplate}.jpg`)) {
        msg.reply(`I can't find a template called ${imageTemplate}.jpg`);
        return;
    }
    let textSettings = {
        font: Jimp.FONT_SANS_64_WHITE,
        text: text,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP,
        placementX: 20,
        placementY: 40,
    };

    let imageSettings = {
        input: `./base/${imageTemplate}.jpg`,
        output: 'new.jpg',
        quality: 100
    }

    AddTextToImage(textSettings, imageSettings, () => {
        msg.reply('Your meme:', {
            files: [
                './new.jpg'
            ]
        })
    })

}









function AddTextToImage(textSettings, imageSettings, callback) {
    Jimp.read(imageSettings.input)
    .then(img => (
        Jimp.loadFont(textSettings.font).then(font => ([img, font]))
    ))
    .then(data => {
        tpl = data[0];
        font = data[1];

        let maxWidth = tpl.bitmap.width - 40;
        let maxHeight = tpl.bitmap.height - 40;

        return tpl.print(font,textSettings.placementX, textSettings.placementY, {
            text: textSettings.text,
            alignmentX: textSettings.alignmentX,
            alignmentY: textSettings.alignmentY
        }, maxWidth, maxHeight);

    })
    .then(tpl => (tpl.quality(imageSettings.quality).write(imageSettings.output)))
    .then(tpl => { 
        console.log('exported file: ' + imageSettings.output);
        callback();
      })
    .catch(err => {
        console.error(err);
    })
}