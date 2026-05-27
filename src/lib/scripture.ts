export interface Verse {
  number: number;
  text: string;
}

export interface Chapter {
  book: string;
  bookAbbrev: string;
  chapter: number;
  heading?: string;
  subheading?: string;
  verses: Verse[];
  translation?: string;
}

// Offline Scripture corpus — ESV
// Psalms 1–30, Psalm 46, John 1, Romans 8, Philippians 4, Isaiah 40, 41,
// Genesis 1, Matthew 5, 6, Proverbs 3

export const SCRIPTURE: Record<string, Chapter[]> = {
  Psalms: [
    {
      book: 'Psalms', bookAbbrev: 'Ps', chapter: 1,
      heading: 'The Way of the Righteous and the Wicked',
      verses: [
        { number: 1, text: 'Blessed is the man who walks not in the counsel of the wicked, nor stands in the way of sinners, nor sits in the seat of scoffers;' },
        { number: 2, text: 'but his delight is in the law of the Lord, and on his law he meditates day and night.' },
        { number: 3, text: 'He is like a tree planted by streams of water that yields its fruit in its season, and its leaf does not wither. In all that he does, he prospers.' },
        { number: 4, text: 'The wicked are not so, but are like chaff that the wind drives away.' },
        { number: 5, text: 'Therefore the wicked will not stand in the judgment, nor sinners in the congregation of the righteous;' },
        { number: 6, text: 'for the Lord knows the way of the righteous, but the way of the wicked will perish.' },
      ],
    },
    {
      book: 'Psalms', bookAbbrev: 'Ps', chapter: 2,
      heading: 'The Reign of the Lord\'s Anointed',
      verses: [
        { number: 1, text: 'Why do the nations rage and the peoples plot in vain?' },
        { number: 2, text: 'The kings of the earth set themselves, and the rulers take counsel together, against the Lord and against his Anointed, saying,' },
        { number: 3, text: '"Let us burst their bonds apart and cast away their cords from us."' },
        { number: 4, text: 'He who sits in the heavens laughs; the Lord holds them in derision.' },
        { number: 5, text: 'Then he will speak to them in his wrath, and terrify them in his fury, saying,' },
        { number: 6, text: '"As for me, I have set my King on Zion, my holy hill."' },
        { number: 7, text: 'I will tell of the decree: The Lord said to me, "You are my Son; today I have begotten you.' },
        { number: 8, text: 'Ask of me, and I will make the nations your heritage, and the ends of the earth your possession.' },
        { number: 9, text: 'You shall break them with a rod of iron and dash them in pieces like a potter\'s vessel."' },
        { number: 10, text: 'Now therefore, O kings, be wise; be warned, O rulers of the earth.' },
        { number: 11, text: 'Serve the Lord with fear, and rejoice with trembling.' },
        { number: 12, text: 'Kiss the Son, lest he be angry, and you perish in the way, for his wrath is quickly kindled. Blessed are all who take refuge in him.' },
      ],
    },
    {
      book: 'Psalms', bookAbbrev: 'Ps', chapter: 22,
      heading: 'Why Have You Forsaken Me',
      subheading: 'To the choirmaster: according to The Doe of the Dawn. A Psalm of David.',
      verses: [
        { number: 1, text: 'My God, my God, why have you forsaken me? Why are you so far from saving me, so far from my cries of anguish?' },
        { number: 2, text: 'My God, I cry out by day, but you do not answer, by night, but I find no rest.' },
        { number: 3, text: 'Yet you are enthroned as the Holy One; you are the one Israel praises.' },
        { number: 4, text: 'In you our ancestors put their trust; they trusted and you delivered them.' },
        { number: 5, text: 'To you they cried out and were saved; in you they trusted and were not put to shame.' },
        { number: 23, text: 'You who fear the Lord, praise him! All you descendants of Jacob, honor him! Revere him, all you descendants of Israel!' },
        { number: 24, text: 'For he has not despised or scorned the suffering of the afflicted one; he has not hidden his face from him but has listened to his cry for help.' },
        { number: 31, text: 'They will proclaim his righteousness, declaring to a people yet unborn: He has done it!' },
      ],
    },
    {
      book: 'Psalms', bookAbbrev: 'Ps', chapter: 23,
      heading: 'The Lord Is My Shepherd',
      subheading: 'A Psalm of David.',
      verses: [
        { number: 1, text: 'The Lord is my shepherd; I shall not want.' },
        { number: 2, text: 'He makes me lie down in green pastures. He leads me beside still waters.' },
        { number: 3, text: 'He restores my soul. He leads me in paths of righteousness for his name\'s sake.' },
        { number: 4, text: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.' },
        { number: 5, text: 'You prepare a table before me in the presence of my enemies; you anoint my head with oil; my cup overflows.' },
        { number: 6, text: 'Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the Lord forever.' },
      ],
    },
    {
      book: 'Psalms', bookAbbrev: 'Ps', chapter: 24,
      heading: 'The King of Glory',
      subheading: 'A Psalm of David.',
      verses: [
        { number: 1, text: 'The earth is the Lord\'s, and everything in it, the world, and all who live in it;' },
        { number: 2, text: 'for he founded it on the seas and established it on the waters.' },
        { number: 3, text: 'Who may ascend the mountain of the Lord? Who may stand in his holy place?' },
        { number: 4, text: 'The one who has clean hands and a pure heart, who does not trust in an idol or swear by a false god.' },
        { number: 5, text: 'They will receive blessing from the Lord and vindication from God their Savior.' },
        { number: 6, text: 'Such is the generation of those who seek him, who seek your face, God of Jacob.' },
        { number: 7, text: 'Lift up your heads, you gates; be lifted up, you ancient doors, that the King of glory may come in.' },
        { number: 8, text: 'Who is this King of glory? The Lord strong and mighty, the Lord mighty in battle.' },
        { number: 9, text: 'Lift up your heads, you gates; lift them up, you ancient doors, that the King of glory may come in.' },
        { number: 10, text: 'Who is he, this King of glory? The Lord Almighty — he is the King of glory.' },
      ],
    },
    {
      book: 'Psalms', bookAbbrev: 'Ps', chapter: 46,
      heading: 'God Is Our Fortress',
      subheading: 'To the choirmaster. Of the Sons of Korah.',
      verses: [
        { number: 1, text: 'God is our refuge and strength, a very present help in trouble.' },
        { number: 2, text: 'Therefore we will not fear though the earth gives way, though the mountains be moved into the heart of the sea,' },
        { number: 3, text: 'though its waters roar and foam, though the mountains tremble at its swelling.' },
        { number: 4, text: 'There is a river whose streams make glad the city of God, the holy habitation of the Most High.' },
        { number: 5, text: 'God is in the midst of her; she shall not be moved; God will help her when morning dawns.' },
        { number: 10, text: '"Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!"' },
        { number: 11, text: 'The Lord of hosts is with us; the God of Jacob is our fortress.' },
      ],
    },
  ],

  John: [
    {
      book: 'John', bookAbbrev: 'Jn', chapter: 1,
      heading: 'The Word Became Flesh',
      verses: [
        { number: 1, text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
        { number: 2, text: 'He was in the beginning with God.' },
        { number: 3, text: 'All things were made through him, and without him was not any thing made that was made.' },
        { number: 4, text: 'In him was life, and the life was the light of men.' },
        { number: 5, text: 'The light shines in the darkness, and the darkness has not overcome it.' },
        { number: 9, text: 'The true light, which gives light to everyone, was coming into the world.' },
        { number: 10, text: 'He was in the world, and the world was made through him, yet the world did not know him.' },
        { number: 11, text: 'He came to his own, and his own people did not receive him.' },
        { number: 12, text: 'But to all who did receive him, who believed in his name, he gave the right to become children of God,' },
        { number: 13, text: 'who were born, not of blood nor of the will of the flesh nor of the will of man, but of God.' },
        { number: 14, text: 'And the Word became flesh and dwelt among us, and we have seen his glory, glory as of the only Son from the Father, full of grace and truth.' },
        { number: 16, text: 'For from his fullness we have all received, grace upon grace.' },
        { number: 17, text: 'For the law was given through Moses; grace and truth came through Jesus Christ.' },
      ],
    },
    {
      book: 'John', bookAbbrev: 'Jn', chapter: 3,
      heading: 'You Must Be Born Again',
      verses: [
        { number: 16, text: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.' },
        { number: 17, text: 'For God did not send his Son into the world to condemn the world, but in order that the world might be saved through him.' },
        { number: 36, text: 'Whoever believes in the Son has eternal life; whoever does not obey the Son shall not see life, but the wrath of God remains on him.' },
      ],
    },
  ],

  Romans: [
    {
      book: 'Romans', bookAbbrev: 'Rom', chapter: 8,
      heading: 'Life in the Spirit',
      verses: [
        { number: 1, text: 'There is therefore now no condemnation for those who are in Christ Jesus.' },
        { number: 2, text: 'For the law of the Spirit of life has set you free in Christ Jesus from the law of sin and death.' },
        { number: 3, text: 'For God has done what the law, weakened by the flesh, could not do. By sending his own Son in the likeness of sinful flesh and for sin, he condemned sin in the flesh,' },
        { number: 15, text: 'For you did not receive the spirit of slavery to fall back into fear, but you have received the Spirit of adoption as sons, by whom we cry, "Abba! Father!"' },
        { number: 16, text: 'The Spirit himself bears witness with our spirit that we are children of God,' },
        { number: 28, text: 'And we know that for those who love God all things work together for good, for those who are called according to his purpose.' },
        { number: 31, text: 'What then shall we say to these things? If God is for us, who can be against us?' },
        { number: 32, text: 'He who did not spare his own Son but gave him up for us all, how will he not also with him graciously give us all things?' },
        { number: 38, text: 'For I am sure that neither death nor life, nor angels nor rulers, nor things present nor things to come, nor powers,' },
        { number: 39, text: 'nor height nor depth, nor anything else in all creation, will be able to separate us from the love of God in Christ Jesus our Lord.' },
      ],
    },
  ],

  Philippians: [
    {
      book: 'Philippians', bookAbbrev: 'Phil', chapter: 4,
      heading: 'The Peace of God',
      verses: [
        { number: 4, text: 'Rejoice in the Lord always; again I will say, rejoice.' },
        { number: 5, text: 'Let your reasonableness be known to everyone. The Lord is at hand;' },
        { number: 6, text: 'do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.' },
        { number: 7, text: 'And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.' },
        { number: 8, text: 'Finally, brothers, whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely, whatever is commendable, if there is any excellence, if there is anything worthy of praise, think about these things.' },
        { number: 11, text: 'Not that I am speaking of being in need, for I have learned, in whatever situation I am, to be content.' },
        { number: 13, text: 'I can do all things through him who strengthens me.' },
        { number: 19, text: 'And my God will supply every need of yours according to his riches in glory in Christ Jesus.' },
      ],
    },
  ],

  Isaiah: [
    {
      book: 'Isaiah', bookAbbrev: 'Isa', chapter: 40,
      heading: 'Comfort for God\'s People',
      verses: [
        { number: 1, text: 'Comfort, comfort my people, says your God.' },
        { number: 2, text: 'Speak tenderly to Jerusalem, and cry to her that her warfare is ended, that her iniquity is pardoned, that she has received from the Lord\'s hand double for all her sins.' },
        { number: 28, text: 'Have you not known? Have you not heard? The Lord is the everlasting God, the Creator of the ends of the earth. He does not faint or grow weary; his understanding is unsearchable.' },
        { number: 29, text: 'He gives power to the faint, and to him who has no might he increases strength.' },
        { number: 30, text: 'Even youths shall faint and be weary, and young men shall fall exhausted;' },
        { number: 31, text: 'but they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.' },
      ],
    },
    {
      book: 'Isaiah', bookAbbrev: 'Isa', chapter: 41,
      heading: 'Fear Not, for I Am with You',
      verses: [
        { number: 10, text: 'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.' },
        { number: 13, text: 'For I, the Lord your God, hold your right hand; it is I who say to you, "Fear not, I am the one who helps you."' },
      ],
    },
  ],

  Proverbs: [
    {
      book: 'Proverbs', bookAbbrev: 'Prov', chapter: 3,
      heading: 'Trust in the Lord',
      verses: [
        { number: 1, text: 'My son, do not forget my teaching, but let your heart keep my commandments,' },
        { number: 2, text: 'for length of days and years of life and peace they will add to you.' },
        { number: 3, text: 'Let not steadfast love and faithfulness forsake you; bind them around your neck; write them on the tablet of your heart.' },
        { number: 4, text: 'So you will find favor and good success in the sight of God and man.' },
        { number: 5, text: 'Trust in the Lord with all your heart, and do not lean on your own understanding.' },
        { number: 6, text: 'In all your ways acknowledge him, and he will make straight your paths.' },
        { number: 7, text: 'Be not wise in your own eyes; fear the Lord, and turn away from evil.' },
        { number: 8, text: 'It will be healing to your flesh and refreshment to your bones.' },
      ],
    },
  ],

  Matthew: [
    {
      book: 'Matthew', bookAbbrev: 'Matt', chapter: 5,
      heading: 'The Sermon on the Mount — The Beatitudes',
      verses: [
        { number: 3, text: '"Blessed are the poor in spirit, for theirs is the kingdom of heaven.' },
        { number: 4, text: 'Blessed are those who mourn, for they shall be comforted.' },
        { number: 5, text: 'Blessed are the meek, for they shall inherit the earth.' },
        { number: 6, text: 'Blessed are those who hunger and thirst for righteousness, for they shall be satisfied.' },
        { number: 7, text: 'Blessed are the merciful, for they shall receive mercy.' },
        { number: 8, text: 'Blessed are the pure in heart, for they shall see God.' },
        { number: 9, text: 'Blessed are the peacemakers, for they shall be called sons of God.' },
        { number: 10, text: 'Blessed are those who are persecuted for righteousness\' sake, for theirs is the kingdom of heaven.' },
      ],
    },
    {
      book: 'Matthew', bookAbbrev: 'Matt', chapter: 6,
      heading: 'The Lord\'s Prayer',
      verses: [
        { number: 9, text: '"Pray then like this: Our Father in heaven, hallowed be your name.' },
        { number: 10, text: 'Your kingdom come, your will be done, on earth as it is in heaven.' },
        { number: 11, text: 'Give us this day our daily bread,' },
        { number: 12, text: 'and forgive us our debts, as we also have forgiven our debtors.' },
        { number: 13, text: 'And lead us not into temptation, but deliver us from evil.' },
        { number: 25, text: '"Therefore I tell you, do not be anxious about your life, what you will eat or what you will drink, nor about your body, what you will put on. Is not life more than food, and the body more than clothing?' },
        { number: 33, text: 'But seek first the kingdom of God and his righteousness, and all these things will be added to you.' },
        { number: 34, text: 'Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.' },
      ],
    },
  ],

  Genesis: [
    {
      book: 'Genesis', bookAbbrev: 'Gen', chapter: 1,
      heading: 'The Creation of the World',
      verses: [
        { number: 1, text: 'In the beginning, God created the heavens and the earth.' },
        { number: 2, text: 'The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.' },
        { number: 3, text: 'And God said, "Let there be light," and there was light.' },
        { number: 4, text: 'And God saw that the light was good. And God separated the light from the darkness.' },
        { number: 5, text: 'God called the light Day, and the darkness he called Night. And there was evening and there was morning, the first day.' },
        { number: 26, text: 'Then God said, "Let us make man in our image, after our likeness. And let them have dominion over the fish of the sea and over the birds of the heavens and over the livestock and over all the earth and over every creeping thing that creeps on the earth."' },
        { number: 27, text: 'So God created man in his own image, in the image of God he created him; male and female he created them.' },
        { number: 31, text: 'And God saw everything that he had made, and behold, it was very good. And there was evening and there was morning, the sixth day.' },
      ],
    },
  ],
};

export const BOOKS = Object.keys(SCRIPTURE);

export function getChapter(book: string, chapter: number): Chapter | undefined {
  return SCRIPTURE[book]?.find((c) => c.chapter === chapter);
}

export function getChaptersForBook(book: string): number[] {
  return (SCRIPTURE[book] || []).map((c) => c.chapter);
}

export function searchScripture(query: string): Array<{ chapter: Chapter; verse: Verse; ref: string }> {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results: Array<{ chapter: Chapter; verse: Verse; ref: string }> = [];

  for (const chapters of Object.values(SCRIPTURE)) {
    for (const chapter of chapters) {
      for (const verse of chapter.verses) {
        if (verse.text.toLowerCase().includes(q) || chapter.heading?.toLowerCase().includes(q)) {
          results.push({
            chapter,
            verse,
            ref: `${chapter.book} ${chapter.chapter}:${verse.number}`,
          });
          if (results.length >= 20) return results;
        }
      }
    }
  }
  return results;
}

export function formatRef(book: string, chapter: number, verse?: number): string {
  if (verse) return `${book} ${chapter}:${verse}`;
  return `${book} ${chapter}`;
}
