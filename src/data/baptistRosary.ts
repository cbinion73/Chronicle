// The Baptist Rosary — a Protestant prayer-bead sequence of 68 beads: an opening
// crucifix, large "framing" beads, and five decades of ten small beads each,
// mirroring the physical bead strand bead-for-bead so a user can follow along
// with actual beads in hand.

export type RosaryBead = {
  /** 1-based position across the whole strand. */
  index: number;
  beadType: 'crucifix' | 'large' | 'small';
  /** Section this bead belongs to, e.g. "First Decade (Thanksgiving)". */
  section: string;
  /** Only set on the first bead of a section — the framing instruction for that section. */
  instruction?: string;
  /** e.g. "Bead 3 of 10" within a decade, or undefined for singleton beads. */
  positionLabel?: string;
  title: string;
  scriptureRef: string;
  scriptureText: string;
  /** Some Scripture-meditation beads have no separate prayer line — just the verse to sit with. */
  prayerText?: string;
};

function decade(
  section: string,
  instruction: string,
  items: Array<{ ref: string; text: string; prayer?: string }>,
): Omit<RosaryBead, 'index'>[] {
  return items.map((item, i) => ({
    beadType: 'small' as const,
    section,
    instruction: i === 0 ? instruction : undefined,
    positionLabel: `Bead ${i + 1} of ${items.length}`,
    title: section,
    scriptureRef: item.ref,
    scriptureText: item.text,
    prayerText: item.prayer,
  }));
}

