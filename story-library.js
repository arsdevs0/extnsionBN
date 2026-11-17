/* User-supplied visual references. These are editable designs, not official character art. */
const StoryLibrary = (() => {
  const rows = [
    ['sunny','Sunny','Sunless, Lost from Light','Sunny_Sunless.jpg','Sunless'],
    ['sunny','Sunny','Sunless, Lord of Shadows, Lost from Light','Sunny_Lord_of_Shadows.png','Lord of Shadows'],
    ['nephis','Nephis','Changing Star, Neph','Nephis_Changing_Star.jpg','Changing Star'],
    ['cassie','Cassie','Cassia, Song of the Fallen','Cassie_Song_of_the_Fallen.png','Song of the Fallen'],
    ['effie','Effie','Athena, Raised by Wolves','Effie_Raised_by_Wolves.jpg','Raised by Wolves'],
    ['kai','Kai','Nightingale','Kai_Nightingale.png','Nightingale'],
    ['jet','Jet','Master Jet, Soul Reaper','Master_Jet.png','Master Jet'],
    ['mordret','Mordret','Prince of Nothing','Mordret_Prince_of_Nothing.png','Prince of Nothing'],
    ['morgan','Morgan','Morgan of Valor','Morgan_of_Valor.jpg','Valor'],
    ['anvil','Anvil','Anvil of Valor, King of Swords','Anvil_of_Valor.png','Valor'],
    ['ki-song','Ki Song','Queen of Worms','Ki_Song_Queen_of_Worms.png','Queen of Worms'],
    ['madoc','Madoc','Whispering Blade','Madoc_Whispering_Blade.jpeg','Whispering Blade'],
    ['gunlaug','Gunlaug','Bright Lord','Gunlaug_Bright_Lord.jpg','Bright Lord'],
    ['noctis','Noctis','Immortal of Hope','Noctis_Immortal_of_Hope.jpg','Immortal of Hope'],
    ['saint','Saint','Shadow Saint','Shadow_Saint.png','Shadow Saint'],
    ['serpent','Serpent','Soul Serpent','Soul_Serpent.png','Soul Serpent'],
    ['fiend','Fiend','Ravenous Fiend, Scavy, Imp','Ravenous_Fiend_Scavy.jpg','Ravenous Fiend'],
    ['nightmare','Nightmare','Nightmare Steed','Nightmare_Steed.png','Steed'],
    ['nightmare','Nightmare','Nightmare Steed','Nightmare_Variation.jpg','Variation']
  ];
  const presets = rows.map(([entityId,name,aliases,file,variant]) => ({
    id:`shadow-slave-${file}`,entityId:`shadow-slave-${entityId}`,name,aliases,variant,
    series:'Shadow Slave',asset:`assets/characters/shadow-slave/${file}`,
    canonNotes:`Selected visual form: ${variant}. Preserve the supplied design across panels. Use only appearance facts stated in the pasted chapter; do not import later-arc powers, costumes, injuries, age changes or transformations.`,
    outfitNotes:'Use the clothing, armor, accessories or creature surface in this selected reference. Keep its design and colors unless the chapter explicitly describes a change.'
  }));
  function aliases(character) {
    return [character.name,...String(character.aliases||'').split(',')].map(s=>s.trim()).filter(Boolean);
  }
  function checkAliases(characters) {
    const names=new Map();
    for(const character of characters) for(const name of aliases(character)) {
      const key=name.toLocaleLowerCase();
      if(names.has(key)&&names.get(key)!==character.name) throw Error(`Alias “${name}” belongs to two characters. Choose one form or edit its aliases.`);
      names.set(key,character.name);
    }
    return names;
  }
  return {presets,aliases,checkAliases};
})();
if(typeof module!=='undefined')module.exports=StoryLibrary;
