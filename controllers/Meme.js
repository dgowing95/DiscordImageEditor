
const Canvas = require('canvas');
const fs = require('fs');
class Meme {
    canvas;
    context;
    width;
    height;

    constructor(db, userId) {
        this.db = db
        this.userId = userId
    }

    async registerFonts() {
        let fonts = await this.db.getFonts();
        fonts.forEach(font => {
            Canvas.registerFont(`./fonts/${font.font_file_name}`, { family: font.font_name });
        })

    }

    async getUserConfs() {
        let userFontColour
        let userFontStrokeColour
        let userFontStrokeEnabled
        let font
        try {
            let userPrefs = await this.db.getUserConfs(this.userId)
            userFontColour = '#' + userPrefs.text_colour;
            userFontStrokeColour = '#' + userPrefs.text_outline_colour; 
            userFontStrokeEnabled = userPrefs.text_outline;
            font = userPrefs.font_name;
        } catch (error) {
            userFontColour = '#FFFFFF';
            userFontStrokeColour = '#000000'; 
            userFontStrokeEnabled = true;
            font = 'Comic Sans';
        }
 

        this.context.fillStyle = userFontColour
        this.context.strokeStyle = userFontStrokeColour
        this.useStroke = userFontStrokeEnabled
        this.font = font

    }

    async loadImage(imageURL) {
        let image = await Canvas.loadImage(imageURL);
        this.canvas = Canvas.createCanvas(image.width, image.height);
        this.context = this.canvas.getContext('2d');
        this.context.drawImage(image,0,0);
        this.width = image.width;
        this.height = image.height

        this.fontSize = (image.width + image.height) * 0.035
        this.lineHeight = this.fontSize * 1.2;
        this.context.textAlign = 'center';
       
    }

    async writeText(upperText, lowerText = '') {
        let maxWidth = this.width * 0.8;
        let topStartY = this.height * 0.10;
        let bottomStartY = this.height * 0.85
        let centerX = this.width / 2;
        let lineHeight = this.lineHeight;

        this.context.font = `${this.fontSize}px "${this.font}"`
        this.wrapText(this.context, upperText, centerX, topStartY, maxWidth, lineHeight);
        if (lowerText.length > 0) {
            this.context.font = `${this.fontSize}px "${this.font}"`
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