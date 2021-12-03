// base64 encodes either a string or an array of charcodes
export function encodeData(data) {
  let strData = '';
  if (typeof data == 'string') {
    strData = data;
  } else {
    const aData = data;
    for (let i = 0; i < aData.length; i++) {
      strData += String.fromCharCode(aData[i]);
    }
  }
  return btoa(strData);
}

export function readCanvasData(oCanvas) {
  const iWidth = parseInt(oCanvas.width);
  const iHeight = parseInt(oCanvas.height);
  return oCanvas.getContext('2d').getImageData(0, 0, iWidth, iHeight);
}

export function makeDataURI(strData, strMime) {
  return 'data:' + strMime + ';base64,' + strData;
}

const cW = 0xff;
export function canvasPalette(canvas) {
  const oData = readCanvasData(canvas),
    data = oData.data,
    exists = {},
    palette = [];
  for (let i = 0, n = data.length; i < n; i += 4) {
    const a = data[i + 3];
    if (a == 0) continue;
    const r = (cW - a * (1 - data[i] / cW)) | 0,
      g = (cW - a * (1 - data[i + 1] / cW)) | 0,
      b = (cW - a * (1 - data[i + 2] / cW)) | 0,
      col = b + (g << 8) + (r << 16);
    if (!exists[col]) {
      if (palette.length >= 255) {
        const subcanvas = document.createElement('canvas'),
          width = oData.width >> 1,
          height = oData.height >> 1;
        subcanvas.width = width;
        subcanvas.height = height;
        subcanvas.getContext('2d').drawImage(canvas, 0, 0, width, height);
        return canvasPalette(subcanvas);
      } else {
        exists[col] = true;
        palette.push({c: col, r: r, g: g, b: b});
      }
    }
  }
  return {exists: exists, palette: palette};
}

export function canvasToGIFDataURL(canvas) {
  let dr, dg, db;
  const oData = readCanvasData(canvas);
  const data = oData.data;
  let palette = canvasPalette(canvas);
  const exists = palette.exists;
  palette = palette.palette;
  const outpalette = [];
  const pixels = [];
  let maxdDifI = null;
  let maxdDif = 0;
  for (var i = 0, pi = 0, l = data.length; i < l; i += 4, pi++) {
    const a = data[i + 3];
    if (a == 0) {
      pixels[pi] = -1;
      continue;
    }
    var r = (cW - a * (1 - data[i] / cW)) | 0,
      g = (cW - a * (1 - data[i + 1] / cW)) | 0,
      b = (cW - a * (1 - data[i + 2] / cW)) | 0,
      col = b + (g << 8) + (r << 16);
    pixels[pi] = col;
    if (!exists[col]) {
      exists[col] = true;
      let minDif = 0xffffff,
        minDifColIndex = null;
      for (var j = 0, nj = palette.length; j < nj; j++) {
        var pal = palette[j],
          d = (dr = pal.rr) * dr + (dg = pal.gg) * dg + (db = pal.bb) * db;
        if (d < minDif) {
          minDif = d;
          minDifColIndex = j;
        }
      }
      if (minDif > maxdDif) {
        maxdDif = minDif;
        maxDifI = outpalette.length;
      }
      outpalette.push({c: col, d: minDif, r: r, g: g, b: b, index: minDifColIndex});
    }
  }
  while (maxdDif != null && palette.length < 255) {
    var dif = outpalette.splice(maxdDifI, 1)[0];
    maxdDif = null;
    maxdDifI = 0;
    var r = dif.r,
      g = dif.g,
      b = dif.b,
      col = dif.c;
    const index = palette.length;
    palette.push({c: col, r: r, g: g, b: b});
    for (var j = 0, nj = outpalette.length; j < nj; j++) {
      var dif = outpalette[j],
        d = (dr = dif.rr) * dr + (dg = dif.gg) * dg + (db = dif.bb) * db;
      if (d < dif.d) {
        dif.d = d;
        dif.index = index;
      }
      if (dif.d > maxdDif) {
        maxdDif = dif.d;
        maxDifI = j;
      }
    }
  }
  const map = {};
  palette.unshift({c: -1});
  for (var j = 0, pal; (pal = palette[j]); j++) {
    var col = pal.c;
    map[col] = j;
    palette[j] = col;
  }
  for (var j = 0, dif; (dif = outpalette[j]); j++) {
    map[dif.c] = dif.index + 1;
  }
  const indexes = [];
  for (var i = 0, pixel; (pixel = pixels[i]); i++) {
    indexes.push(map[pixel]);
  }
  for (var l = 2; l <= 256; l = l << 1) {
    if (palette.length == l) break;
    if (palette.length < l) {
      while (palette.length < l) palette.push(0);
      break;
    }
  }
  const buf = [];
  const gf = new GifWriter(buf, oData.width, oData.height, {palette: palette});
  gf.addFrame(0, 0, oData.width, oData.height, indexes, {transparent: 0});
  const binary_gif = buf.slice(0, gf.end());
  return makeDataURI(encodeData(binary_gif), 'image/gif');
}
