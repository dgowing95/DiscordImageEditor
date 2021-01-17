
const Canvas = require('canvas');
const fs = require('fs');

class Meme {
    canvas;
    context;
    width;
    height;

    constructor() {

    }

    async registerFonts() {
        fs.readdir('./fonts/', (err, files) => {
            if (err) {
                console.log('Registering font error:' + err);
                return;
            }
            files.forEach(font => {
                Canvas.registerFont(`./fonts/${font}`, { family: 'Comic Sans' });
            });
        })
    }

    setConf(image) {
        this.width = image.width;
        this.height = image.height
        this.context.fillStyle = '#FFFFFF';
        this.context.strokeStyle = '#00000';
        this.context.textAlign = 'center';

        this.fontSize = (image.width + image.height) * 0.035
        this.lineHeight = this.fontSize * 1.2;
    }

    async loadImage(imageURL) {
        await this.registerFonts();
        return new Promise(function(resolve, reject) {

            Canvas.loadImage(imageURL)
            .then( function(image) {
                this.canvas = Canvas.createCanvas(image.width, image.height);
                this.context = this.canvas.getContext('2d');
                this.context.drawImage(image,0,0);
                this.setConf(image);
                resolve();
            }.bind(this))

            .catch( (error) => {
                console.log('Loading image error:' + error);
                reject();
            })

        }.bind(this))
    }

    // getFontSize(font, text) {
    //     let fontSize = 250;

    //     do {
    //         this.context.font = `${fontSize -= 10}px "${font}"`;
    //     } while (this.context.measureText(text).width > (this.width *0.95));

    //     return this.context.font;
    // }

    async writeText(font, upperText, lowerText = '') {
        let maxWidth = this.width * 0.8;
        let topStartY = this.height * 0.10;
        let bottomStartY = this.height * 0.85
        let centerX = this.width / 2;
        let lineHeight = this.lineHeight;

        this.context.font = `${this.fontSize}px "Comic Sans"`
        this.wrapText(this.context, upperText, centerX, topStartY, maxWidth, lineHeight);
        if (lowerText.length > 0) {
            this.context.font = `${this.fontSize}px "Comic Sans"`
            this.wrapText(this.context, upperText, centerX, bottomStartY, maxWidth, lineHeight);
        }
    }

    wrapText(context, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var line = '';

        for(var n = 0; n < words.length; n++) {
          var testLine = line + words[n] + ' ';
          var metrics = context.measureText(testLine);
          var testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            context.strokeText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
          }
          else {
            line = testLine;
          }
        }
        context.fillText(line, x, y);
        context.strokeText(line, x, y);
      }

    exportToFile() {
        if (!this.canvas) {
            return;
        }
        var fs = require('fs')
        , out = fs.createWriteStream(__dirname + '/text.png')
        , stream = this.canvas.pngStream();

        stream.on('data', function(chunk){
        out.write(chunk);
        });

        stream.on('end', function(){
        console.log('saved png');
        });

        stream.on('error', function(error) {
            console.log(error);
        })
    }

    exportBuffer() {
        if (!this.canvas) {
            return;
        }
        return this.canvas.toBuffer();
    }
}
module.exports = Meme