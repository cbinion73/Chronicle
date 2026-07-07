// The Biblical Knowledge Graph — Milestone 3 seed.
//
// A curated (not generated) graph of the biblical world: people, places, and
// the relationships between them, each anchored to real Scripture references.
// This is the substrate under the Character Network and the Atlas, and the
// beginning of what the Echo Engine will eventually query directly instead
// of only doing verse-level cross-references (src/lib/bibleCrossReferences.ts
// already covers that layer well — this graph is the *entity* layer above it:
// who these people were, how they relate, where these places are).
//
// Deliberately hand-curated rather than imported from an external dataset:
// this is a seed of ~45 people and ~25 places spanning the whole canon, not
// an exhaustive graph (the full vision calls for ~3,000 people/~1,300 places
// via Theographic-class data — that import is future work, tracked in
// REDESIGN.md). Every entry here is directly checkable against the text.

export type Era =
  | 'primeval'
  | 'patriarchal'
  | 'exodus'
  | 'judges'
  | 'united-monarchy'
  | 'divided-monarchy'
  | 'exile'
  | 'return'
  | 'gospels'
  | 'apostolic';

export type RelationshipKind =
  | 'father-of' | 'mother-of' | 'spouse-of' | 'sibling-of' | 'descendant-of'
  | 'ruled' | 'prophet-to' | 'led' | 'anointed' | 'mentored' | 'betrayed'
  | 'served' | 'opposed';

export interface PersonRelationship {
  kind: RelationshipKind;
  targetId: string;
  note?: string;
}

export interface Person {
  id: string;
  name: string;
  altNames?: string[];
  era: Era;
  summary: string;
  keyPassages: string[];
  relationships: PersonRelationship[];
  placeIds?: string[];
}

export interface Place {
  id: string;
  name: string;
  altNames?: string[];
  modernName?: string;
  region: string;
  summary: string;
  keyPassages: string[];
  lat?: number;
  lon?: number;
}

