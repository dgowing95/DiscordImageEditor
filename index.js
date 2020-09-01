require('dotenv').config();
var https = require('https')
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
        case 'list' :
            listTemplates(msg);
            break;
        case 'add' :
            addTemplate(msg, data);
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

function addTemplate(msg, data) {
    if (msg.attachments.size !== 1) {
        msg.reply('You need to attach a single .jpg along with the message. !ezm add template-name');
        return;
    }
    let image = msg.attachments.first();

    if (!image.name.includes('.jpg')) {
        msg.reply('The image must use a .jpg extension.');
        return;
    }

    let filename = data.join('-');
    const file = fs.createWriteStream(`./templates/${filename}.jpg`);

    let url = '';
    if ("proxyURL" in image) {
        url = image.proxyURL;
    } else {
        url = image.url;
    }

    https.get(url, (response) => {
        response.pipe(file);
        msg.channel.send(`Template '${filename}' is now ready for use. !ezm ${filename} your text here`);
        msg.delete();
    }).on('error', function(e) {
        msg.reply('There was an issue downloading your attachment, please try again');
        if (fs.existsSync(`./templates/${filename}.jpg`)) {
            fs.unlinkSync(`./templates/${filename}.jpg`);
        }
    })

}

function listTemplates(msg) {
    //msg.delete();

    

    let folder = './templates';
    fs.readdir(folder, (err, files) => {
        if (err) {
            console.log(err);
            msg.channel.send('An error occurred while reading the available templates');
            return;
        }

        let message = 'Available templates are: \n';
        files.forEach(file => {
            if (file !== undefined) {
                message += file.replace('.jpg', '') + '\n';
            }
        })
        msg.channel.send(message);
    })
}

function memeMaker(msg, imageTemplate, text) {
    msg.delete();

    if (!fs.existsSync(`./templates/${imageTemplate}.jpg`)) {
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
        input: `./templates/${imageTemplate}.jpg`,
        output: 'new.jpg',
        quality: 100
    }

    AddTextToImage(textSettings, imageSettings, (img) => {
        msg.channel.send( {
            files: [
                img
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
    .then(tpl => (tpl.getBufferAsync(Jimp.MIME_JPEG)))
    .then(imageBuffer => { 
        console.log('Image generated');
        callback(imageBuffer);
      })
    .catch(err => {
        console.error(err);
    })
}