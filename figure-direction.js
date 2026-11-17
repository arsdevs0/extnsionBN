/* One body specification for planning, generation and pose reconstruction. */
(function(root) {
  function build({physical='',tuning='',defaultFigure=''}={}) {
    const details=String(physical).trim(), controls=String(tuning).trim();
    return `FIGURE AUTHORITY — resolve the body before applying pose or clothes:
BODY PRIORITY: Body Tuning wins over Figure Details for the same trait. Figure Details win over target/base body wording; target/base body wording wins over defaults and reference bodies. Planner suggestions never change physique.
${controls?`EXACT BODY TUNING — highest priority for entered traits:\n${controls}\n`:''}${details?`WRITTEN FIGURE DETAILS — next priority:\n${details}\n`:''}${!details&&!controls&&defaultFigure?`DEFAULT BUILD — only if the user has not described a different build:\n${defaultFigure}\n`:''}Keep supplied measurements verbatim; invent no numbers. Unspecified traits follow the user's overall build, then the subject reference.
VISIBLE BODY FIDELITY: A requested thick/full build retains mass across torso, upper arms, hips and thighs, with waist and abdomen matching the user's notes. Do not reinterpret fullness as only larger bust/hips on a skinny body. Preserve this build across the batch. Identity, outfit, pose and style bodies cannot slim it down; pose controls posture, never body width or outer contour.
CLOTHING FIT: Adapt garment sizing, widths, folds and drape to this body. Preserve exact garment design and intended ease. Loose clothing stays loose; non-stretch fabric drapes naturally. Never shrink the body to fit the outfit model. Keep the referenced face unchanged.`;
  }
  const api={build};
  if(typeof module!=='undefined')module.exports=api;
  else root.FigureDirection=api;
})(typeof globalThis!=='undefined'?globalThis:this);