const raw: Omit<RosaryBead, 'index'>[] = [
  {
    beadType: 'crucifix',
    section: 'Crucifix',
    title: 'Crucifix — Opening Prayer of Praise',
    instruction: 'Enter into God’s presence with thanksgiving, dedicating this time to honor Him.',
    scriptureRef: 'Psalm 100:4',
    scriptureText: 'Enter His gates with thanksgiving and His courts with praise; give thanks to Him and bless His name.',
    prayerText: 'Lord, I come into Your presence with gratitude, and with a heart full of praise. You are holy, merciful, and worthy of all honor, and I thank You for the privilege of drawing near to You.',
  },
  {
    beadType: 'large',
    section: 'Large Bead Above the Crucifix',
    title: 'Large Bead Above the Crucifix — Dedication and Praise for God’s Holiness',
    instruction: 'Begin with a focus on God’s holiness and commit this prayer time to Him.',
    scriptureRef: 'Psalm 145:3',
    scriptureText: 'Great is the Lord, and highly to be praised; and His greatness is unsearchable.',
    prayerText: 'God, You are holy, mighty, and faithful. I praise You for Your unchanging nature and Your wisdom and mercy toward me.',
  },
  {
    beadType: 'small',
    section: '3 Small Beads — Faith, Hope, and Love',
    title: '3 Small Beads — Faith, Hope, and Love',
    instruction: 'Reflect on these central virtues in the Christian life, inviting God to strengthen each one in your heart.',
    positionLabel: 'Bead 1 of 3',
    scriptureRef: '1 Corinthians 13:13',
    scriptureText: 'But now faith, hope, love, abide these three; but the greatest of these is love.',
    prayerText: 'Lord, increase my faith in You, help me place my hope in Your promises, and let Your love fill my heart.',
  },
  {
    beadType: 'small',
    section: '3 Small Beads — Faith, Hope, and Love',
    title: '3 Small Beads — Faith, Hope, and Love',
    positionLabel: 'Bead 2 of 3',
    scriptureRef: 'Hebrews 11:1',
    scriptureText: 'Now faith is the assurance of things hoped for, the conviction of things not seen.',
    prayerText: 'Strengthen my faith, Lord, that I may trust in Your plans even when I cannot see them.',
  },
  {
    beadType: 'small',
    section: '3 Small Beads — Faith, Hope, and Love',
    title: '3 Small Beads — Faith, Hope, and Love',
    positionLabel: 'Bead 3 of 3',
    scriptureRef: 'Romans 5:5',
    scriptureText: 'And hope does not disappoint, because the love of God has been poured out within our hearts.',
    prayerText: 'Fill me with Your hope and love, reminding me of Your constant presence and faithfulness.',
  },
  {
    beadType: 'large',
    section: 'Large Bead',
    title: 'Large Bead — Praise for God’s Character',
    instruction: 'Acknowledge God’s attributes, praising Him for His goodness and steadfastness.',
    scriptureRef: 'Psalm 136:1',
    scriptureText: 'Give thanks to the Lord, for He is good, for His steadfast love endures forever.',
    prayerText: 'Lord, You are good, just, and loving. I praise You for Your unchanging nature and Your faithfulness in all things.',
  },
  {
    beadType: 'large',
    section: 'Large Bead Where the Necklace Splits',
    title: 'Large Bead Where the Necklace Splits — Surrender and Guidance',
    instruction: 'Use this bead as a moment to surrender yourself fully to God, asking Him to guide and sustain you through the prayer and beyond.',
    scriptureRef: 'Proverbs 3:5-6',
    scriptureText: 'Trust in the Lord with all your heart and lean not on your own understanding. In all your ways acknowledge Him, and He will make your paths straight.',
    prayerText: 'Lord, as I enter this time of focused prayer, I surrender my heart, mind, and will to You. Help me to trust in Your wisdom and to lean not on my own understanding. Guide my thoughts and direct my steps, both in this time of prayer and throughout my life. I seek to honor You in all I do, and I ask that You shape me according to Your purpose. Amen.',
  },
  ...decade('First Decade (Thanksgiving)', 'Express gratitude to God, reflecting on specific blessings with each bead.', [
    { ref: '1 Thessalonians 5:18', text: 'In everything give thanks; for this is God’s will for you in Christ Jesus.', prayer: 'Thank You, Lord, for the gift of life.' },
    { ref: 'Psalm 118:1', text: 'Give thanks to the Lord, for He is good; for His lovingkindness is everlasting.', prayer: 'Thank You for Your love and mercy.' },
    { ref: 'James 1:17', text: 'Every good thing given and every perfect gift is from above.', prayer: 'Thank You for my family and friends.' },
    { ref: 'Colossians 3:17', text: 'Whatever you do in word or deed, do all in the name of the Lord Jesus, giving thanks.', prayer: 'Thank You for my health and strength.' },
    { ref: 'Psalm 107:1', text: 'Oh give thanks to the Lord, for He is good, for His steadfast love endures forever!', prayer: 'Thank You for the provision of daily needs.' },
    { ref: 'Psalm 9:1', text: 'I will give thanks to the Lord with all my heart; I will tell of all Your wonders.', prayer: 'Thank You for the beauty of Your creation.' },
    { ref: 'Psalm 136:1', text: 'Give thanks to the Lord, for He is good, for His steadfast love endures forever.', prayer: 'Thank You for the salvation I have in Jesus.' },
    { ref: '1 Chronicles 16:34', text: 'O give thanks to the Lord, for He is good; for His lovingkindness is everlasting.', prayer: 'Thank You for guiding me through challenges.' },
    { ref: 'Lamentations 3:22-23', text: 'The Lord’s lovingkindnesses indeed never cease, for His compassions never fail. They are new every morning; great is Your faithfulness.', prayer: 'Thank You for Your unending faithfulness.' },
    { ref: 'Philippians 4:7', text: 'And the peace of God, which surpasses all comprehension, will guard your hearts and your minds in Christ Jesus.', prayer: 'Thank You for the peace that comes from knowing You.' },
  ]),
  {
    beadType: 'large',
    section: 'Large Bead',
    title: 'Large Bead — Confession and Repentance',
    instruction: 'Confess your sins and seek God’s forgiveness, committing to a clean heart.',
    scriptureRef: '1 John 1:9',
    scriptureText: 'If we confess our sins, He is faithful and righteous to forgive us our sins and to cleanse us from all unrighteousness.',
    prayerText: 'Lord, I come humbly, confessing my sins. Forgive me, cleanse my heart, and renew my spirit.',
  },
  ...decade('Second Decade (Scripture Meditation)', 'Meditate on the Word of God, letting it guide and shape your thoughts.', [
    { ref: 'Psalm 119:11', text: 'I have hidden Your word in my heart that I might not sin against You.' },
    { ref: 'Psalm 119:18', text: 'Open my eyes, that I may behold wonderful things from Your law.' },
    { ref: 'Psalm 119:33', text: 'Teach me, O Lord, the way of Your statutes, and I shall keep it to the end.' },
    { ref: 'Psalm 119:105', text: 'Your word is a lamp to my feet and a light to my path.' },
    { ref: 'Psalm 119:114', text: 'You are my hiding place and my shield; I wait for Your word.' },
    { ref: 'Psalm 119:130', text: 'The unfolding of Your words gives light; it gives understanding to the simple.' },
    { ref: 'Psalm 119:140', text: 'Your word is very pure, therefore Your servant loves it.' },
    { ref: 'Psalm 119:160', text: 'The sum of Your word is truth, and every one of Your righteous ordinances is everlasting.' },
    { ref: 'Psalm 119:165', text: 'Great peace have those who love Your law, and nothing causes them to stumble.' },
    { ref: 'Psalm 119:169', text: 'Let my cry come before You, O Lord; give me understanding according to Your word.' },
  ]),
  {
    beadType: 'large',
    section: 'Large Bead',
    title: 'Large Bead — Intercession for Others',
    instruction: 'Lift up others in prayer, asking for God’s blessing, guidance, and presence in their lives.',
    scriptureRef: '1 Timothy 2:1',
    scriptureText: 'I urge that entreaties and prayers, petitions and thanksgivings, be made on behalf of all men.',
    prayerText: 'Lord, I lift up my loved ones, friends, church, and community. Be with them, guide them, and meet their needs.',
  },
  ...decade('Third Decade (Intercession Focus)', 'Pray for various people and groups, lifting them to God with a specific focus for each bead.', [
    { ref: 'Philippians 1:3-4', text: 'I thank my God in all my remembrance of you, always offering prayer with joy.', prayer: 'Lord, I pray for my family members.' },
    { ref: 'Numbers 6:24-26', text: 'The Lord bless you, and keep you; the Lord make His face shine on you.', prayer: 'I pray for my close friends.' },
    { ref: '1 Timothy 2:1-2', text: 'I urge that prayers be made on behalf of all men, for kings and all who are in authority.', prayer: 'I pray for my church leaders and pastors.' },
    { ref: 'Psalm 34:18', text: 'The Lord is near to the brokenhearted and saves those who are crushed in spirit.', prayer: 'I lift up those who are sick or struggling.' },
    { ref: 'Colossians 3:23', text: 'Whatever you do, do your work heartily, as for the Lord rather than for men.', prayer: 'I pray for my coworkers or classmates.' },
    { ref: 'Mark 16:15', text: 'Go into all the world and preach the gospel to all creation.', prayer: 'I pray for missionaries around the world.' },
    { ref: 'Proverbs 11:14', text: 'Where there is no guidance the people fall, but in abundance of counselors there is victory.', prayer: 'I lift up leaders in my community and country.' },
    { ref: 'Luke 19:10', text: 'For the Son of Man has come to seek and to save that which was lost.', prayer: 'I pray for those who do not yet know You.' },
    { ref: 'Psalm 68:6', text: 'God makes a home for the lonely; He leads out the prisoners into prosperity.', prayer: 'I pray for those experiencing loneliness or despair.' },
    { ref: 'Matthew 5:44', text: 'But I say to you, love your enemies and pray for those who persecute you.', prayer: 'I pray for those who have hurt me; help me to forgive and show Your love.' },
  ]),
  {
    beadType: 'large',
    section: 'Large Bead',
    title: 'Large Bead — Personal Requests',
    instruction: 'Bring your own needs and concerns before God, seeking His wisdom and strength.',
    scriptureRef: 'Philippians 4:6',
    scriptureText: 'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
    prayerText: 'Lord, You know my needs and my heart. I ask for guidance, provision, and strength for the challenges I face.',
  },
  ...decade('Fourth Decade (Personal Growth)', 'Ask God to help you grow in specific areas of your walk with Him.', [
    { ref: 'Hebrews 11:6', text: 'And without faith it is impossible to please Him.', prayer: 'Lord, help me to grow in faith.' },
    { ref: 'Psalm 27:14', text: 'Wait for the Lord; be strong and let your heart take courage; yes, wait for the Lord.', prayer: 'Teach me to be patient and wait on You.' },
    { ref: 'John 13:34', text: 'A new commandment I give to you, that you love one another, even as I have loved you.', prayer: 'Help me to love others as You do.' },
    { ref: 'Philippians 2:3', text: 'Do nothing from selfishness or empty conceit, but with humility of mind regard one another as more important than yourselves.', prayer: 'Give me humility and a servant’s heart.' },
    { ref: '1 Thessalonians 5:17', text: 'Pray without ceasing.', prayer: 'Strengthen my prayer life.' },
    { ref: '2 Timothy 2:15', text: 'Be diligent to present yourself approved to God as a workman who does not need to be ashamed.', prayer: 'Deepen my knowledge of Your Word.' },
    { ref: 'Proverbs 3:5-6', text: 'Trust in the Lord with all your heart and lean not on your own understanding.', prayer: 'Help me to trust You more fully.' },
    { ref: 'Matthew 5:16', text: 'Let your light shine before men in such a way that they may see your good works.', prayer: 'Teach me to be a light in my community.' },
    { ref: 'Colossians 3:12', text: 'Put on a heart of compassion, kindness, humility, gentleness, and patience.', prayer: 'Increase my compassion for others.' },
    { ref: '1 Peter 4:10', text: 'As each one has received a special gift, employ it in serving one another.', prayer: 'Guide me to use my gifts for Your glory.' },
  ]),
  {
    beadType: 'large',
    section: 'Large Bead',
    title: 'Large Bead — Guidance and Wisdom',
    instruction: 'Ask for God’s guidance and wisdom for the day ahead.',
    scriptureRef: 'James 1:5',
    scriptureText: 'If any of you lacks wisdom, let him ask of God, who gives to all generously and without reproach, and it will be given to him.',
    prayerText: 'Holy Spirit, please lead me today. Give me wisdom and help me to walk in a way that honors You.',
  },
  ...decade('Fifth Decade (Reflection on God’s Promises)', 'Reflect on and thank God for His promises, trusting in His faithfulness.', [
    { ref: 'Isaiah 41:10', text: 'Do not fear, for I am with you; do not anxiously look about you, for I am your God.', prayer: 'Thank You, Lord, for Your promise to be with me always.' },
    { ref: 'Philippians 4:19', text: 'And my God will supply all your needs according to His riches in glory.', prayer: 'I trust in Your promise to supply all my needs.' },
    { ref: 'Philippians 4:7', text: 'And the peace of God, which surpasses all comprehension, will guard your hearts and your minds in Christ Jesus.', prayer: 'I trust in Your peace that surpasses understanding.' },
    { ref: '2 Corinthians 12:9', text: 'My grace is sufficient for you, for power is perfected in weakness.', prayer: 'You promise to be my strength in weakness.' },
    { ref: 'Psalm 23:4', text: 'Even though I walk through the valley of the shadow of death, I fear no evil, for You are with me.', prayer: 'Thank You for Your protection and guidance.' },
    { ref: 'Psalm 34:15', text: 'The eyes of the Lord are toward the righteous, and His ears are open to their cry.', prayer: 'I trust in Your promise to hear my prayers.' },
    { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love Him.', prayer: 'You promise to work all things for good.' },
    { ref: 'Psalm 136:1', text: 'Give thanks to the Lord, for He is good; for His lovingkindness is everlasting.', prayer: 'I trust in Your unfailing love.' },
    { ref: 'John 3:16', text: 'For God so loved the world, that He gave His only begotten Son, that whoever believes in Him shall not perish, but have eternal life.', prayer: 'Thank You for Your promise of eternal life.' },
    { ref: '1 Thessalonians 5:24', text: 'Faithful is He who calls you, and He also will bring it to pass.', prayer: 'I trust that You are always faithful.' },
  ]),
  {
    beadType: 'large',
    section: 'Large Bead Where the Necklace Splits (After the 5th Decade)',
    title: 'Large Bead Where the Necklace Splits — Reflection and Thanksgiving',
    instruction: 'Reflect on the time spent in prayer and thank God for His presence and guidance.',
    scriptureRef: 'Psalm 107:1',
    scriptureText: 'Give thanks to the Lord, for He is good; His love endures forever.',
    prayerText: 'Lord, I thank You for this time of communion with You. Thank You for hearing my prayers, for Your love and faithfulness, and for being present with me. I trust in Your goodness and commit to following You with a grateful heart.',
  },
  {
    beadType: 'large',
    section: 'Large Bead (Before the 3 Small Beads)',
    title: 'Large Bead — Strength and Renewal',
    instruction: 'Ask God for strength and renewal as you prepare to conclude the prayer time and move forward in His guidance.',
    scriptureRef: 'Isaiah 40:31',
    scriptureText: 'Yet those who wait for the Lord will gain new strength; they will mount up with wings like eagles, they will run and not get tired, they will walk and not become weary.',
    prayerText: 'Lord, as I conclude this time of prayer, I ask You to renew my strength. Fill me with Your Spirit and help me to walk in Your ways, knowing that You sustain me. May I serve You wholeheartedly in all I do.',
  },
  {
    beadType: 'small',
    section: '3 Small Beads — Faith, Hope, and Love (Closing)',
    title: '3 Small Beads — Faith',
    instruction: 'Reaffirm your faith, hope, and love in Christ, committing these virtues as a guide for the days ahead.',
    positionLabel: 'Bead 1 of 3 — Faith',
    scriptureRef: 'Hebrews 11:1',
    scriptureText: 'Now faith is the assurance of things hoped for, the conviction of things not seen.',
    prayerText: 'Lord, deepen my faith in You, that I may trust in Your promises even when I cannot see the path ahead.',
  },
  {
    beadType: 'small',
    section: '3 Small Beads — Faith, Hope, and Love (Closing)',
    title: '3 Small Beads — Hope',
    positionLabel: 'Bead 2 of 3 — Hope',
    scriptureRef: 'Romans 15:13',
    scriptureText: 'May the God of hope fill you with all joy and peace in believing, so that you will abound in hope by the power of the Holy Spirit.',
    prayerText: 'Fill me with hope, Lord, that I may rest in Your promises and joyfully await the good You have planned.',
  },
  {
    beadType: 'small',
    section: '3 Small Beads — Faith, Hope, and Love (Closing)',
    title: '3 Small Beads — Love',
    positionLabel: 'Bead 3 of 3 — Love',
    scriptureRef: '1 Corinthians 16:14',
    scriptureText: 'Let all that you do be done in love.',
    prayerText: 'Lord, let Your love fill my heart and guide my actions. Help me to love others as You have loved me.',
  },
  {
    beadType: 'large',
    section: 'Large Bead Before the Crucifix',
    title: 'Large Bead Before the Crucifix — Dedication and Surrender',
    instruction: 'Dedicate yourself anew to God’s purposes and surrender all your cares to Him.',
    scriptureRef: 'Romans 12:1',
    scriptureText: 'Therefore I urge you, brethren, by the mercies of God, to present your bodies a living and holy sacrifice, acceptable to God, which is your spiritual service of worship.',
    prayerText: 'Lord, I surrender myself to You. Help me to live as a living sacrifice, fully devoted to Your will. Guide my thoughts, words, and actions, that I may glorify You in all things.',
  },
  {
    beadType: 'crucifix',
    section: 'Final Crucifix',
    title: 'Final Crucifix — Opening and Closing Prayer of Worship and Commitment',
    instruction: 'As you begin and conclude this prayer, focus on the sacrifice of Christ on the cross, acknowledging His love and dedicating yourself to follow Him fully.',
    scriptureRef: 'Galatians 2:20',
    scriptureText: 'I have been crucified with Christ; and it is no longer I who live, but Christ lives in me; and the life which I now live in the flesh I live by faith in the Son of God, who loved me and gave Himself up for me.',
    prayerText: 'Lord Jesus, thank You for the cross. You gave Your life so that I could be forgiven, reconciled, and transformed by Your love. As I enter this time of prayer, I commit my heart and my life to You, and I ask that You shape me to reflect Your love and truth. May Your Spirit guide me, and may my life be a witness to Your grace. Help me to live each day in the light of Your sacrifice, surrendered to Your will and ready to serve others as You have loved me. In Your holy name, Amen.',
  },
];

export const BAPTIST_ROSARY: RosaryBead[] = raw.map((bead, i) => ({ ...bead, index: i + 1 }));
