const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

test('in-image lettering survives export byte-for-byte; PDF panels have no white padding',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const out=path.join(__dirname,'tmp','story-in-image-4.6.33');fs.mkdirSync(out,{recursive:true});
  try{
    const page=await browser.newPage({viewport:{width:400,height:900}});
    // A supplied reference may be used for visual QA; the repository fixture
    // keeps this test runnable without the user's Downloads folder.
    const sample=process.env.STORY_REFERENCE_SAMPLE||path.join(__dirname,'assets','lettering-narration-dialogue-reference.png');
    await page.route('https://fixture.test/**',route=>{
      const name=new URL(route.request().url()).pathname;
      if(name==='/sample')return route.fulfill({body:fs.readFileSync(sample),contentType:sample.endsWith('.jpg')?'image/jpeg':'image/png'});
      if(name==='/assets/ComicNeue-Bold.ttf')return route.fulfill({contentType:'font/ttf',body:fs.readFileSync(path.join(__dirname,name))});
      return route.fulfill({contentType:'text/html',body:'<style>body{margin:0;background:#202529}img{width:100%;display:block}</style>'});
    });
    await page.goto('https://fixture.test/');
    await page.addScriptTag({content:fs.readFileSync('lib/pdf-lib.min.js','utf8')});
    await page.addScriptTag({content:fs.readFileSync('story-renderer.js','utf8')});
    const result=await page.evaluate(async()=>{
      const input=await (await fetch('/sample')).blob();
      const size=await createImageBitmap(input),expected={width:size.width,height:size.height};size.close();
      // Legacy callers must not add a second caption or an external gutter.
      const rendered=await StoryRenderer.render(input,{narration:'DO NOT ADD THIS CAPTION',dialogue:[{speaker:'A',text:'Duplicate'}]},{lettering:true,trim:true});
      const a=new Uint8Array(await input.arrayBuffer()),b=new Uint8Array(await rendered.blob.arrayBuffer());
      const identical=rendered.blob===input&&a.length===b.length&&a.every((v,i)=>v===b[i]);
      const img=document.createElement('img');img.src=URL.createObjectURL(rendered.blob);document.body.append(img);await img.decode();
      const thumbnail=await createImageBitmap(await StoryRenderer.thumbnail(rendered.blob));
      const thumbSize={width:thumbnail.width,height:thumbnail.height};thumbnail.close();
      const pdf=await StoryRenderer.pdf([{title:'Reference layout',panels:[{status:'done',blobKey:'image'}]}],async()=>rendered.blob);
      const doc=await PDFLib.PDFDocument.load(await pdf.arrayBuffer()),panel=doc.getPages()[1];
      const contents=panel.node.Contents().asArray().map(ref=>new TextDecoder().decode(PDFLib.decodePDFRawStream(doc.context.lookup(ref)).decode())).join('\n');
      const bytes=new Uint8Array(await pdf.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
      return {identical,expected,width:rendered.width,height:rendered.height,offset:rendered.artOffsetY,textRegions:rendered.textRegions,pageSize:panel.getSize(),pages:doc.getPageCount(),thumbSize,contents,pdf:btoa(binary)};
    });
    assert.equal(result.identical,true);assert.equal(result.width,result.expected.width);assert.equal(result.height,result.expected.height);
    assert.equal(result.offset,0);assert.deepEqual(result.textRegions,[]);
    assert.equal(result.pages,2);assert.equal(result.pageSize.width,600);
    assert.ok(Math.abs(result.pageSize.height-600*result.height/result.width)<.001,'PDF page adds padding');
    assert.doesNotMatch(result.contents,/1 0 0 1 0 16 cm/);assert.match(result.contents,/1 0 0 1 0 0 cm/);
    assert.equal(result.thumbSize.width,Math.min(420,result.width));assert.equal(result.thumbSize.height,Math.round(result.height*result.thumbSize.width/result.width));
    fs.writeFileSync(path.join(out,'reference-export.pdf'),Buffer.from(result.pdf,'base64'));
    await page.locator('img').screenshot({path:path.join(out,'reference-export-400.png')});
  }finally{await browser.close();}
});