export const PEOPLE: Person[] = [
  { id: 'adam', name: 'Adam', era: 'primeval', summary: 'The first man, formed from the dust and given the breath of life; his disobedience brought sin into the world.', keyPassages: ['Genesis 2:7', 'Genesis 3:17-19', 'Romans 5:12'], relationships: [{ kind: 'father-of', targetId: 'seth' }, { kind: 'spouse-of', targetId: 'eve' }], placeIds: ['eden'] },
  { id: 'eve', name: 'Eve', era: 'primeval', summary: 'The first woman, "the mother of all living," deceived by the serpent in the garden.', keyPassages: ['Genesis 3:20', 'Genesis 3:1-6', '2 Corinthians 11:3'], relationships: [{ kind: 'spouse-of', targetId: 'adam' }], placeIds: ['eden'] },
  { id: 'cain', name: 'Cain', era: 'primeval', summary: 'Firstborn of Adam and Eve, a tiller of the ground who murdered his brother Abel out of jealousy.', keyPassages: ['Genesis 4:1-16'], relationships: [{ kind: 'sibling-of', targetId: 'abel' }] },
  { id: 'abel', name: 'Abel', era: 'primeval', summary: 'Second son of Adam and Eve, a keeper of sheep whose offering was accepted; murdered by his brother Cain.', keyPassages: ['Genesis 4:2-8', 'Hebrews 11:4'], relationships: [{ kind: 'sibling-of', targetId: 'cain' }] },
  { id: 'seth', name: 'Seth', era: 'primeval', summary: 'Third son given to Adam and Eve "instead of Abel," through whom the godly line continued to Noah.', keyPassages: ['Genesis 4:25-26', 'Genesis 5:3'], relationships: [{ kind: 'descendant-of', targetId: 'adam' }] },
  { id: 'noah', name: 'Noah', era: 'primeval', summary: 'A righteous man who walked with God; built the ark that preserved his family and the animals through the flood.', keyPassages: ['Genesis 6:9', 'Genesis 6-9', 'Hebrews 11:7'], relationships: [{ kind: 'father-of', targetId: 'shem' }], placeIds: ['ararat'] },
  { id: 'shem', name: 'Shem', era: 'primeval', summary: 'Eldest son of Noah, ancestor of the Semitic peoples and of Abraham.', keyPassages: ['Genesis 9:26-27', 'Genesis 11:10-26'], relationships: [{ kind: 'descendant-of', targetId: 'noah' }] },
  { id: 'abraham', name: 'Abraham', altNames: ['Abram'], era: 'patriarchal', summary: 'Called out of Ur to a land he had never seen; father of the covenant nation, credited with righteousness through faith.', keyPassages: ['Genesis 12:1-3', 'Genesis 15:6', 'Romans 4:3'], relationships: [{ kind: 'spouse-of', targetId: 'sarah' }, { kind: 'father-of', targetId: 'ishmael' }, { kind: 'father-of', targetId: 'isaac' }], placeIds: ['ur', 'haran', 'canaan', 'hebron'] },
  { id: 'sarah', name: 'Sarah', altNames: ['Sarai'], era: 'patriarchal', summary: 'Wife of Abraham; bore Isaac in old age as the fulfillment of God\'s promise.', keyPassages: ['Genesis 17:15-16', 'Genesis 21:1-7', 'Hebrews 11:11'], relationships: [{ kind: 'spouse-of', targetId: 'abraham' }, { kind: 'mother-of', targetId: 'isaac' }], placeIds: ['ur', 'haran', 'canaan', 'hebron'] },
  { id: 'hagar', name: 'Hagar', era: 'patriarchal', summary: 'Sarah\'s Egyptian servant, mother of Ishmael, met and comforted by God in the wilderness.', keyPassages: ['Genesis 16:1-16', 'Genesis 21:9-21'], relationships: [{ kind: 'mother-of', targetId: 'ishmael' }] },
  { id: 'ishmael', name: 'Ishmael', era: 'patriarchal', summary: 'Son of Abraham and Hagar; God promised he too would become a great nation.', keyPassages: ['Genesis 16:11-12', 'Genesis 21:18-20'], relationships: [{ kind: 'descendant-of', targetId: 'abraham' }] },
  { id: 'isaac', name: 'Isaac', era: 'patriarchal', summary: 'The promised son of Abraham and Sarah, nearly offered on Moriah; father of Jacob and Esau.', keyPassages: ['Genesis 22:1-14', 'Genesis 25:21-26'], relationships: [{ kind: 'spouse-of', targetId: 'rebekah' }, { kind: 'father-of', targetId: 'jacob' }, { kind: 'father-of', targetId: 'esau' }], placeIds: ['hebron', 'canaan'] },
  { id: 'rebekah', name: 'Rebekah', era: 'patriarchal', summary: 'Wife of Isaac, chosen at the well in Haran; favored Jacob and helped secure his blessing.', keyPassages: ['Genesis 24:15-27', 'Genesis 27:5-17'], relationships: [{ kind: 'spouse-of', targetId: 'isaac' }, { kind: 'mother-of', targetId: 'jacob' }] },
  { id: 'esau', name: 'Esau', era: 'patriarchal', summary: 'Elder son of Isaac and Rebekah, sold his birthright for a bowl of stew; ancestor of Edom.', keyPassages: ['Genesis 25:29-34', 'Genesis 27:41'], relationships: [{ kind: 'sibling-of', targetId: 'jacob' }] },
  { id: 'jacob', name: 'Jacob', altNames: ['Israel'], era: 'patriarchal', summary: 'Renamed Israel after wrestling with God at Peniel; father of the twelve tribes.', keyPassages: ['Genesis 32:24-28', 'Genesis 35:10', 'Genesis 49'], relationships: [{ kind: 'sibling-of', targetId: 'esau' }, { kind: 'spouse-of', targetId: 'leah' }, { kind: 'spouse-of', targetId: 'rachel' }, { kind: 'father-of', targetId: 'joseph' }, { kind: 'father-of', targetId: 'judah' }], placeIds: ['bethel', 'haran', 'canaan'] },
  { id: 'leah', name: 'Leah', era: 'patriarchal', summary: 'Jacob\'s first wife, mother of six sons including Judah and Levi.', keyPassages: ['Genesis 29:16-30', 'Genesis 29:35'], relationships: [{ kind: 'spouse-of', targetId: 'jacob' }, { kind: 'mother-of', targetId: 'judah' }] },
  { id: 'rachel', name: 'Rachel', era: 'patriarchal', summary: 'Jacob\'s beloved wife, mother of Joseph and Benjamin; died giving birth near Bethlehem.', keyPassages: ['Genesis 29:18', 'Genesis 35:16-19'], relationships: [{ kind: 'spouse-of', targetId: 'jacob' }, { kind: 'mother-of', targetId: 'joseph' }] },
  { id: 'joseph', name: 'Joseph', era: 'patriarchal', summary: 'Favored son of Jacob, sold into slavery by his brothers, rose to rule Egypt, and preserved his family through famine.', keyPassages: ['Genesis 37:3-4', 'Genesis 41:39-41', 'Genesis 50:20'], relationships: [{ kind: 'descendant-of', targetId: 'jacob' }], placeIds: ['egypt', 'canaan'] },
  { id: 'judah', name: 'Judah', era: 'patriarchal', summary: 'Fourth son of Jacob and Leah; his tribe became the royal line, from which David and ultimately Christ descended.', keyPassages: ['Genesis 49:10', 'Matthew 1:2-3'], relationships: [{ kind: 'descendant-of', targetId: 'jacob' }] },
  { id: 'moses', name: 'Moses', era: 'exodus', summary: 'Raised in Pharaoh\'s house, called at the burning bush, led Israel out of Egypt and received the Law at Sinai.', keyPassages: ['Exodus 3:1-10', 'Exodus 12:31-42', 'Exodus 20', 'Deuteronomy 34:10'], relationships: [{ kind: 'sibling-of', targetId: 'aaron' }, { kind: 'sibling-of', targetId: 'miriam' }, { kind: 'led', targetId: 'joshua', note: 'commissioned Joshua as his successor' }], placeIds: ['egypt', 'sinai', 'kadesh-barnea'] },
  { id: 'aaron', name: 'Aaron', era: 'exodus', summary: 'Elder brother of Moses, Israel\'s first high priest, spokesman before Pharaoh.', keyPassages: ['Exodus 4:14-16', 'Exodus 28:1', 'Numbers 20:22-29'], relationships: [{ kind: 'sibling-of', targetId: 'moses' }] },
  { id: 'miriam', name: 'Miriam', era: 'exodus', summary: 'Sister of Moses and Aaron, a prophetess who led Israel in song after crossing the Red Sea.', keyPassages: ['Exodus 15:20-21', 'Numbers 12:1-15'], relationships: [{ kind: 'sibling-of', targetId: 'moses' }] },
  { id: 'joshua', name: 'Joshua', era: 'exodus', summary: 'Moses\' successor, led Israel across the Jordan and in the conquest of Canaan.', keyPassages: ['Joshua 1:1-9', 'Joshua 6', 'Joshua 24:15'], relationships: [{ kind: 'mentored', targetId: 'caleb' }], placeIds: ['jericho', 'canaan'] },
  { id: 'caleb', name: 'Caleb', era: 'exodus', summary: 'One of the twelve spies who brought a faithful report; received Hebron as his inheritance for wholehearted trust.', keyPassages: ['Numbers 13:30', 'Joshua 14:6-14'], relationships: [], placeIds: ['hebron'] },
  { id: 'deborah', name: 'Deborah', era: 'judges', summary: 'A prophetess and the only female judge of Israel, led victory over Sisera\'s army.', keyPassages: ['Judges 4:4-9', 'Judges 5'], relationships: [] },
  { id: 'gideon', name: 'Gideon', era: 'judges', summary: 'Called from threshing wheat in hiding to deliver Israel from Midian with a mere 300 men.', keyPassages: ['Judges 6:11-16', 'Judges 7:19-22'], relationships: [] },
  { id: 'samson', name: 'Samson', era: 'judges', summary: 'A Nazirite judge of immense strength undone by Delilah\'s betrayal; his final act destroyed a Philistine temple.', keyPassages: ['Judges 13:5', 'Judges 16:4-30'], relationships: [] },
  { id: 'ruth', name: 'Ruth', era: 'judges', summary: 'A Moabite widow whose loyalty to Naomi and marriage to Boaz placed her in the lineage of David and Christ.', keyPassages: ['Ruth 1:16-17', 'Ruth 4:13-17', 'Matthew 1:5'], relationships: [{ kind: 'spouse-of', targetId: 'boaz' }], placeIds: ['bethlehem'] },
  { id: 'naomi', name: 'Naomi', era: 'judges', summary: 'Ruth\'s mother-in-law, whose bitterness in loss turned to blessing through Ruth and Boaz.', keyPassages: ['Ruth 1:20-21', 'Ruth 4:16-17'], relationships: [] },
  { id: 'boaz', name: 'Boaz', era: 'judges', summary: 'A kinsman-redeemer of Bethlehem who married Ruth; great-grandfather of David.', keyPassages: ['Ruth 2:1', 'Ruth 4:9-10'], relationships: [{ kind: 'spouse-of', targetId: 'ruth' }], placeIds: ['bethlehem'] },
  { id: 'samuel', name: 'Samuel', era: 'united-monarchy', summary: 'Last judge and a prophet from childhood, anointed both Saul and David as king.', keyPassages: ['1 Samuel 3:1-10', '1 Samuel 10:1', '1 Samuel 16:13'], relationships: [{ kind: 'anointed', targetId: 'saul' }, { kind: 'anointed', targetId: 'david' }] },
  { id: 'saul', name: 'Saul', era: 'united-monarchy', summary: 'Israel\'s first king, initially humble but undone by disobedience and jealousy of David.', keyPassages: ['1 Samuel 10:20-24', '1 Samuel 15:22-23', '1 Samuel 31'], relationships: [{ kind: 'ruled', targetId: 'kingdom-of-israel' }, { kind: 'opposed', targetId: 'david' }] },
  { id: 'david', name: 'David', era: 'united-monarchy', summary: 'Shepherd, giant-slayer, and Israel\'s greatest king; "a man after God\'s own heart," ancestor of the Messiah.', keyPassages: ['1 Samuel 16:11-13', '1 Samuel 17', '2 Samuel 7:12-16', 'Acts 13:22'], relationships: [{ kind: 'spouse-of', targetId: 'bathsheba' }, { kind: 'father-of', targetId: 'solomon' }, { kind: 'ruled', targetId: 'kingdom-of-israel' }], placeIds: ['bethlehem', 'jerusalem', 'hebron'] },
  { id: 'bathsheba', name: 'Bathsheba', era: 'united-monarchy', summary: 'Wife of Uriah taken by David in his sin; later mother of Solomon.', keyPassages: ['2 Samuel 11:2-5', '2 Samuel 12:24'], relationships: [{ kind: 'spouse-of', targetId: 'david' }, { kind: 'mother-of', targetId: 'solomon' }] },
  { id: 'solomon', name: 'Solomon', era: 'united-monarchy', summary: 'David\'s son, granted wisdom above all, built the temple in Jerusalem; his heart later turned after foreign wives.', keyPassages: ['1 Kings 3:9-12', '1 Kings 6', '1 Kings 11:4'], relationships: [{ kind: 'descendant-of', targetId: 'david' }, { kind: 'ruled', targetId: 'kingdom-of-israel' }], placeIds: ['jerusalem'] },
  { id: 'elijah', name: 'Elijah', era: 'divided-monarchy', summary: 'Prophet who confronted Ahab and the prophets of Baal on Carmel; taken up to heaven in a whirlwind.', keyPassages: ['1 Kings 17:1', '1 Kings 18:36-39', '2 Kings 2:11'], relationships: [{ kind: 'mentored', targetId: 'elisha' }, { kind: 'opposed', targetId: 'ahab' }] },
  { id: 'ahab', name: 'Ahab', era: 'divided-monarchy', summary: 'King of Israel who married Jezebel and led the nation into Baal worship, opposed by Elijah.', keyPassages: ['1 Kings 16:30-33', '1 Kings 21:25'], relationships: [{ kind: 'ruled', targetId: 'kingdom-of-israel' }] },
  { id: 'elisha', name: 'Elisha', era: 'divided-monarchy', summary: 'Elijah\'s successor, received a double portion of his spirit and performed many miracles.', keyPassages: ['2 Kings 2:9-14', '2 Kings 5:1-14'], relationships: [{ kind: 'mentored', targetId: 'elijah', note: 'Elijah\'s disciple and successor' }] },
  { id: 'isaiah', name: 'Isaiah', era: 'divided-monarchy', summary: 'A prophet of Judah who saw the Lord high and lifted up; foretold the suffering Servant and the coming Messiah.', keyPassages: ['Isaiah 6:1-8', 'Isaiah 53', 'Isaiah 9:6'], relationships: [{ kind: 'prophet-to', targetId: 'kingdom-of-judah' }] },
  { id: 'jeremiah', name: 'Jeremiah', era: 'divided-monarchy', summary: 'The "weeping prophet," warned Judah of coming exile and wrote of a new covenant written on the heart.', keyPassages: ['Jeremiah 1:4-10', 'Jeremiah 29:11', 'Jeremiah 31:31-33'], relationships: [{ kind: 'prophet-to', targetId: 'kingdom-of-judah' }] },
  { id: 'ezekiel', name: 'Ezekiel', era: 'exile', summary: 'A priest-prophet among the exiles in Babylon, saw the valley of dry bones and the glory departing and returning.', keyPassages: ['Ezekiel 1:1', 'Ezekiel 37:1-14'], relationships: [{ kind: 'prophet-to', targetId: 'kingdom-of-judah' }], placeIds: ['babylon'] },
  { id: 'daniel', name: 'Daniel', era: 'exile', summary: 'A Judean noble exiled to Babylon, remained faithful through the lions\' den and interpreted kings\' dreams.', keyPassages: ['Daniel 1:8', 'Daniel 6:16-23', 'Daniel 9:20-27'], relationships: [], placeIds: ['babylon'] },
  { id: 'esther', name: 'Esther', era: 'exile', summary: 'A Jewish queen of Persia who risked her life to save her people from Haman\'s plot.', keyPassages: ['Esther 4:14', 'Esther 7:3-6'], relationships: [{ kind: 'served', targetId: 'mordecai' }], placeIds: ['susa'] },
  { id: 'mordecai', name: 'Mordecai', era: 'exile', summary: 'Esther\'s cousin and guardian, uncovered a plot against the king and was honored in Haman\'s place.', keyPassages: ['Esther 2:5-7', 'Esther 6:10-11'], relationships: [] },
  { id: 'ezra', name: 'Ezra', era: 'return', summary: 'A priest and scribe who led a return from exile and taught the returned people the Law.', keyPassages: ['Ezra 7:6-10', 'Nehemiah 8:1-8'], relationships: [], placeIds: ['jerusalem', 'babylon'] },
  { id: 'nehemiah', name: 'Nehemiah', era: 'return', summary: 'Cupbearer to a Persian king who rebuilt Jerusalem\'s walls against fierce opposition.', keyPassages: ['Nehemiah 1:3-4', 'Nehemiah 6:15-16'], relationships: [], placeIds: ['jerusalem'] },
  { id: 'mary', name: 'Mary', altNames: ['Mary of Nazareth'], era: 'gospels', summary: 'The virgin chosen to bear the Son of God; her song of praise (the Magnificat) echoes Hannah\'s.', keyPassages: ['Luke 1:26-38', 'Luke 1:46-55', 'John 19:25-27'], relationships: [{ kind: 'mother-of', targetId: 'jesus' }], placeIds: ['nazareth', 'bethlehem'] },
  { id: 'john-baptist', name: 'John the Baptist', era: 'gospels', summary: 'The forerunner who prepared the way in the wilderness and baptized Jesus in the Jordan.', keyPassages: ['Luke 1:13-17', 'Matthew 3:1-6', 'John 1:29'], relationships: [{ kind: 'served', targetId: 'jesus', note: 'prepared the way for the Messiah' }] },
  { id: 'jesus', name: 'Jesus', altNames: ['Jesus Christ', 'Yeshua', 'the Messiah'], era: 'gospels', summary: 'The eternal Word made flesh; lived, taught, was crucified, and rose again for the salvation of the world.', keyPassages: ['John 1:1-14', 'Luke 2:1-7', 'Matthew 27-28', '1 Corinthians 15:3-4'], relationships: [{ kind: 'mentored', targetId: 'peter' }, { kind: 'mentored', targetId: 'john-apostle' }], placeIds: ['nazareth', 'bethlehem', 'capernaum', 'jerusalem', 'gethsemane', 'golgotha'] },
  { id: 'peter', name: 'Peter', altNames: ['Simon Peter', 'Cephas'], era: 'gospels', summary: 'A fisherman called to be a disciple, confessed Jesus as the Christ, denied Him three times, and later led the early church.', keyPassages: ['Matthew 16:16-18', 'Luke 22:54-62', 'Acts 2:14-41'], relationships: [{ kind: 'sibling-of', targetId: 'andrew' }, { kind: 'betrayed', targetId: 'jesus', note: 'denied Christ three times, then was restored' }], placeIds: ['capernaum'] },
  { id: 'andrew', name: 'Andrew', era: 'gospels', summary: 'Peter\'s brother, a disciple of John the Baptist who first followed Jesus and brought Peter to Him.', keyPassages: ['John 1:40-42'], relationships: [{ kind: 'sibling-of', targetId: 'peter' }] },
  { id: 'james-apostle', name: 'James (son of Zebedee)', era: 'gospels', summary: 'One of the twelve, part of Jesus\' inner circle; the first apostle martyred.', keyPassages: ['Mark 1:19-20', 'Acts 12:1-2'], relationships: [{ kind: 'sibling-of', targetId: 'john-apostle' }] },
  { id: 'john-apostle', name: 'John', altNames: ['John the Apostle'], era: 'gospels', summary: 'The "beloved disciple," wrote a Gospel, three epistles, and Revelation.', keyPassages: ['John 13:23', 'John 19:26-27', 'Revelation 1:1'], relationships: [{ kind: 'sibling-of', targetId: 'james-apostle' }] },
  { id: 'matthew', name: 'Matthew', altNames: ['Levi'], era: 'gospels', summary: 'A tax collector called to follow Jesus; traditionally credited with the first Gospel.', keyPassages: ['Matthew 9:9-13'], relationships: [] },
  { id: 'mary-magdalene', name: 'Mary Magdalene', era: 'gospels', summary: 'Delivered of seven demons, she followed Jesus faithfully and was the first witness of the resurrection.', keyPassages: ['Luke 8:1-2', 'John 20:11-18'], relationships: [] },
  { id: 'martha', name: 'Martha', era: 'gospels', summary: 'Sister of Mary and Lazarus of Bethany; confessed Jesus as the Christ before Lazarus was raised.', keyPassages: ['Luke 10:38-42', 'John 11:21-27'], relationships: [{ kind: 'sibling-of', targetId: 'lazarus' }] },
  { id: 'lazarus', name: 'Lazarus', era: 'gospels', summary: 'Friend of Jesus raised from the dead after four days in the tomb at Bethany.', keyPassages: ['John 11:1-44'], relationships: [{ kind: 'sibling-of', targetId: 'martha' }] },
  { id: 'paul', name: 'Paul', altNames: ['Saul of Tarsus'], era: 'apostolic', summary: 'A zealous persecutor of the church transformed by an encounter with the risen Christ on the road to Damascus; wrote most of the New Testament epistles.', keyPassages: ['Acts 9:1-19', 'Romans 1:1', 'Galatians 1:15-16'], relationships: [{ kind: 'mentored', targetId: 'timothy' }, { kind: 'served', targetId: 'barnabas', note: 'partnered on the first missionary journey' }], placeIds: ['damascus', 'antioch', 'ephesus', 'corinth', 'rome'] },
  { id: 'barnabas', name: 'Barnabas', era: 'apostolic', summary: '"Son of encouragement," vouched for Paul to the apostles and partnered with him in the Gentile mission.', keyPassages: ['Acts 4:36-37', 'Acts 9:27', 'Acts 13:2-3'], relationships: [] },
  { id: 'timothy', name: 'Timothy', era: 'apostolic', summary: 'A young pastor mentored by Paul, raised in the faith by his mother Eunice and grandmother Lois.', keyPassages: ['Acts 16:1-3', '2 Timothy 1:5', '1 Timothy 4:12'], relationships: [{ kind: 'mentored', targetId: 'paul', note: 'Paul\'s disciple, "true son in the faith"' }] },
];

