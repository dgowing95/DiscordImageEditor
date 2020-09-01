var Jimp = require('jimp');

let textSettings = {
    font: Jimp.FONT_SANS_64_WHITE,
    text: 'This is the text',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    maxWidth: 1000,
    maxHeight: 1400,
    placementX: 10,
    placementY: 0,
};

let imageSettings = {
    input: 'base.jpg',
    output: 'new.jpg',
    quality: 100
}

AddTextToImage(textSettings, imageSettings)



function AddTextToImage(textSettings, imageSettings) {
    Jimp.read(imageSettings.input)
    .then(img => (
        Jimp.loadFont(textSettings.font).then(font => ([img, font]))
    ))
    .then(data => {
        tpl = data[0];
        font = data[1];

        return tpl.print(font,textSettings.placementX, textSettings.placementY, {
            text: textSettings.text,
            alignmentX: textSettings.alignmentX,
            alignmentY: textSettings.alignmentY
        }, textSettings.maxWidth, textSettings.maxHeight);

    })
    .then(tpl => (tpl.quality(imageSettings.quality).write(imageSettings.output)))
    .then(tpl => { 
        console.log('exported file: ' + imageSettings.output);
      })
    .catch(err => {
        console.error(err);
    })
}