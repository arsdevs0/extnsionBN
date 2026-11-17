/* Preserve image-native Story lettering; full-bleed, whole-panel PDF export. */
const StoryRenderer = (() => {
  let fontPromise;
  async function font() {
    if(!fontPromise) fontPromise=(async()=>{
      const url=globalThis.chrome?.runtime?.getURL?chrome.runtime.getURL('assets/ComicNeue-Bold.ttf'):'assets/ComicNeue-Bold.ttf';
      const face=new FontFace('Story Comic Neue',await (await fetch(url)).arrayBuffer(),{weight:'700'});
      await face.load();
      (typeof document!=='undefined'?document.fonts:self.fonts).add(face);
    })();
    // A failure is visible and retryable; never silently change the font midway through a chapter.
    try { await fontPromise; } catch(e) { fontPromise=null; throw Error(`Story lettering font could not load: ${e.message}`); }
  }
  function wrap(ctx,value,width) {
    const lines=[];
    for(const paragraph of String(value).split(/\r?\n/)) {
      let line='';
      for(const word of paragraph.split(/\s+/).filter(Boolean)) {
        if(ctx.measureText(line?`${line} ${word}`:word).width<=width) {line=line?`${line} ${word}`:word;continue;}
        if(line){lines.push(line);line='';}
        // Split only overlong words, by grapheme so Hindi/emoji clusters stay intact.
        const clusters=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(word)].map(x=>x.segment):Array.from(word);
        for(const part of clusters){if(line&&ctx.measureText(line+part).width>width){lines.push(line);line='';}line+=part;}
      }
      lines.push(line);
    }
    return lines;
  }
  function safeFooterCrop(data,width,height,protectedRegions=[]) {
    // A compact four-point watermark is removable only inside the requested white
    // export gutter. Any other ink, text, protected detail or artwork prevents it.
    const max=Math.floor(height*.065);let rows=0;
    const ink=[];let minX=width,maxX=0,minY=height,maxY=0,neutral=true;
    for(let y=height-max;y<height;y++)for(let x=0;x<width;x++) {
      const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2];
      if(Math.min(r,g,b)<247){ink.push([x,y]);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(Math.max(r,g,b)-Math.min(r,g,b)>20)neutral=false;}
    }
    const markW=maxX-minX+1,markH=maxY-minY+1;
    let watermark=false;
    if(ink.length&&neutral&&minX>=width*.9&&markW>=8&&markH>=8&&markW<=width*.065&&markW/markH>.75&&markW/markH<1.3) {
      const profile=Array(markH).fill(0);for(const [,y] of ink)profile[y-minY]++;
      const density=ink.length/(markW*markH),quarter=Math.floor(markH*.22),middle=Math.floor(markH/2);
      const symmetric=profile.every((v,i)=>Math.abs(v-profile[markH-i-1])<=Math.max(3,markW*.22));
      watermark=density>.14&&density<.62&&symmetric&&profile[0]<markW*.25&&profile[markH-1]<markW*.25&&profile[middle]>markW*.7&&profile[quarter]<markW*.5&&profile[markH-quarter-1]<markW*.5;
    }
    for(let y=height-1;y>=height-max;y--) {
      let clean=true;
      for(let x=0;x<width;x++) {if(watermark&&x>=minX&&x<=maxX&&y>=minY&&y<=maxY)continue;const i=(y*width+x)*4;if(data[i]<247||data[i+1]<247||data[i+2]<247){clean=false;break;}}
      if(!clean)break;rows++;
    }
    if(rows<Math.max(4,height*.012))return height;
    const cut=height-rows;
    if(protectedRegions.some(r=>(r.y+r.h)*height>cut))return height;
    return cut;
  }
  // Artwork and lettering are composed together by the image model. Keep the
  // original bytes and aspect ratio: no external text bands, crop or repaint.
  async function render(blob) {
    const bitmap=await createImageBitmap(blob);
    try {return {blob,width:bitmap.width,height:bitmap.height,trimmed:0,textRegions:[],artOffsetY:0};}
    finally {bitmap.close();}
  }
  async function pdf(chapters,readBlob,{maxWidth=1200,quality=.88}={}) {
    const doc=await PDFLib.PDFDocument.create();
    doc.setTitle(chapters.map(c=>c.title).join(' / '));doc.setCreator('Guc guy Story Studio');
    await font();
    for(const [chapterIndex,chapter] of chapters.entries()) {
      // Raster chapter headings support the same Unicode font fallback as narration.
      const titleCanvas=new OffscreenCanvas(1200,240),ctx=titleCanvas.getContext('2d');
      ctx.fillStyle='#141820';ctx.fillRect(0,0,1200,240);ctx.fillStyle='#e3efac';ctx.font='700 28px "Story Comic Neue", "Nirmala UI", sans-serif';
      ctx.fillText(`CHAPTER ${chapterIndex+1}`,64,60);ctx.fillStyle='#fff';ctx.font='700 42px "Story Comic Neue", "Nirmala UI", sans-serif';
      const titleLines=wrap(ctx,chapter.title||`Chapter ${chapterIndex+1}`,1072);
      // Long titles receive a correctly sized page rather than truncation.
      const titleHeight=Math.max(240,120+titleLines.length*58);
      const cover=new OffscreenCanvas(1200,titleHeight),cc=cover.getContext('2d');cc.fillStyle='#141820';cc.fillRect(0,0,1200,titleHeight);cc.drawImage(titleCanvas,0,0);cc.fillStyle='#fff';cc.font=ctx.font;
      titleLines.forEach((line,i)=>cc.fillText(line,64,128+i*58));
      const titleImage=await doc.embedJpg(await (await cover.convertToBlob({type:'image/jpeg',quality:.94})).arrayBuffer());
      doc.addPage([600,titleHeight/2]).drawImage(titleImage,{x:0,y:0,width:600,height:titleHeight/2});
      for(const item of chapter.panels) {
        if(item.status!=='done'||!item.blobKey)throw Error('Finish or retry every panel before building the complete PDF.');
        const blob=await readBlob(item.blobKey);if(!blob)throw Error('A saved panel is missing. Resume its chapter to restore it.');
        const bitmap=await createImageBitmap(blob);
        try {
          const w=Math.min(maxWidth,bitmap.width),h=Math.round(bitmap.height*w/bitmap.width);
          const canvas=new OffscreenCanvas(w,h),cx=canvas.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(bitmap,0,0,w,h);
          const image=await doc.embedJpg(await (await canvas.convertToBlob({type:'image/jpeg',quality})).arrayBuffer());
          // A complete panel is the page boundary: no arbitrary strips through faces or bubbles.
          const pageHeight=600*h/w;
          doc.addPage([600,pageHeight]).drawImage(image,{x:0,y:0,width:600,height:pageHeight});
        } finally {bitmap.close();}
      }
    }
    return new Blob([await doc.save()],{type:'application/pdf'});
  }
  async function thumbnail(blob) {
    const bitmap=await createImageBitmap(blob);
    try {const w=Math.min(420,bitmap.width),h=Math.round(bitmap.height*w/bitmap.width),canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,w,h);return await canvas.convertToBlob({type:'image/jpeg',quality:.78});}
    finally {bitmap.close();}
  }
  return {wrap,safeFooterCrop,render,pdf,thumbnail};
})();
if(typeof module!=='undefined')module.exports=StoryRenderer;
