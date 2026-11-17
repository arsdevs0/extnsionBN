/* A deliberately selected body image shared by all creation workflows. */
(function(root){
  function record(value){
    if(!value||typeof value.dataUrl!=='string'||!/^data:image\/(png|jpeg|webp|gif|avif);base64,/i.test(value.dataUrl)||value.dataUrl.length>11*1024*1024)return null;
    return {id:String(value.id||''),name:String(value.name||'Figure reference').slice(0,180),dataUrl:value.dataUrl};
  }
  function instruction(imageNumber,character='',height=''){
    if(!Number.isInteger(imageNumber)||imageNumber<1)throw Error('Figure reference is missing from the image attachments.');
    return `FIGURE IMAGE — HIGHEST BODY AUTHORITY: REFERENCE IMAGE ${imageNumber} (@figure) defines the exact figure${character?` of "${character}" only`:' of the main subject'}. Match this image's overall build, body volume, torso/arm/thigh thickness and bust/waist/hip proportions. This selected figure image overrides conflicting written measurements${height?' of body build':''}, body tuning, identity-photo bodies, outfit models, pose silhouettes, generated scene descriptions and style samples. ${height?'STANDING HEIGHT EXCEPTION: Keep the explicitly entered height '+height+' for '+character+'; figure controls build, not stature. ':''}Preserve its natural body shape across all poses and frames; fit the selected clothes to this body. Copy BODY SHAPE ONLY, never its face, age, identity, clothing, pose, camera or background. Keep the assigned identity and outfit references. ${character?'Other characters and supporting people retain their own body specifications.':'Do not add a person if the requested scene contains none.'} Do not infer numeric measurements from the photo.`;
  }
  function planner(character='',height=''){
    return `A selected FIGURE IMAGE is the highest body-shape authority${character?` for "${character}" only`:''}. The renderer receives the original image. Do not invent or rewrite physique; defer conflicting body notes and defaults to that image. ${height?'Keep this character\'s entered standing height '+height+'; the figure controls build, not stature. ':''}Plan only action and scene details.`;
  }
  const api={record,instruction,planner};
  if(typeof module!=='undefined')module.exports=api;else root.FigureReference=api;
})(typeof globalThis!=='undefined'?globalThis:this);
