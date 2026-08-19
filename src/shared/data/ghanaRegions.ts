/**
 * Ghana's regions and districts, as the AgroMet backend records them.
 *
 * Ported from the web dashboard's src/data/ghanaCodes.js so both clients
 * offer identical names. That matters more than it sounds: calendars are
 * filed under these strings and the backend matches them *exactly*, so a
 * district spelled differently here would silently return nothing. The
 * region names deliberately carry the " Region" suffix for the same reason
 * — the database holds "Ashanti Region", not "Ashanti".
 *
 * 17 regions, 283 districts. Generated from the web catalogue
 * rather than retyped, so the two cannot drift apart by a typo.
 *
 * This is the list of places that exist, not of places that have a
 * calendar. Those are different questions, and the filters keep them
 * separate: you may pick any district, and are told plainly when nothing
 * has been published for it.
 */

export type GhanaDistrict = { code: string; name: string };
export type GhanaRegion = { code: string; name: string; districts: GhanaDistrict[] };

export const GHANA_REGIONS: GhanaRegion[] = [
  {
    code: 'REG12',
    name: 'Ahafo Region',
    districts: [
      {
        code: 'DS233',
        name: 'Asunafo North Municipal',
      },
      {
        code: 'DS234',
        name: 'Asunafo South Municipal',
      },
      {
        code: 'DS235',
        name: 'Asutifi North',
      },
      {
        code: 'DS236',
        name: 'Asutifi South',
      },
      {
        code: 'DS237',
        name: 'Tano North Municipal',
      },
      {
        code: 'DS238',
        name: 'Tano South Municipal',
      },
    ],
  },
  {
    code: 'REG02',
    name: 'Ashanti Region',
    districts: [
      {
        code: 'DS029',
        name: 'Adansi North',
      },
      {
        code: 'DS030',
        name: 'Adansi South',
      },
      {
        code: 'DS031',
        name: 'Afigya Kwabre North',
      },
      {
        code: 'DS032',
        name: 'Afigya Kwabre South',
      },
      {
        code: 'DS033',
        name: 'Afigya Sekyere East',
      },
      {
        code: 'DS034',
        name: 'Ahafo Ano North Municipal',
      },
      {
        code: 'DS035',
        name: 'Ahafo Ano South East',
      },
      {
        code: 'DS036',
        name: 'Ahafo Ano South West',
      },
      {
        code: 'DS037',
        name: 'Amansie Central',
      },
      {
        code: 'DS038',
        name: 'Amansie South',
      },
      {
        code: 'DS039',
        name: 'Amansie West',
      },
      {
        code: 'DS040',
        name: 'Atwima Kwanwoma',
      },
      {
        code: 'DS041',
        name: 'Atwima Mponua',
      },
      {
        code: 'DS042',
        name: 'Atwima Nwabiagya North',
      },
      {
        code: 'DS043',
        name: 'Atwima Nwabiagya South Municipal',
      },
      {
        code: 'DS044',
        name: 'Bekwai Municipal',
      },
      {
        code: 'DS045',
        name: 'Bosome Freho',
      },
      {
        code: 'DS046',
        name: 'Bosomtwe',
      },
      {
        code: 'DS047',
        name: 'Ejisu Municipal',
      },
      {
        code: 'DS048',
        name: 'Ejura Sekyedumase Municipal',
      },
      {
        code: 'DS049',
        name: 'Juaben Municipal',
      },
      {
        code: 'DS051',
        name: 'Kumasi Metropolitan',
      },
      {
        code: 'DS050',
        name: 'Kwabre East',
      },
      {
        code: 'DS052',
        name: 'Mampong Municipal',
      },
      {
        code: 'DS053',
        name: 'Nsuta Kwamang Beposo',
      },
      {
        code: 'DS054',
        name: 'Obuasi East Municipal',
      },
      {
        code: 'DS055',
        name: 'Obuasi West Municipal',
      },
      {
        code: 'DS056',
        name: 'Offinso North',
      },
      {
        code: 'DS057',
        name: 'Offinso South Municipal',
      },
      {
        code: 'DS058',
        name: 'Oforikrom Municipal',
      },
      {
        code: 'DS059',
        name: 'Old Tafo Municipal',
      },
      {
        code: 'DS060',
        name: 'Sekyere Afram Plains',
      },
      {
        code: 'DS061',
        name: 'Sekyere Central',
      },
      {
        code: 'DS062',
        name: 'Sekyere East',
      },
      {
        code: 'DS063',
        name: 'Sekyere Kumawu',
      },
      {
        code: 'DS064',
        name: 'Sekyere South',
      },
    ],
  },
  {
    code: 'REG14',
    name: 'Bono East Region',
    districts: [
      {
        code: 'DS251',
        name: 'Atebubu Amantin Municipal',
      },
      {
        code: 'DS252',
        name: 'Kintampo North Municipal',
      },
      {
        code: 'DS253',
        name: 'Kintampo South Municipal',
      },
      {
        code: 'DS254',
        name: 'Nkoranza North',
      },
      {
        code: 'DS255',
        name: 'Nkoranza South Municipal',
      },
      {
        code: 'DS256',
        name: 'Pru East',
      },
      {
        code: 'DS257',
        name: 'Pru West Municipal',
      },
      {
        code: 'DS258',
        name: 'Sene East',
      },
      {
        code: 'DS259',
        name: 'Sene West',
      },
      {
        code: 'DS260',
        name: 'Techiman North',
      },
      {
        code: 'DS261',
        name: 'Techiman South Municipal',
      },
    ],
  },
  {
    code: 'REG13',
    name: 'Bono Region',
    districts: [
      {
        code: 'DS239',
        name: 'Banda',
      },
      {
        code: 'DS240',
        name: 'Berekum East Municipal',
      },
      {
        code: 'DS241',
        name: 'Berekum West Municipal',
      },
      {
        code: 'DS242',
        name: 'Dormaa Central Municipal',
      },
      {
        code: 'DS243',
        name: 'Dormaa East',
      },
      {
        code: 'DS244',
        name: 'Dormaa West',
      },
      {
        code: 'DS245',
        name: 'Jaman North',
      },
      {
        code: 'DS246',
        name: 'Jaman South Municipal',
      },
      {
        code: 'DS247',
        name: 'Sunyani Municipal',
      },
      {
        code: 'DS248',
        name: 'Sunyani West',
      },
      {
        code: 'DS249',
        name: 'Tain',
      },
      {
        code: 'DS250',
        name: 'Wenchi Municipal',
      },
    ],
  },
  {
    code: 'REG07',
    name: 'Brong Ahafo Region',
    districts: [
      {
        code: 'DS152',
        name: 'Asunafo North Municipal',
      },
      {
        code: 'DS153',
        name: 'Asunafo South Municipal',
      },
      {
        code: 'DS154',
        name: 'Asutifi North',
      },
      {
        code: 'DS155',
        name: 'Asutifi South',
      },
      {
        code: 'DS156',
        name: 'Atebubu Amantin Municipal',
      },
      {
        code: 'DS157',
        name: 'Banda',
      },
      {
        code: 'DS158',
        name: 'Berekum East Municipal',
      },
      {
        code: 'DS159',
        name: 'Berekum West Municipal',
      },
      {
        code: 'DS160',
        name: 'Dormaa Central Municipal',
      },
      {
        code: 'DS161',
        name: 'Dormaa East',
      },
      {
        code: 'DS162',
        name: 'Dormaa West',
      },
      {
        code: 'DS163',
        name: 'Jaman North',
      },
      {
        code: 'DS164',
        name: 'Jaman South Municipal',
      },
      {
        code: 'DS165',
        name: 'Kintampo North Municipal',
      },
      {
        code: 'DS166',
        name: 'Kintampo South Municipal',
      },
      {
        code: 'DS167',
        name: 'Nkoranza North',
      },
      {
        code: 'DS168',
        name: 'Nkoranza South Municipal',
      },
      {
        code: 'DS169',
        name: 'Pru East',
      },
      {
        code: 'DS170',
        name: 'Pru West Municipal',
      },
      {
        code: 'DS171',
        name: 'Sene East',
      },
      {
        code: 'DS172',
        name: 'Sene West',
      },
      {
        code: 'DS173',
        name: 'Sunyani Municipal',
      },
      {
        code: 'DS174',
        name: 'Sunyani West',
      },
      {
        code: 'DS175',
        name: 'Tain',
      },
      {
        code: 'DS176',
        name: 'Tano North',
      },
      {
        code: 'DS177',
        name: 'Tano South',
      },
      {
        code: 'DS178',
        name: 'Techiman North',
      },
      {
        code: 'DS179',
        name: 'Techiman South Municipal',
      },
      {
        code: 'DS180',
        name: 'Wenchi Municipal',
      },
    ],
  },
  {
    code: 'REG04',
    name: 'Central Region',
    districts: [
      {
        code: 'DS079',
        name: 'Abura Asebu Kwamankese',
      },
      {
        code: 'DS080',
        name: 'Agona East',
      },
      {
        code: 'DS081',
        name: 'Agona West Municipal',
      },
      {
        code: 'DS082',
        name: 'Ajumako Enyan Essiam',
      },
      {
        code: 'DS083',
        name: 'Asikuma Odoben Brakwa',
      },
      {
        code: 'DS084',
        name: 'Assin Central Municipal',
      },
      {
        code: 'DS085',
        name: 'Assin North',
      },
      {
        code: 'DS086',
        name: 'Assin South',
      },
      {
        code: 'DS087',
        name: 'Awutu Senya',
      },
      {
        code: 'DS088',
        name: 'Awutu Senya East Municipal',
      },
      {
        code: 'DS089',
        name: 'Cape Coast Metropolitan',
      },
      {
        code: 'DS090',
        name: 'Effutu Municipal',
      },
      {
        code: 'DS091',
        name: 'Ekumfi',
      },
      {
        code: 'DS092',
        name: 'Gomoa Central',
      },
      {
        code: 'DS093',
        name: 'Gomoa East',
      },
      {
        code: 'DS094',
        name: 'Gomoa West',
      },
      {
        code: 'DS095',
        name: 'Kasoa Municipal',
      },
      {
        code: 'DS096',
        name: 'Komenda Edina Eguafo Abirem Municipal',
      },
      {
        code: 'DS097',
        name: 'Mfantsiman Municipal',
      },
      {
        code: 'DS098',
        name: 'Twifo Ati Morkwa',
      },
      {
        code: 'DS099',
        name: 'Twifo Hemang Lower Denkyira',
      },
      {
        code: 'DS100',
        name: 'Upper Denkyira East Municipal',
      },
      {
        code: 'DS101',
        name: 'Upper Denkyira West',
      },
    ],
  },
  {
    code: 'REG06',
    name: 'Eastern Region',
    districts: [
      {
        code: 'DS117',
        name: 'Abuakwa North Municipal',
      },
      {
        code: 'DS118',
        name: 'Abuakwa South Municipal',
      },
      {
        code: 'DS119',
        name: 'Achiase',
      },
      {
        code: 'DS120',
        name: 'Afram Plains North',
      },
      {
        code: 'DS121',
        name: 'Afram Plains South',
      },
      {
        code: 'DS122',
        name: 'Akim East Municipal',
      },
      {
        code: 'DS123',
        name: 'Akim West Municipal',
      },
      {
        code: 'DS124',
        name: 'Akuapim North Municipal',
      },
      {
        code: 'DS125',
        name: 'Akuapim South Municipal',
      },
      {
        code: 'DS126',
        name: 'Asene Manso Akroso',
      },
      {
        code: 'DS127',
        name: 'Atiwa East',
      },
      {
        code: 'DS128',
        name: 'Atiwa West',
      },
      {
        code: 'DS129',
        name: 'Ayensuano',
      },
      {
        code: 'DS130',
        name: 'Birim Central Municipal',
      },
      {
        code: 'DS131',
        name: 'Birim North',
      },
      {
        code: 'DS132',
        name: 'Birim South',
      },
      {
        code: 'DS133',
        name: 'Denkyembour',
      },
      {
        code: 'DS134',
        name: 'East Akim Municipal',
      },
      {
        code: 'DS135',
        name: 'Fanteakwa North',
      },
      {
        code: 'DS136',
        name: 'Fanteakwa South',
      },
      {
        code: 'DS137',
        name: 'Kwaebibirem Municipal',
      },
      {
        code: 'DS138',
        name: 'Kwahu Afram Plains South',
      },
      {
        code: 'DS139',
        name: 'Kwahu East',
      },
      {
        code: 'DS140',
        name: 'Kwahu South',
      },
      {
        code: 'DS141',
        name: 'Kwahu West Municipal',
      },
      {
        code: 'DS142',
        name: 'Lower Manya Krobo Municipal',
      },
      {
        code: 'DS143',
        name: 'New Juaben North Municipal',
      },
      {
        code: 'DS144',
        name: 'New Juaben South Municipal',
      },
      {
        code: 'DS145',
        name: 'Nsawam Adoagyir Municipal',
      },
      {
        code: 'DS146',
        name: 'Okere',
      },
      {
        code: 'DS147',
        name: 'Suhum Municipal',
      },
      {
        code: 'DS148',
        name: 'Upper Manya Krobo',
      },
      {
        code: 'DS149',
        name: 'Upper West Akim',
      },
      {
        code: 'DS150',
        name: 'West Akim Municipal',
      },
      {
        code: 'DS151',
        name: 'Yilo Krobo Municipal',
      },
    ],
  },
  {
    code: 'REG01',
    name: 'Greater Accra Region',
    districts: [
      {
        code: 'DS001',
        name: 'Ablekuma Central',
      },
      {
        code: 'DS002',
        name: 'Ablekuma North',
      },
      {
        code: 'DS003',
        name: 'Ablekuma West',
      },
      {
        code: 'DS004',
        name: 'Accra Metropolitan',
      },
      {
        code: 'DS005',
        name: 'Ada East',
      },
      {
        code: 'DS006',
        name: 'Ada West',
      },
      {
        code: 'DS007',
        name: 'Adenta Municipal',
      },
      {
        code: 'DS008',
        name: 'Ashaiman Municipal',
      },
      {
        code: 'DS009',
        name: 'Ayawaso Central',
      },
      {
        code: 'DS010',
        name: 'Ayawaso East',
      },
      {
        code: 'DS011',
        name: 'Ayawaso North',
      },
      {
        code: 'DS012',
        name: 'Ayawaso West Wuogon',
      },
      {
        code: 'DS013',
        name: 'Ga Central Municipal',
      },
      {
        code: 'DS014',
        name: 'Ga East Municipal',
      },
      {
        code: 'DS015',
        name: 'Ga North Municipal',
      },
      {
        code: 'DS016',
        name: 'Ga South Municipal',
      },
      {
        code: 'DS017',
        name: 'Ga West Municipal',
      },
      {
        code: 'DS018',
        name: 'Kpone Katamanso Municipal',
      },
      {
        code: 'DS019',
        name: 'Krowor Municipal',
      },
      {
        code: 'DS020',
        name: 'La Dade Kotopon Municipal',
      },
      {
        code: 'DS021',
        name: 'La Nkwantanang Madina Municipal',
      },
      {
        code: 'DS022',
        name: 'Ledzokuku Municipal',
      },
      {
        code: 'DS023',
        name: 'Okaikwei North',
      },
      {
        code: 'DS024',
        name: 'Okaikwei South',
      },
      {
        code: 'DS025',
        name: 'Shai Osudoku',
      },
      {
        code: 'DS026',
        name: 'Tema East Municipal',
      },
      {
        code: 'DS027',
        name: 'Tema West Municipal',
      },
      {
        code: 'DS028',
        name: 'Weija Gbawe Municipal',
      },
    ],
  },
  {
    code: 'REG15',
    name: 'North East Region',
    districts: [
      {
        code: 'DS262',
        name: 'Bunkpurugu Nakpanduri',
      },
      {
        code: 'DS263',
        name: 'Chereponi',
      },
      {
        code: 'DS264',
        name: 'East Mamprusi Municipal',
      },
      {
        code: 'DS265',
        name: 'Mamprugu Moagduri',
      },
      {
        code: 'DS266',
        name: 'West Mamprusi Municipal',
      },
      {
        code: 'DS267',
        name: 'Yunyoo Nasuan',
      },
    ],
  },
  {
    code: 'REG08',
    name: 'Northern Region',
    districts: [
      {
        code: 'DS181',
        name: 'Bole',
      },
      {
        code: 'DS182',
        name: 'Central Gonja',
      },
      {
        code: 'DS183',
        name: 'East Gonja Municipal',
      },
      {
        code: 'DS184',
        name: 'Gushegu Municipal',
      },
      {
        code: 'DS185',
        name: 'Karaga',
      },
      {
        code: 'DS186',
        name: 'Kpandai',
      },
      {
        code: 'DS187',
        name: 'Kumbungu',
      },
      {
        code: 'DS188',
        name: 'Mion',
      },
      {
        code: 'DS189',
        name: 'Nanumba North',
      },
      {
        code: 'DS190',
        name: 'Nanumba South',
      },
      {
        code: 'DS191',
        name: 'North Gonja',
      },
      {
        code: 'DS192',
        name: 'Saboba',
      },
      {
        code: 'DS193',
        name: 'Savelugu Municipal',
      },
      {
        code: 'DS194',
        name: 'Sawla Tuna Kalba',
      },
      {
        code: 'DS195',
        name: 'Tamale Metropolitan',
      },
      {
        code: 'DS196',
        name: 'Tatale Sanguli',
      },
      {
        code: 'DS197',
        name: 'Tolon',
      },
      {
        code: 'DS198',
        name: 'West Gonja Municipal',
      },
      {
        code: 'DS199',
        name: 'Yendi Municipal',
      },
      {
        code: 'DS200',
        name: 'Zabzugu',
      },
    ],
  },
  {
    code: 'REG11',
    name: 'Oti Region',
    districts: [
      {
        code: 'DS225',
        name: 'Biakoye',
      },
      {
        code: 'DS226',
        name: 'Jasikan',
      },
      {
        code: 'DS227',
        name: 'Kadjebi',
      },
      {
        code: 'DS228',
        name: 'Krachi East',
      },
      {
        code: 'DS229',
        name: 'Krachi Nchumuru',
      },
      {
        code: 'DS230',
        name: 'Krachi West',
      },
      {
        code: 'DS231',
        name: 'Nkwanta North',
      },
      {
        code: 'DS232',
        name: 'Nkwanta South Municipal',
      },
    ],
  },
  {
    code: 'REG16',
    name: 'Savannah Region',
    districts: [
      {
        code: 'DS268',
        name: 'Bole',
      },
      {
        code: 'DS269',
        name: 'Central Gonja',
      },
      {
        code: 'DS270',
        name: 'East Gonja Municipal',
      },
      {
        code: 'DS271',
        name: 'North Gonja',
      },
      {
        code: 'DS272',
        name: 'Sawla Tuna Kalba',
      },
      {
        code: 'DS273',
        name: 'West Gonja Municipal',
      },
      {
        code: 'DS274',
        name: 'Yapei Kusawgu',
      },
    ],
  },
  {
    code: 'REG09',
    name: 'Upper East Region',
    districts: [
      {
        code: 'DS201',
        name: 'Bawku Municipal',
      },
      {
        code: 'DS202',
        name: 'Bawku West',
      },
      {
        code: 'DS203',
        name: 'Binduri',
      },
      {
        code: 'DS204',
        name: 'Bolgatanga Municipal',
      },
      {
        code: 'DS205',
        name: 'Builsa North',
      },
      {
        code: 'DS206',
        name: 'Builsa South',
      },
      {
        code: 'DS207',
        name: 'Garu',
      },
      {
        code: 'DS208',
        name: 'Kassena Nankana East',
      },
      {
        code: 'DS209',
        name: 'Kassena Nankana West Municipal',
      },
      {
        code: 'DS210',
        name: 'Nabdam',
      },
      {
        code: 'DS211',
        name: 'Pusiga',
      },
      {
        code: 'DS212',
        name: 'Talensi',
      },
      {
        code: 'DS213',
        name: 'Tempane',
      },
    ],
  },
  {
    code: 'REG10',
    name: 'Upper West Region',
    districts: [
      {
        code: 'DS214',
        name: 'Daffiama Bussie Issa',
      },
      {
        code: 'DS215',
        name: 'Jirapa Municipal',
      },
      {
        code: 'DS216',
        name: 'Lambussie Karni',
      },
      {
        code: 'DS217',
        name: 'Lawra Municipal',
      },
      {
        code: 'DS218',
        name: 'Nadowli Kaleo',
      },
      {
        code: 'DS219',
        name: 'Nandom Municipal',
      },
      {
        code: 'DS220',
        name: 'Sissala East Municipal',
      },
      {
        code: 'DS221',
        name: 'Sissala West',
      },
      {
        code: 'DS222',
        name: 'Wa East',
      },
      {
        code: 'DS224',
        name: 'Wa Municipal',
      },
      {
        code: 'DS223',
        name: 'Wa West',
      },
    ],
  },
  {
    code: 'REG05',
    name: 'Volta Region',
    districts: [
      {
        code: 'DS102',
        name: 'Adaklu',
      },
      {
        code: 'DS103',
        name: 'Agotime Ziope',
      },
      {
        code: 'DS104',
        name: 'Akatsi North',
      },
      {
        code: 'DS105',
        name: 'Akatsi South Municipal',
      },
      {
        code: 'DS106',
        name: 'Central Tongu',
      },
      {
        code: 'DS107',
        name: 'Ho Municipal',
      },
      {
        code: 'DS108',
        name: 'Ho West',
      },
      {
        code: 'DS109',
        name: 'Hohoe Municipal',
      },
      {
        code: 'DS110',
        name: 'Keta Municipal',
      },
      {
        code: 'DS111',
        name: 'Ketu North Municipal',
      },
      {
        code: 'DS112',
        name: 'Ketu South Municipal',
      },
      {
        code: 'DS113',
        name: 'North Dayi',
      },
      {
        code: 'DS114',
        name: 'North Tongu',
      },
      {
        code: 'DS115',
        name: 'South Dayi',
      },
      {
        code: 'DS116',
        name: 'South Tongu',
      },
    ],
  },
  {
    code: 'REG17',
    name: 'Western North Region',
    districts: [
      {
        code: 'DS275',
        name: 'Aowin Municipal',
      },
      {
        code: 'DS276',
        name: 'Bia East',
      },
      {
        code: 'DS277',
        name: 'Bia West',
      },
      {
        code: 'DS278',
        name: 'Bibiani Anhwiaso Bekwai Municipal',
      },
      {
        code: 'DS279',
        name: 'Bodi',
      },
      {
        code: 'DS280',
        name: 'Juaboso',
      },
      {
        code: 'DS281',
        name: 'Sefwi Akontombra',
      },
      {
        code: 'DS282',
        name: 'Sefwi Wiawso Municipal',
      },
      {
        code: 'DS283',
        name: 'Suaman',
      },
    ],
  },
  {
    code: 'REG03',
    name: 'Western Region',
    districts: [
      {
        code: 'DS065',
        name: 'Ahanta West',
      },
      {
        code: 'DS066',
        name: 'Ellembelle',
      },
      {
        code: 'DS067',
        name: 'Jomoro',
      },
      {
        code: 'DS068',
        name: 'Mpohor',
      },
      {
        code: 'DS069',
        name: 'Nzema East Municipal',
      },
      {
        code: 'DS070',
        name: 'Prestea Huni Valley Municipal',
      },
      {
        code: 'DS071',
        name: 'Sekondi Takoradi Metropolitan',
      },
      {
        code: 'DS072',
        name: 'Shama',
      },
      {
        code: 'DS073',
        name: 'Tarkwa Nsuaem Municipal',
      },
      {
        code: 'DS074',
        name: 'Wassa Amenfi Central',
      },
      {
        code: 'DS075',
        name: 'Wassa Amenfi East Municipal',
      },
      {
        code: 'DS076',
        name: 'Wassa Amenfi West',
      },
      {
        code: 'DS077',
        name: 'Wassa East',
      },
      {
        code: 'DS078',
        name: 'Wiawso Municipal',
      },
    ],
  },
];

export const GHANA_REGION_NAMES: string[] = GHANA_REGIONS.map((region) => region.name);

/** The districts of one region, by region name. Empty for an unknown one. */
export function districtsInRegion(regionName: string): string[] {
  const region = GHANA_REGIONS.find((entry) => entry.name === regionName);
  return region ? region.districts.map((district) => district.name) : [];
}