export const PLACES: Place[] = [
  { id: 'kingdom-of-israel', name: 'Kingdom of Israel', region: 'Levant', summary: 'The united monarchy under Saul, David, and Solomon; after Solomon\'s death, the name for the northern ten tribes.', keyPassages: ['1 Samuel 11:15', '1 Kings 12:16-20'] },
  { id: 'kingdom-of-judah', name: 'Kingdom of Judah', region: 'Levant', summary: 'The southern kingdom of two tribes, ruled from Jerusalem, after the division following Solomon.', keyPassages: ['1 Kings 12:21-24'] },
  { id: 'eden', name: 'Eden', region: 'Mesopotamia (traditional)', summary: 'The garden planted by God as the first home of humanity.', keyPassages: ['Genesis 2:8-14'] },
  { id: 'ararat', name: 'Mountains of Ararat', modernName: 'Eastern Turkey', region: 'Armenian Highlands', summary: 'Where Noah\'s ark came to rest as the floodwaters receded.', keyPassages: ['Genesis 8:4'], lat: 39.7, lon: 44.3 },
  { id: 'ur', name: 'Ur of the Chaldeans', modernName: 'Tell el-Muqayyar, Iraq', region: 'Mesopotamia', summary: 'Abraham\'s birthplace, from which God called him to Canaan.', keyPassages: ['Genesis 11:31', 'Genesis 15:7'], lat: 30.9, lon: 46.1 },
  { id: 'haran', name: 'Haran', modernName: 'Harran, Turkey', region: 'Upper Mesopotamia', summary: 'Where Abraham\'s family settled en route to Canaan, and where Jacob later fled and married.', keyPassages: ['Genesis 11:31', 'Genesis 29:4-5'], lat: 36.9, lon: 39.0 },
  { id: 'canaan', name: 'Canaan', region: 'Levant', summary: 'The land promised to Abraham\'s descendants, later called Israel.', keyPassages: ['Genesis 12:5', 'Genesis 15:18-21'] },
  { id: 'bethel', name: 'Bethel', modernName: 'Beitin, West Bank', region: 'Central Israel', summary: '"House of God" — where Jacob dreamed of the ladder to heaven.', keyPassages: ['Genesis 28:10-19'], lat: 31.93, lon: 35.22 },
  { id: 'hebron', name: 'Hebron', region: 'Judean Hills', summary: 'Where Abraham purchased a burial cave for Sarah; David\'s first capital.', keyPassages: ['Genesis 23:17-20', '2 Samuel 5:1-5'], lat: 31.53, lon: 35.10 },
  { id: 'egypt', name: 'Egypt', region: 'North Africa', summary: 'Where Joseph rose to power and Israel later multiplied — and was enslaved — before the Exodus.', keyPassages: ['Genesis 41:41', 'Exodus 1:8-14'] },
  { id: 'sinai', name: 'Mount Sinai', altNames: ['Horeb'], region: 'Sinai Peninsula', summary: 'Where Moses received the Ten Commandments and the covenant Law.', keyPassages: ['Exodus 19:1-6', 'Exodus 20'], lat: 28.54, lon: 33.98 },
  { id: 'kadesh-barnea', name: 'Kadesh Barnea', region: 'Northeastern Sinai', summary: 'Israel\'s base camp where the spies\' report led to forty years of wandering.', keyPassages: ['Numbers 13:26', 'Numbers 14:33-34'], lat: 30.69, lon: 34.42 },
  { id: 'jericho', name: 'Jericho', region: 'Jordan Valley', summary: 'The fortified city whose walls fell after Israel marched around it seven times.', keyPassages: ['Joshua 6:1-20'], lat: 31.87, lon: 35.44 },
  { id: 'bethlehem', name: 'Bethlehem', altNames: ['Ephrathah'], region: 'Judean Hills', summary: 'Ruth and Boaz\'s home, David\'s birthplace, and where Christ was born.', keyPassages: ['Ruth 1:19', '1 Samuel 16:1', 'Micah 5:2', 'Luke 2:4-7'], lat: 31.70, lon: 35.20 },
  { id: 'jerusalem', name: 'Jerusalem', altNames: ['Zion', 'the City of David'], region: 'Judean Hills', summary: 'David\'s capital, site of Solomon\'s temple, and where Christ was crucified and rose again.', keyPassages: ['2 Samuel 5:6-9', '1 Kings 8', 'Luke 24:1-7'], lat: 31.78, lon: 35.23 },
  { id: 'nazareth', name: 'Nazareth', region: 'Galilee', summary: 'The obscure Galilean town where Jesus grew up.', keyPassages: ['Luke 1:26', 'Luke 2:39-40', 'John 1:46'], lat: 32.70, lon: 35.30 },
  { id: 'capernaum', name: 'Capernaum', region: 'Sea of Galilee', summary: 'Jesus\' base of ministry in Galilee, home to Peter and Andrew.', keyPassages: ['Matthew 4:13', 'Mark 1:21-29'], lat: 32.88, lon: 35.57 },
  { id: 'babylon', name: 'Babylon', modernName: 'Al-Hillah, Iraq', region: 'Mesopotamia', summary: 'The empire that conquered Judah and exiled its people; where Daniel and Ezekiel ministered.', keyPassages: ['2 Kings 25:1-21', 'Daniel 1:1-2', 'Psalm 137:1'], lat: 32.54, lon: 44.42 },
  { id: 'susa', name: 'Susa', modernName: 'Shush, Iran', region: 'Persia', summary: 'The Persian capital where Esther became queen and saved her people.', keyPassages: ['Esther 1:2', 'Esther 8:15'], lat: 32.19, lon: 48.26 },
  { id: 'damascus', name: 'Damascus', region: 'Syria', summary: 'Where Saul of Tarsus, en route to persecute the church, was confronted by the risen Christ.', keyPassages: ['Acts 9:1-9'], lat: 33.51, lon: 36.29 },
  { id: 'gethsemane', name: 'Gethsemane', region: 'Mount of Olives, Jerusalem', summary: 'The garden where Jesus prayed in agony before His arrest.', keyPassages: ['Matthew 26:36-46'], lat: 31.78, lon: 35.24 },
  { id: 'golgotha', name: 'Golgotha', altNames: ['Calvary'], region: 'Jerusalem', summary: '"The place of a skull" — where Jesus was crucified.', keyPassages: ['Matthew 27:33', 'John 19:17-18'], lat: 31.78, lon: 35.23 },
  { id: 'antioch', name: 'Antioch', modernName: 'Antakya, Turkey', region: 'Syria', summary: 'Where believers were first called Christians; the sending church for Paul\'s missionary journeys.', keyPassages: ['Acts 11:25-26', 'Acts 13:1-3'], lat: 36.20, lon: 36.16 },
  { id: 'ephesus', name: 'Ephesus', region: 'Asia Minor (Turkey)', summary: 'Major city where Paul ministered for two years; recipient of one of his epistles and one of the seven letters in Revelation.', keyPassages: ['Acts 19:1-10', 'Ephesians 1:1', 'Revelation 2:1-7'], lat: 37.94, lon: 27.34 },
  { id: 'corinth', name: 'Corinth', region: 'Greece', summary: 'A cosmopolitan Greek city where Paul planted a church and later wrote to correct its divisions.', keyPassages: ['Acts 18:1-11', '1 Corinthians 1:10-13'], lat: 37.94, lon: 22.93 },
  { id: 'rome', name: 'Rome', region: 'Italy', summary: 'Capital of the empire; Paul wrote to the church there and was ultimately imprisoned and martyred in the city.', keyPassages: ['Romans 1:7', 'Acts 28:16'], lat: 41.90, lon: 12.50 },
];

export function findPerson(id: string): Person | undefined {
  return PEOPLE.find((person) => person.id === id);
}

export function findPlace(id: string): Place | undefined {
  return PLACES.find((place) => place.id === id);
}

// Relationships are stored one-directional on the source person; this finds
// anyone who names `id` as their target so the graph reads both ways.
export function incomingRelationships(id: string): Array<{ person: Person; relationship: PersonRelationship }> {
  const results: Array<{ person: Person; relationship: PersonRelationship }> = [];
  for (const person of PEOPLE) {
    for (const relationship of person.relationships) {
      if (relationship.targetId === id) results.push({ person, relationship });
    }
  }
  return results;
}

export function placesForPerson(person: Person): Place[] {
  return (person.placeIds || []).map(findPlace).filter((place): place is Place => Boolean(place));
}

export function peopleForPlace(placeId: string): Person[] {
  return PEOPLE.filter((person) => (person.placeIds || []).includes(placeId));
}
