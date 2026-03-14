import {
  PrismaClient,
  type Gender,
  type CarePlanCategory,
  type CarePlanStatus,
  type GoalStatus,
  type ActivityType,
  type ActivityStatus,
  type AssessmentStatus,
  type RiskLevel,
  type MedicationForm,
  type MedicationRequestStatus,
  type MedicationRoute,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Realistic UK patient data ────────────────────────────
const sunrisePatients = [
  {
    givenName: 'Margaret',
    familyName: 'Whitfield',
    gender: 'FEMALE' as Gender,
    birthDate: '1942-03-15',
    phone: '07700900010',
    address: '12 Rose Cottage',
    city: 'Bristol',
    postcode: 'BS2 8HW',
    nhs: '9000000001',
    careSetting: 'Residential',
  },
  {
    givenName: 'Harold',
    familyName: 'Braithwaite',
    gender: 'MALE' as Gender,
    birthDate: '1938-07-22',
    phone: '07700900011',
    address: '8 Elm Park',
    city: 'Bristol',
    postcode: 'BS3 1PQ',
    nhs: '9000000002',
    careSetting: 'Residential',
  },
  {
    givenName: 'Dorothy',
    familyName: 'Chalmers',
    gender: 'FEMALE' as Gender,
    birthDate: '1945-11-08',
    phone: '07700900012',
    address: '3 Primrose Hill',
    city: 'Bath',
    postcode: 'BA1 5NR',
    nhs: '9000000003',
    careSetting: 'Nursing',
  },
  {
    givenName: 'Frank',
    familyName: 'Hobson',
    gender: 'MALE' as Gender,
    birthDate: '1940-01-30',
    phone: '07700900013',
    address: '27 Orchard Way',
    city: 'Bristol',
    postcode: 'BS4 3TU',
    nhs: '9000000004',
    careSetting: 'Residential',
  },
  {
    givenName: 'Edith',
    familyName: 'Crawley',
    gender: 'FEMALE' as Gender,
    birthDate: '1936-09-12',
    phone: '07700900014',
    address: '14 Manor Road',
    city: 'Weston-super-Mare',
    postcode: 'BS23 2AB',
    nhs: '9000000005',
    careSetting: 'Dementia',
  },
  {
    givenName: 'Albert',
    familyName: 'Pickering',
    gender: 'MALE' as Gender,
    birthDate: '1943-05-18',
    phone: '07700900015',
    address: '6 Church Lane',
    city: 'Bristol',
    postcode: 'BS5 6DG',
    nhs: '9000000006',
    careSetting: 'Residential',
  },
  {
    givenName: 'Vera',
    familyName: 'Longbottom',
    gender: 'FEMALE' as Gender,
    birthDate: '1941-12-25',
    phone: '07700900016',
    address: '51 Station Road',
    city: 'Keynsham',
    postcode: 'BS31 1HA',
    nhs: '9000000007',
    careSetting: 'Nursing',
  },
  {
    givenName: 'Ronald',
    familyName: 'Fitzpatrick',
    gender: 'MALE' as Gender,
    birthDate: '1939-04-02',
    phone: '07700900017',
    address: '9 The Crescent',
    city: 'Bristol',
    postcode: 'BS6 7EF',
    nhs: '9000000008',
    careSetting: 'Residential',
  },
  {
    givenName: 'Gladys',
    familyName: 'Worthington',
    gender: 'FEMALE' as Gender,
    birthDate: '1944-08-19',
    phone: '07700900018',
    address: '22 Westbury Lane',
    city: 'Bristol',
    postcode: 'BS9 3AG',
    nhs: '9000000009',
    careSetting: 'Respite',
  },
  {
    givenName: 'Ernest',
    familyName: 'Pemberton',
    gender: 'MALE' as Gender,
    birthDate: '1937-06-11',
    phone: '07700900019',
    address: '1 Clifton Terrace',
    city: 'Bristol',
    postcode: 'BS8 4FA',
    nhs: '9000000010',
    careSetting: 'Dementia',
  },
  // ── Additional Sunrise patients (20 more) ──────────────
  {
    givenName: 'Phyllis',
    familyName: 'Henderson',
    gender: 'FEMALE' as Gender,
    birthDate: '1935-02-17',
    phone: '07700900030',
    address: '15 Henbury Road',
    city: 'Bristol',
    postcode: 'BS10 7AD',
    nhs: '9000000021',
    careSetting: 'Nursing',
  },
  {
    givenName: 'George',
    familyName: 'Bartlett',
    gender: 'MALE' as Gender,
    birthDate: '1940-08-05',
    phone: '07700900031',
    address: '4 Redland Grove',
    city: 'Bristol',
    postcode: 'BS6 6UB',
    nhs: '9000000022',
    careSetting: 'Residential',
  },
  {
    givenName: 'Irene',
    familyName: 'Saunders',
    gender: 'FEMALE' as Gender,
    birthDate: '1943-04-28',
    phone: '07700900032',
    address: '33 Bishopsworth Road',
    city: 'Bristol',
    postcode: 'BS13 7JW',
    nhs: '9000000023',
    careSetting: 'Dementia',
  },
  {
    givenName: 'Norman',
    familyName: 'Griffiths',
    gender: 'MALE' as Gender,
    birthDate: '1937-10-14',
    phone: '07700900033',
    address: '7 Long Ashton Road',
    city: 'Long Ashton',
    postcode: 'BS41 9LE',
    nhs: '9000000024',
    careSetting: 'Nursing',
  },
  {
    givenName: 'Doris',
    familyName: 'Marsh',
    gender: 'FEMALE' as Gender,
    birthDate: '1939-06-03',
    phone: '07700900034',
    address: '19 Southmead Road',
    city: 'Bristol',
    postcode: 'BS10 5NB',
    nhs: '9000000025',
    careSetting: 'Residential',
  },
  {
    givenName: 'Clifford',
    familyName: 'Parsons',
    gender: 'MALE' as Gender,
    birthDate: '1941-01-22',
    phone: '07700900035',
    address: '28 Stapleton Road',
    city: 'Bristol',
    postcode: 'BS5 0QH',
    nhs: '9000000026',
    careSetting: 'Respite',
  },
  {
    givenName: 'Joan',
    familyName: 'Harwood',
    gender: 'FEMALE' as Gender,
    birthDate: '1936-12-09',
    phone: '07700900036',
    address: '11 Clevedon Road',
    city: 'Nailsea',
    postcode: 'BS48 1AH',
    nhs: '9000000027',
    careSetting: 'Dementia',
  },
  {
    givenName: 'Stanley',
    familyName: 'Whitaker',
    gender: 'MALE' as Gender,
    birthDate: '1938-03-25',
    phone: '07700900037',
    address: '5 Portishead High Street',
    city: 'Portishead',
    postcode: 'BS20 6AH',
    nhs: '9000000028',
    careSetting: 'Nursing',
  },
  {
    givenName: 'Mabel',
    familyName: 'Thornley',
    gender: 'FEMALE' as Gender,
    birthDate: '1942-07-18',
    phone: '07700900038',
    address: '42 Filton Avenue',
    city: 'Bristol',
    postcode: 'BS7 0AT',
    nhs: '9000000029',
    careSetting: 'Residential',
  },
  {
    givenName: 'Reginald',
    familyName: 'Coombes',
    gender: 'MALE' as Gender,
    birthDate: '1934-11-30',
    phone: '07700900039',
    address: '16 Bedminster Parade',
    city: 'Bristol',
    postcode: 'BS3 4HL',
    nhs: '9000000030',
    careSetting: 'Nursing',
  },
  {
    givenName: 'Elsie',
    familyName: 'Turnbull',
    gender: 'FEMALE' as Gender,
    birthDate: '1940-09-07',
    phone: '07700900040',
    address: '2 Cotham Hill',
    city: 'Bristol',
    postcode: 'BS6 6LA',
    nhs: '9000000031',
    careSetting: 'Residential',
  },
  {
    givenName: 'Walter',
    familyName: 'Bingham',
    gender: 'MALE' as Gender,
    birthDate: '1936-05-12',
    phone: '07700900041',
    address: '38 Shirehampton Road',
    city: 'Bristol',
    postcode: 'BS11 9RP',
    nhs: '9000000032',
    careSetting: 'Dementia',
  },
  {
    givenName: 'Hilda',
    familyName: 'Prescott',
    gender: 'FEMALE' as Gender,
    birthDate: '1944-02-20',
    phone: '07700900042',
    address: '21 Westbury-on-Trym High St',
    city: 'Bristol',
    postcode: 'BS9 3EF',
    nhs: '9000000033',
    careSetting: 'Respite',
  },
  {
    givenName: 'Cecil',
    familyName: 'Rowbotham',
    gender: 'MALE' as Gender,
    birthDate: '1935-08-16',
    phone: '07700900043',
    address: '10 Knowle Road',
    city: 'Bristol',
    postcode: 'BS4 2EA',
    nhs: '9000000034',
    careSetting: 'Residential',
  },
  {
    givenName: 'Beatrice',
    familyName: 'Ogden',
    gender: 'FEMALE' as Gender,
    birthDate: '1941-04-01',
    phone: '07700900044',
    address: '6 Brislington Hill',
    city: 'Bristol',
    postcode: 'BS4 5BH',
    nhs: '9000000035',
    careSetting: 'Nursing',
  },
  {
    givenName: 'Leonard',
    familyName: 'Faulkner',
    gender: 'MALE' as Gender,
    birthDate: '1939-12-23',
    phone: '07700900045',
    address: '14 Hanham Road',
    city: 'Hanham',
    postcode: 'BS15 3DH',
    nhs: '9000000036',
    careSetting: 'Residential',
  },
  {
    givenName: 'Enid',
    familyName: 'Lockwood',
    gender: 'FEMALE' as Gender,
    birthDate: '1943-06-30',
    phone: '07700900046',
    address: '29 Fishponds Road',
    city: 'Bristol',
    postcode: 'BS16 3AE',
    nhs: '9000000037',
    careSetting: 'Dementia',
  },
  {
    givenName: 'Arthur',
    familyName: 'Dunmore',
    gender: 'MALE' as Gender,
    birthDate: '1937-01-08',
    phone: '07700900047',
    address: '3 Pill Road',
    city: 'Pill',
    postcode: 'BS20 0AG',
    nhs: '9000000038',
    careSetting: 'Nursing',
  },
  {
    givenName: 'Winifred',
    familyName: 'Bates',
    gender: 'FEMALE' as Gender,
    birthDate: '1938-10-11',
    phone: '07700900048',
    address: '17 Horfield Road',
    city: 'Bristol',
    postcode: 'BS2 8EG',
    nhs: '9000000039',
    careSetting: 'Residential',
  },
  {
    givenName: 'Herbert',
    familyName: 'Stokes',
    gender: 'MALE' as Gender,
    birthDate: '1936-03-27',
    phone: '07700900049',
    address: '8 Easton Road',
    city: 'Bristol',
    postcode: 'BS5 0HB',
    nhs: '9000000040',
    careSetting: 'Respite',
  },
];

const oakwoodPatients = [
  {
    givenName: 'Arthur',
    familyName: 'Pemberton',
    gender: 'MALE' as Gender,
    birthDate: '1950-11-22',
    phone: '07700900020',
    address: '5 Willow Drive',
    city: 'Oxford',
    postcode: 'OX3 7BB',
    nhs: '9000000011',
  },
  {
    givenName: 'Susan',
    familyName: 'Hargreaves',
    gender: 'FEMALE' as Gender,
    birthDate: '1962-04-10',
    phone: '07700900021',
    address: '17 Banbury Road',
    city: 'Oxford',
    postcode: 'OX2 6NN',
    nhs: '9000000012',
  },
  {
    givenName: 'David',
    familyName: 'Thornton',
    gender: 'MALE' as Gender,
    birthDate: '1975-08-03',
    phone: '07700900022',
    address: '34 Iffley Road',
    city: 'Oxford',
    postcode: 'OX4 1EA',
    nhs: '9000000013',
  },
  {
    givenName: 'Patricia',
    familyName: 'Goddard',
    gender: 'FEMALE' as Gender,
    birthDate: '1958-02-14',
    phone: '07700900023',
    address: '8 Woodstock Road',
    city: 'Oxford',
    postcode: 'OX2 6HT',
    nhs: '9000000014',
  },
  {
    givenName: 'Michael',
    familyName: 'Ashworth',
    gender: 'MALE' as Gender,
    birthDate: '1969-12-28',
    phone: '07700900024',
    address: '22 Cowley Road',
    city: 'Oxford',
    postcode: 'OX4 1HZ',
    nhs: '9000000015',
  },
  {
    givenName: 'Janet',
    familyName: 'Ridgeway',
    gender: 'FEMALE' as Gender,
    birthDate: '1983-06-17',
    phone: '07700900025',
    address: '11 Parks Road',
    city: 'Oxford',
    postcode: 'OX1 3PH',
    nhs: '9000000016',
  },
  {
    givenName: 'Robert',
    familyName: 'Blackwell',
    gender: 'MALE' as Gender,
    birthDate: '1971-03-09',
    phone: '07700900026',
    address: '45 Headington Road',
    city: 'Oxford',
    postcode: 'OX3 7BP',
    nhs: '9000000017',
  },
  {
    givenName: 'Christine',
    familyName: 'Neville',
    gender: 'FEMALE' as Gender,
    birthDate: '1955-10-21',
    phone: '07700900027',
    address: '3 St Giles',
    city: 'Oxford',
    postcode: 'OX1 3JS',
    nhs: '9000000018',
  },
  {
    givenName: 'William',
    familyName: 'Cartwright',
    gender: 'MALE' as Gender,
    birthDate: '1948-07-05',
    phone: '07700900028',
    address: '19 Botley Road',
    city: 'Oxford',
    postcode: 'OX2 0AA',
    nhs: '9000000019',
  },
  {
    givenName: 'Elizabeth',
    familyName: 'Barrow',
    gender: 'FEMALE' as Gender,
    birthDate: '1966-01-31',
    phone: '07700900029',
    address: '7 Marston Road',
    city: 'Oxford',
    postcode: 'OX3 0EG',
    nhs: '9000000020',
  },
  // ── Additional Oakwood patients (20 more) ──────────────
  {
    givenName: 'Thomas',
    familyName: 'Greenwood',
    gender: 'MALE' as Gender,
    birthDate: '1978-05-14',
    phone: '07700900050',
    address: '12 Abingdon Road',
    city: 'Oxford',
    postcode: 'OX1 4PD',
    nhs: '9000000041',
  },
  {
    givenName: 'Helen',
    familyName: 'Wadsworth',
    gender: 'FEMALE' as Gender,
    birthDate: '1985-09-21',
    phone: '07700900051',
    address: '6 Summertown Parade',
    city: 'Oxford',
    postcode: 'OX2 7LG',
    nhs: '9000000042',
  },
  {
    givenName: 'Kenneth',
    familyName: 'Hurst',
    gender: 'MALE' as Gender,
    birthDate: '1953-01-07',
    phone: '07700900052',
    address: '31 Cumnor Hill',
    city: 'Cumnor',
    postcode: 'OX2 9HA',
    nhs: '9000000043',
  },
  {
    givenName: 'Barbara',
    familyName: 'Langton',
    gender: 'FEMALE' as Gender,
    birthDate: '1970-11-16',
    phone: '07700900053',
    address: '8 Kidlington Road',
    city: 'Kidlington',
    postcode: 'OX5 2DB',
    nhs: '9000000044',
  },
  {
    givenName: 'Raymond',
    familyName: 'Copley',
    gender: 'MALE' as Gender,
    birthDate: '1961-03-29',
    phone: '07700900054',
    address: '14 Witney Road',
    city: 'Eynsham',
    postcode: 'OX29 4PH',
    nhs: '9000000045',
  },
  {
    givenName: 'Maureen',
    familyName: 'Ellison',
    gender: 'FEMALE' as Gender,
    birthDate: '1957-08-10',
    phone: '07700900055',
    address: '22 Bicester Road',
    city: 'Kidlington',
    postcode: 'OX5 2LA',
    nhs: '9000000046',
  },
  {
    givenName: 'Derek',
    familyName: 'Norris',
    gender: 'MALE' as Gender,
    birthDate: '1964-06-02',
    phone: '07700900056',
    address: '9 Littlemore Road',
    city: 'Oxford',
    postcode: 'OX4 4PU',
    nhs: '9000000047',
  },
  {
    givenName: 'Sheila',
    familyName: 'Rawlings',
    gender: 'FEMALE' as Gender,
    birthDate: '1972-12-19',
    phone: '07700900057',
    address: '3 Wolvercote Green',
    city: 'Oxford',
    postcode: 'OX2 8BD',
    nhs: '9000000048',
  },
  {
    givenName: 'Graham',
    familyName: 'Pearce',
    gender: 'MALE' as Gender,
    birthDate: '1980-04-25',
    phone: '07700900058',
    address: '17 Rose Hill',
    city: 'Oxford',
    postcode: 'OX4 4HT',
    nhs: '9000000049',
  },
  {
    givenName: 'Valerie',
    familyName: 'Mortimer',
    gender: 'FEMALE' as Gender,
    birthDate: '1959-07-08',
    phone: '07700900059',
    address: '25 Kennington Road',
    city: 'Kennington',
    postcode: 'OX1 5PG',
    nhs: '9000000050',
  },
  {
    givenName: 'Brian',
    familyName: 'Sutcliffe',
    gender: 'MALE' as Gender,
    birthDate: '1967-02-13',
    phone: '07700900060',
    address: '41 Sandford Road',
    city: 'Oxford',
    postcode: 'OX4 4XN',
    nhs: '9000000051',
  },
  {
    givenName: 'Pauline',
    familyName: 'Jessop',
    gender: 'FEMALE' as Gender,
    birthDate: '1974-10-04',
    phone: '07700900061',
    address: '5 Osney Mead',
    city: 'Oxford',
    postcode: 'OX2 0EA',
    nhs: '9000000052',
  },
  {
    givenName: 'Malcolm',
    familyName: 'Crosby',
    gender: 'MALE' as Gender,
    birthDate: '1956-05-30',
    phone: '07700900062',
    address: '13 Wheatley Road',
    city: 'Wheatley',
    postcode: 'OX33 1XP',
    nhs: '9000000053',
  },
  {
    givenName: 'Sylvia',
    familyName: 'Whitmore',
    gender: 'FEMALE' as Gender,
    birthDate: '1982-01-17',
    phone: '07700900063',
    address: '7 Jericho Street',
    city: 'Oxford',
    postcode: 'OX2 6BU',
    nhs: '9000000054',
  },
  {
    givenName: 'Colin',
    familyName: 'Ainsworth',
    gender: 'MALE' as Gender,
    birthDate: '1969-09-06',
    phone: '07700900064',
    address: '20 Marston Ferry Road',
    city: 'Oxford',
    postcode: 'OX2 7EE',
    nhs: '9000000055',
  },
  {
    givenName: 'Linda',
    familyName: 'Broadbent',
    gender: 'FEMALE' as Gender,
    birthDate: '1976-03-12',
    phone: '07700900065',
    address: '11 Barton Lane',
    city: 'Oxford',
    postcode: 'OX3 9JX',
    nhs: '9000000056',
  },
  {
    givenName: 'Peter',
    familyName: 'Entwistle',
    gender: 'MALE' as Gender,
    birthDate: '1952-08-24',
    phone: '07700900066',
    address: '35 Woodstock Close',
    city: 'Woodstock',
    postcode: 'OX20 1TJ',
    nhs: '9000000057',
  },
  {
    givenName: 'Angela',
    familyName: 'Foxley',
    gender: 'FEMALE' as Gender,
    birthDate: '1963-11-28',
    phone: '07700900067',
    address: '2 Yarnton Road',
    city: 'Yarnton',
    postcode: 'OX5 1PB',
    nhs: '9000000058',
  },
  {
    givenName: 'Roy',
    familyName: 'Hathaway',
    gender: 'MALE' as Gender,
    birthDate: '1971-07-15',
    phone: '07700900068',
    address: '18 Cowley Centre',
    city: 'Oxford',
    postcode: 'OX4 3HS',
    nhs: '9000000059',
  },
  {
    givenName: 'Diane',
    familyName: 'Summerfield',
    gender: 'FEMALE' as Gender,
    birthDate: '1965-04-22',
    phone: '07700900069',
    address: '9 Headington Hill',
    city: 'Oxford',
    postcode: 'OX3 0BT',
    nhs: '9000000060',
  },
];

// ── Sunrise Care practitioners (4 additional + Emily Carter existing) ──
const sunrisePractitionerData = [
  {
    givenName: 'Thomas',
    familyName: 'Wells',
    gender: 'MALE' as Gender,
    email: 'thomas.wells@sunrise-care.local',
    phone: '07700900002',
    specialty: 'Care Work',
    role: 'CARER' as const,
  },
  {
    givenName: 'Sarah',
    familyName: 'Donovan',
    gender: 'FEMALE' as Gender,
    email: 'sarah.donovan@sunrise-care.local',
    phone: '07700900003',
    specialty: 'Physiotherapy',
    role: 'CLINICIAN' as const,
  },
  {
    givenName: 'James',
    familyName: 'Okonkwo',
    gender: 'MALE' as Gender,
    email: 'james.okonkwo@sunrise-care.local',
    phone: '07700900004',
    specialty: 'Mental Health Nursing',
    role: 'NURSE' as const,
  },
  {
    givenName: 'Priya',
    familyName: 'Sharma',
    gender: 'FEMALE' as Gender,
    email: 'priya.sharma@sunrise-care.local',
    phone: '07700900005',
    specialty: 'Dementia Care',
    role: 'CARER' as const,
  },
];

// ── Oakwood GP practitioners (5) ────────────────────────
const oakwoodPractitionerData = [
  {
    givenName: 'Richard',
    familyName: 'Hargreaves',
    gender: 'MALE' as Gender,
    email: 'richard.hargreaves@oakwood-gp.local',
    phone: '07700900070',
    specialty: 'General Practice',
    role: 'CLINICIAN' as const,
  },
  {
    givenName: 'Catherine',
    familyName: 'Bell',
    gender: 'FEMALE' as Gender,
    email: 'catherine.bell@oakwood-gp.local',
    phone: '07700900071',
    specialty: 'General Practice',
    role: 'CLINICIAN' as const,
  },
  {
    givenName: 'Amir',
    familyName: 'Patel',
    gender: 'MALE' as Gender,
    email: 'amir.patel@oakwood-gp.local',
    phone: '07700900072',
    specialty: 'General Practice (Diabetes & Endocrinology)',
    role: 'CLINICIAN' as const,
  },
  {
    givenName: 'Fiona',
    familyName: 'McAllister',
    gender: 'FEMALE' as Gender,
    email: 'fiona.mcallister@oakwood-gp.local',
    phone: '07700900073',
    specialty: 'Practice Nursing',
    role: 'NURSE' as const,
  },
  {
    givenName: 'Lucy',
    familyName: 'Chapman',
    gender: 'FEMALE' as Gender,
    email: 'lucy.chapman@oakwood-gp.local',
    phone: '07700900074',
    specialty: 'Practice Nursing (Chronic Disease Management)',
    role: 'NURSE' as const,
  },
];

async function main() {
  console.log('Seeding database...');

  // ── Clean existing seed data ─────────────────────────
  console.log('  Cleaning existing data...');
  await prisma.assessment.deleteMany();
  await prisma.assessmentTypeConfig.deleteMany();
  await prisma.specialtyConfig.deleteMany();
  await prisma.carePlanNote.deleteMany();
  await prisma.carePlanActivity.deleteMany();
  await prisma.carePlanGoal.deleteMany();
  await prisma.carePlan.deleteMany();
  await prisma.patientEvent.deleteMany();
  await prisma.patientIdentifier.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.practitioner.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // ── Create tenant organizations ──────────────────────
  const sunriseCare = await prisma.organization.create({
    data: {
      name: 'Sunrise Care Home',
      type: 'CARE_HOME',
      phone: '01234567890',
      email: 'info@sunrise-care.local',
      addressLine1: '42 Meadow Lane',
      city: 'Bristol',
      postalCode: 'BS1 4QA',
    },
  });

  const oakwoodGP = await prisma.organization.create({
    data: {
      name: 'Oakwood GP Practice',
      type: 'GP_PRACTICE',
      odsCode: 'Y12345',
      phone: '01345678901',
      email: 'reception@oakwood-gp.local',
      addressLine1: '10 High Street',
      city: 'Oxford',
      postalCode: 'OX1 1AA',
    },
  });

  console.log(`  Created orgs: ${sunriseCare.name}, ${oakwoodGP.name}`);

  // ── Create users ─────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'superadmin@care-solutions.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      tenantId: null,
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@sunrise-care.local',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: 'ADMIN',
      tenantId: sunriseCare.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@oakwood-gp.local',
      passwordHash,
      firstName: 'James',
      lastName: 'Thornton',
      role: 'ADMIN',
      tenantId: oakwoodGP.id,
    },
  });

  const sunriseNurseUser = await prisma.user.create({
    data: {
      email: 'nurse@sunrise-care.local',
      passwordHash,
      firstName: 'Emily',
      lastName: 'Carter',
      role: 'NURSE',
      tenantId: sunriseCare.id,
    },
  });

  // ── Create additional Sunrise practitioner users ─────
  const sunrisePractitionerUsers = [];
  for (const p of sunrisePractitionerData) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash,
        firstName: p.givenName,
        lastName: p.familyName,
        role: p.role,
        tenantId: sunriseCare.id,
      },
    });
    sunrisePractitionerUsers.push(user);
  }

  // ── Create Oakwood practitioner users ────────────────
  const oakwoodPractitionerUsers = [];
  for (const p of oakwoodPractitionerData) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash,
        firstName: p.givenName,
        lastName: p.familyName,
        role: p.role,
        tenantId: oakwoodGP.id,
      },
    });
    oakwoodPractitionerUsers.push(user);
  }

  console.log(
    '  Created users: superadmin, sunrise admin, oakwood admin, sunrise nurse + 4 sunrise practitioners, 5 oakwood practitioners',
  );

  // ── Create practitioners ─────────────────────────────
  await prisma.practitioner.create({
    data: {
      givenName: 'Emily',
      familyName: 'Carter',
      gender: 'FEMALE',
      email: 'nurse@sunrise-care.local',
      phone: '07700900001',
      specialty: 'Geriatric Nursing',
      organizationId: sunriseCare.id,
      tenantId: sunriseCare.id,
      userId: sunriseNurseUser.id,
    },
  });

  for (let i = 0; i < sunrisePractitionerData.length; i++) {
    const p = sunrisePractitionerData[i];
    await prisma.practitioner.create({
      data: {
        givenName: p.givenName,
        familyName: p.familyName,
        gender: p.gender,
        email: p.email,
        phone: p.phone,
        specialty: p.specialty,
        organizationId: sunriseCare.id,
        tenantId: sunriseCare.id,
        userId: sunrisePractitionerUsers[i].id,
      },
    });
  }

  console.log('  Created 5 practitioners for Sunrise Care');

  for (let i = 0; i < oakwoodPractitionerData.length; i++) {
    const p = oakwoodPractitionerData[i];
    await prisma.practitioner.create({
      data: {
        givenName: p.givenName,
        familyName: p.familyName,
        gender: p.gender,
        email: p.email,
        phone: p.phone,
        specialty: p.specialty,
        organizationId: oakwoodGP.id,
        tenantId: oakwoodGP.id,
        userId: oakwoodPractitionerUsers[i].id,
      },
    });
  }

  console.log('  Created 5 practitioners for Oakwood GP');

  // ── Create patients for Sunrise Care Home ────────────
  for (const p of sunrisePatients) {
    await prisma.patient.create({
      data: {
        givenName: p.givenName,
        familyName: p.familyName,
        gender: p.gender,
        birthDate: new Date(p.birthDate),
        phone: p.phone,
        addressLine1: p.address,
        city: p.city,
        postalCode: p.postcode,
        careSetting: p.careSetting,
        managingOrganizationId: sunriseCare.id,
        tenantId: sunriseCare.id,
        identifiers: {
          create: {
            type: 'NHS_NUMBER',
            system: 'https://fhir.nhs.uk/Id/nhs-number',
            value: p.nhs,
            isPrimary: true,
          },
        },
      },
    });
  }

  console.log(`  Created ${sunrisePatients.length} patients for Sunrise Care Home`);

  // ── Create patients for Oakwood GP Practice ──────────
  for (const p of oakwoodPatients) {
    await prisma.patient.create({
      data: {
        givenName: p.givenName,
        familyName: p.familyName,
        gender: p.gender,
        birthDate: new Date(p.birthDate),
        phone: p.phone,
        addressLine1: p.address,
        city: p.city,
        postalCode: p.postcode,
        managingOrganizationId: oakwoodGP.id,
        tenantId: oakwoodGP.id,
        identifiers: {
          create: {
            type: 'NHS_NUMBER',
            system: 'https://fhir.nhs.uk/Id/nhs-number',
            value: p.nhs,
            isPrimary: true,
          },
        },
      },
    });
  }

  console.log(`  Created ${oakwoodPatients.length} patients for Oakwood GP Practice`);

  // ── Create subscriptions ───────────────────────────────
  await prisma.subscription.create({
    data: {
      organizationId: sunriseCare.id,
      tier: 'PROFESSIONAL',
      status: 'ACTIVE',
      patientLimit: 500,
      userLimit: 50,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: oakwoodGP.id,
      tier: 'STARTER',
      status: 'ACTIVE',
      patientLimit: 50,
      userLimit: 10,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('  Created subscriptions: Sunrise (Professional), Oakwood (Starter)');

  // ── Create system assessment types ─────────────────
  const systemAssessmentTypes = [
    { code: 'FALLS_RISK', name: 'Falls Risk Assessment', sortOrder: 1 },
    { code: 'NUTRITION', name: 'Nutrition Assessment', sortOrder: 2 },
    { code: 'PRESSURE_ULCER', name: 'Pressure Ulcer Risk Assessment', sortOrder: 3 },
    { code: 'PAIN', name: 'Pain Assessment', sortOrder: 4 },
    { code: 'MOBILITY', name: 'Mobility Assessment', sortOrder: 5 },
    { code: 'MENTAL_HEALTH', name: 'Mental Health Assessment', sortOrder: 6 },
    { code: 'GENERAL', name: 'General Assessment', sortOrder: 7 },
  ];

  for (const t of systemAssessmentTypes) {
    await prisma.assessmentTypeConfig.create({
      data: { ...t, tenantId: null },
    });
  }

  console.log(`  Created ${systemAssessmentTypes.length} system assessment types`);

  // ── Create system specialty types ───────────────────
  const systemSpecialtyTypes = [
    { code: 'GENERAL_PRACTICE', name: 'General Practice', category: 'Medical', sortOrder: 1 },
    { code: 'GERIATRIC_MEDICINE', name: 'Geriatric Medicine', category: 'Medical', sortOrder: 2 },
    { code: 'PAEDIATRICS', name: 'Paediatrics', category: 'Medical', sortOrder: 3 },
    { code: 'CARDIOLOGY', name: 'Cardiology', category: 'Medical', sortOrder: 4 },
    { code: 'DERMATOLOGY', name: 'Dermatology', category: 'Medical', sortOrder: 5 },
    { code: 'PSYCHIATRY', name: 'Psychiatry', category: 'Medical', sortOrder: 6 },
    { code: 'PALLIATIVE_MEDICINE', name: 'Palliative Medicine', category: 'Medical', sortOrder: 7 },
    { code: 'GENERAL_NURSING', name: 'General Nursing', category: 'Nursing', sortOrder: 10 },
    { code: 'GERIATRIC_NURSING', name: 'Geriatric Nursing', category: 'Nursing', sortOrder: 11 },
    {
      code: 'MENTAL_HEALTH_NURSING',
      name: 'Mental Health Nursing',
      category: 'Nursing',
      sortOrder: 12,
    },
    { code: 'DISTRICT_NURSING', name: 'District Nursing', category: 'Nursing', sortOrder: 13 },
    { code: 'PRACTICE_NURSING', name: 'Practice Nursing', category: 'Nursing', sortOrder: 14 },
    { code: 'PHYSIOTHERAPY', name: 'Physiotherapy', category: 'Allied Health', sortOrder: 20 },
    {
      code: 'OCCUPATIONAL_THERAPY',
      name: 'Occupational Therapy',
      category: 'Allied Health',
      sortOrder: 21,
    },
    {
      code: 'SPEECH_THERAPY',
      name: 'Speech & Language Therapy',
      category: 'Allied Health',
      sortOrder: 22,
    },
    { code: 'DIETETICS', name: 'Dietetics', category: 'Allied Health', sortOrder: 23 },
    { code: 'PODIATRY', name: 'Podiatry', category: 'Allied Health', sortOrder: 24 },
    { code: 'CARE_WORK', name: 'Care Work', category: 'Social Care', sortOrder: 30 },
    { code: 'DEMENTIA_CARE', name: 'Dementia Care', category: 'Social Care', sortOrder: 31 },
    { code: 'SOCIAL_WORK', name: 'Social Work', category: 'Social Care', sortOrder: 32 },
  ];

  for (const t of systemSpecialtyTypes) {
    await prisma.specialtyConfig.create({
      data: { ...t, tenantId: null },
    });
  }

  console.log(`  Created ${systemSpecialtyTypes.length} system specialty types`);

  // ── Create care plans for Sunrise Care ──────────────
  const sunrisePatientsDb = await prisma.patient.findMany({
    where: { tenantId: sunriseCare.id },
    orderBy: { familyName: 'asc' },
  });

  const sunriseUsers = await prisma.user.findMany({
    where: { tenantId: sunriseCare.id },
  });
  const nurseUser = sunriseUsers.find((u) => u.role === 'NURSE') ?? sunriseUsers[0];
  const adminUser = sunriseUsers.find((u) => u.role === 'ADMIN') ?? sunriseUsers[0];

  const sunrisePractitioners = await prisma.practitioner.findMany({
    where: { tenantId: sunriseCare.id },
  });

  // Margaret Whitfield — Falls Prevention
  const margaret = sunrisePatientsDb.find((p) => p.familyName === 'Whitfield');
  if (margaret && nurseUser) {
    const cp1 = await prisma.carePlan.create({
      data: {
        title: 'Falls Prevention Plan',
        description:
          'Comprehensive falls prevention programme for Mrs Whitfield following a near-miss incident in the dining area.',
        status: 'ACTIVE' as CarePlanStatus,
        category: 'NURSING' as CarePlanCategory,
        startDate: new Date('2026-02-01'),
        nextReviewDate: new Date('2026-04-01'),
        patientId: margaret.id,
        authorId: nurseUser.id,
        tenantId: sunriseCare.id,
        goals: {
          create: [
            {
              description: 'Reduce fall risk by improving mobility and balance',
              status: 'ACTIVE' as GoalStatus,
              targetDate: new Date('2026-05-01'),
              measure: 'No falls or near-misses for 3 consecutive months',
            },
            {
              description: 'Ensure safe environment and appropriate footwear',
              status: 'ACCEPTED' as GoalStatus,
              measure: 'Environmental audit score above 90%',
            },
          ],
        },
        activities: {
          create: [
            {
              type: 'EXERCISE' as ActivityType,
              description: 'Chair-based balance exercises — 15 minutes twice daily',
              status: 'IN_PROGRESS' as ActivityStatus,
              scheduledAt: new Date('2026-03-15T09:00:00Z'),
              assigneeId: sunrisePractitioners[0]?.id,
            },
            {
              type: 'OBSERVATION' as ActivityType,
              description: 'Weekly mobility assessment using Tinetti scale',
              status: 'IN_PROGRESS' as ActivityStatus,
              scheduledAt: new Date('2026-03-18T10:00:00Z'),
              assigneeId: sunrisePractitioners[0]?.id,
            },
            {
              type: 'REFERRAL' as ActivityType,
              description: 'Refer to podiatry for footwear assessment',
              status: 'COMPLETED' as ActivityStatus,
            },
          ],
        },
        notes: {
          create: [
            {
              content:
                'Care plan initiated following near-miss in dining area on 28 Jan. Mrs Whitfield was unsteady when rising from chair.',
              authorId: nurseUser.id,
            },
            {
              content:
                'Tinetti assessment completed — score 19/28. Moderate fall risk. Exercises started.',
              authorId: nurseUser.id,
            },
          ],
        },
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: margaret.id,
        eventType: 'CARE_PLAN_CREATED',
        summary: `Care plan created: Falls Prevention Plan`,
        detail: { carePlanId: cp1.id } as any,
        recordedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  // Harold Braithwaite — Nutrition & Hydration
  const harold = sunrisePatientsDb.find((p) => p.familyName === 'Braithwaite');
  if (harold && adminUser) {
    const cp2 = await prisma.carePlan.create({
      data: {
        title: 'Nutrition & Hydration Plan',
        description:
          'Monitoring and improving nutritional intake following weight loss observed during monthly review.',
        status: 'ACTIVE' as CarePlanStatus,
        category: 'GENERAL' as CarePlanCategory,
        startDate: new Date('2026-02-15'),
        nextReviewDate: new Date('2026-03-30'),
        patientId: harold.id,
        authorId: adminUser.id,
        tenantId: sunriseCare.id,
        goals: {
          create: [
            {
              description: 'Stabilise weight and achieve minimum 2000kcal daily intake',
              status: 'ACTIVE' as GoalStatus,
              targetDate: new Date('2026-04-15'),
              measure: 'Weekly weight stable or increasing, food diary showing 2000kcal+',
            },
          ],
        },
        activities: {
          create: [
            {
              type: 'OBSERVATION' as ActivityType,
              description: 'Weekly weight monitoring — every Monday morning before breakfast',
              status: 'IN_PROGRESS' as ActivityStatus,
              scheduledAt: new Date('2026-03-17T07:30:00Z'),
            },
            {
              type: 'OTHER' as ActivityType,
              description: 'Offer fortified snacks between meals and high-calorie supplements',
              status: 'IN_PROGRESS' as ActivityStatus,
            },
          ],
        },
        notes: {
          create: [
            {
              content:
                'Weight loss of 2.3kg noted at monthly review. BMI now 19.2. Dietitian consulted.',
              authorId: adminUser.id,
            },
          ],
        },
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: harold.id,
        eventType: 'CARE_PLAN_CREATED',
        summary: `Care plan created: Nutrition & Hydration Plan`,
        detail: { carePlanId: cp2.id } as any,
        recordedById: adminUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  // Dorothy Chalmers — End of Life Care (Draft)
  const dorothy = sunrisePatientsDb.find((p) => p.familyName === 'Chalmers');
  if (dorothy && nurseUser) {
    const cp3 = await prisma.carePlan.create({
      data: {
        title: 'End of Life Care Plan',
        description:
          'Advance care plan drafted in discussion with Mrs Chalmers and her family. Pending final review.',
        status: 'DRAFT' as CarePlanStatus,
        category: 'PALLIATIVE' as CarePlanCategory,
        startDate: new Date('2026-03-10'),
        patientId: dorothy.id,
        authorId: nurseUser.id,
        tenantId: sunriseCare.id,
        goals: {
          create: [
            {
              description: 'Ensure comfort and dignity in line with patient preferences',
              status: 'PROPOSED' as GoalStatus,
              notes: 'Mrs Chalmers has expressed wish to remain at the care home',
            },
          ],
        },
        activities: {
          create: [
            {
              type: 'MEDICATION' as ActivityType,
              description: 'Review pain management with GP — anticipatory prescribing',
              status: 'NOT_STARTED' as ActivityStatus,
            },
            {
              type: 'APPOINTMENT' as ActivityType,
              description: 'Family meeting to discuss care preferences and DNAR status',
              status: 'NOT_STARTED' as ActivityStatus,
              scheduledAt: new Date('2026-03-20T14:00:00Z'),
            },
          ],
        },
        notes: {
          create: [
            {
              content:
                'Initial discussion held with Mrs Chalmers. She is clear she wishes to stay here. Family meeting being arranged.',
              authorId: nurseUser.id,
            },
          ],
        },
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: dorothy.id,
        eventType: 'CARE_PLAN_CREATED',
        summary: `Care plan created: End of Life Care Plan`,
        detail: { carePlanId: cp3.id } as any,
        recordedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  console.log('  Created 3 care plans for Sunrise Care patients');

  // ── Create assessments for Sunrise Care ─────────────
  // Margaret Whitfield — Falls Risk (Tinetti Scale)
  if (margaret && nurseUser) {
    const a1 = await prisma.assessment.create({
      data: {
        title: 'Falls Risk Assessment',
        description:
          'Tinetti Performance-Oriented Mobility Assessment following near-miss incident in dining area.',
        assessmentType: 'FALLS_RISK',
        toolName: 'Tinetti Scale',
        status: 'COMPLETED' as AssessmentStatus,
        score: 19,
        maxScore: 28,
        scoreInterpretation:
          'Score 19/28 indicates moderate fall risk. Balance component 10/16, gait component 9/12.',
        riskLevel: 'MEDIUM' as RiskLevel,
        performedAt: new Date('2026-02-01T10:30:00Z'),
        notes:
          'Mrs Whitfield was cooperative during assessment. Unsteadiness noted when turning and when rising from chair without armrests. Recommends chair-based exercises and environmental review.',
        recommendedActions: JSON.stringify([
          'Commence chair-based balance exercises twice daily',
          'Ensure walking frame is within reach at all times',
          'Review footwear — refer to podiatry',
          'Install additional grab rails in bathroom',
          'Reassess in 4 weeks',
        ]),
        patientId: margaret.id,
        performedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: margaret.id,
        eventType: 'ASSESSMENT',
        summary: 'Assessment performed: Falls Risk Assessment (Tinetti Scale — 19/28, Medium Risk)',
        detail: { assessmentId: a1.id, assessmentType: 'FALLS_RISK' } as any,
        recordedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });

    // Margaret Whitfield — Pain Assessment (Abbey Pain Scale) — REVIEWED
    const a2 = await prisma.assessment.create({
      data: {
        title: 'Pain Assessment',
        description: 'Abbey Pain Scale assessment for chronic lower back pain management.',
        assessmentType: 'PAIN',
        toolName: 'Abbey Pain Scale',
        status: 'REVIEWED' as AssessmentStatus,
        score: 4,
        maxScore: 18,
        scoreInterpretation:
          'Score 4/18 indicates mild pain. Vocalisation 1, facial expression 1, body language 1, behavioural change 1.',
        riskLevel: 'LOW' as RiskLevel,
        performedAt: new Date('2026-02-15T14:00:00Z'),
        notes:
          'Mild discomfort observed during transfers. Current pain management appears adequate. No changes to analgesic regimen required.',
        recommendedActions: JSON.stringify([
          'Continue current paracetamol 1g QDS',
          'Monitor during transfers and repositioning',
          'Reassess monthly or if behaviour changes',
        ]),
        patientId: margaret.id,
        performedById: nurseUser.id,
        reviewedById: adminUser.id,
        reviewedAt: new Date('2026-02-16T09:00:00Z'),
        tenantId: sunriseCare.id,
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: margaret.id,
        eventType: 'ASSESSMENT',
        summary: 'Assessment performed: Pain Assessment (Abbey Pain Scale — 4/18, Low Risk)',
        detail: { assessmentId: a2.id, assessmentType: 'PAIN' } as any,
        recordedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  // Harold Braithwaite — Nutrition (MUST Score)
  if (harold && nurseUser) {
    const a3 = await prisma.assessment.create({
      data: {
        title: 'Nutrition Screening',
        description:
          'Malnutrition Universal Screening Tool (MUST) assessment following observed weight loss.',
        assessmentType: 'NUTRITION',
        toolName: 'MUST Score',
        status: 'COMPLETED' as AssessmentStatus,
        score: 2,
        maxScore: 6,
        scoreInterpretation:
          'Score 2/6 — high risk of malnutrition. BMI score 1 (BMI 19.2), weight loss score 1 (2.3kg loss in 1 month), acute disease score 0.',
        riskLevel: 'MEDIUM' as RiskLevel,
        performedAt: new Date('2026-02-15T11:00:00Z'),
        notes:
          'Mr Braithwaite has lost 2.3kg over the past month. Appetite reduced, reports food "not tasting right". Dentures checked — fit appears adequate. Dietitian referral made.',
        recommendedActions: JSON.stringify([
          'Refer to dietitian for specialist assessment',
          'Commence food diary — record all intake for 7 days',
          'Offer fortified snacks between meals',
          'Weekly weight monitoring every Monday before breakfast',
          'Consider high-calorie oral supplements (Ensure Plus)',
          'Reassess MUST score in 4 weeks',
        ]),
        patientId: harold.id,
        performedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: harold.id,
        eventType: 'ASSESSMENT',
        summary: 'Assessment performed: Nutrition Screening (MUST — 2/6, Medium Risk)',
        detail: { assessmentId: a3.id, assessmentType: 'NUTRITION' } as any,
        recordedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  // Dorothy Chalmers — Pressure Ulcer Risk (Waterlow Scale)
  if (dorothy && nurseUser) {
    const a4 = await prisma.assessment.create({
      data: {
        title: 'Pressure Ulcer Risk Assessment',
        description:
          'Waterlow Pressure Ulcer Risk Assessment for Mrs Chalmers following admission to nursing care.',
        assessmentType: 'PRESSURE_ULCER',
        toolName: 'Waterlow Scale',
        status: 'COMPLETED' as AssessmentStatus,
        score: 18,
        maxScore: 64,
        scoreInterpretation:
          'Score 18/64 — high risk. Build/weight 2, skin type 2, sex/age 4, continence 2, mobility 3, appetite 2, tissue malnutrition 0, neurological deficit 0, surgery/trauma 0, medication 3.',
        riskLevel: 'HIGH' as RiskLevel,
        performedAt: new Date('2026-03-01T09:00:00Z'),
        notes:
          'Mrs Chalmers has limited mobility and requires assistance with repositioning. Skin intact on assessment but sacral area showing early signs of redness (non-blanching). Pressure-relieving mattress in situ.',
        recommendedActions: JSON.stringify([
          'Implement 2-hourly repositioning chart',
          'Ensure pressure-relieving mattress is correctly inflated',
          'Daily skin inspection — document any changes',
          'Barrier cream to sacral area after each episode of incontinence',
          'Nutritional assessment to support tissue integrity',
          'Reassess Waterlow weekly',
        ]),
        patientId: dorothy.id,
        performedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: dorothy.id,
        eventType: 'ASSESSMENT',
        summary:
          'Assessment performed: Pressure Ulcer Risk Assessment (Waterlow — 18/64, High Risk)',
        detail: { assessmentId: a4.id, assessmentType: 'PRESSURE_ULCER' } as any,
        recordedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  console.log('  Created 4 assessments for Sunrise Care patients');

  // ── Create medication catalogue ───────────────────────
  const medicationData = [
    {
      name: 'Paracetamol',
      genericName: 'Paracetamol',
      code: '322236009',
      form: 'TABLET' as MedicationForm,
      strength: '500mg',
      manufacturer: 'Teva UK',
    },
    {
      name: 'Ibuprofen',
      genericName: 'Ibuprofen',
      code: '387207008',
      form: 'TABLET' as MedicationForm,
      strength: '400mg',
      manufacturer: 'Reckitt Benckiser',
    },
    {
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      code: '27658006',
      form: 'CAPSULE' as MedicationForm,
      strength: '500mg',
      manufacturer: 'Sandoz',
    },
    {
      name: 'Amlodipine',
      genericName: 'Amlodipine besylate',
      code: '386864001',
      form: 'TABLET' as MedicationForm,
      strength: '5mg',
      manufacturer: 'Pfizer',
    },
    {
      name: 'Metformin',
      genericName: 'Metformin hydrochloride',
      code: '109081006',
      form: 'TABLET' as MedicationForm,
      strength: '500mg',
      manufacturer: 'Merck',
    },
    {
      name: 'Omeprazole',
      genericName: 'Omeprazole',
      code: '387137007',
      form: 'CAPSULE' as MedicationForm,
      strength: '20mg',
      manufacturer: 'AstraZeneca',
    },
    {
      name: 'Lactulose',
      genericName: 'Lactulose',
      code: '273945008',
      form: 'LIQUID' as MedicationForm,
      strength: '3.1-3.7g/5ml',
      manufacturer: 'Actavis',
    },
    {
      name: 'Morphine Sulphate',
      genericName: 'Morphine sulphate',
      code: '373529000',
      form: 'LIQUID' as MedicationForm,
      strength: '10mg/5ml',
      manufacturer: 'Martindale Pharma',
    },
    {
      name: 'Salbutamol Inhaler',
      genericName: 'Salbutamol',
      code: '372897005',
      form: 'INHALER' as MedicationForm,
      strength: '100mcg/dose',
      manufacturer: 'GlaxoSmithKline',
    },
    {
      name: 'Fentanyl Patch',
      genericName: 'Fentanyl',
      code: '373492002',
      form: 'PATCH' as MedicationForm,
      strength: '25mcg/hr',
      manufacturer: 'Janssen',
    },
  ];

  const medications = [];
  for (const med of medicationData) {
    const created = await prisma.medication.create({
      data: { ...med, tenantId: null },
    });
    medications.push(created);
  }
  console.log(`  Created ${medications.length} system medications`);

  // ── Create prescriptions for Sunrise Care ─────────────
  const paracetamol = medications.find((m) => m.name === 'Paracetamol')!;
  const amlodipine = medications.find((m) => m.name === 'Amlodipine')!;
  const omeprazole = medications.find((m) => m.name === 'Omeprazole')!;
  const lactulose = medications.find((m) => m.name === 'Lactulose')!;
  const morphine = medications.find((m) => m.name === 'Morphine Sulphate')!;

  // Margaret — Paracetamol QDS for pain
  if (margaret && nurseUser) {
    const rx1 = await prisma.medicationRequest.create({
      data: {
        status: 'ACTIVE' as MedicationRequestStatus,
        priority: 'routine',
        dosageText: '1 tablet four times daily',
        dose: '500mg',
        frequency: 'QDS',
        route: 'ORAL' as MedicationRoute,
        startDate: new Date('2026-02-01'),
        reasonText: 'Chronic lower back pain management',
        instructions: 'Take with or after food',
        maxDosePerDay: '4g',
        medicationId: paracetamol.id,
        patientId: margaret.id,
        prescriberId: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });

    // Record two administrations
    await prisma.medicationAdministration.create({
      data: {
        status: 'COMPLETED',
        occurredAt: new Date('2026-03-12T08:00:00Z'),
        doseGiven: '500mg',
        route: 'ORAL' as MedicationRoute,
        notes: 'Morning dose administered with breakfast',
        requestId: rx1.id,
        medicationId: paracetamol.id,
        patientId: margaret.id,
        performerId: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });
    await prisma.medicationAdministration.create({
      data: {
        status: 'COMPLETED',
        occurredAt: new Date('2026-03-12T12:00:00Z'),
        doseGiven: '500mg',
        route: 'ORAL' as MedicationRoute,
        requestId: rx1.id,
        medicationId: paracetamol.id,
        patientId: margaret.id,
        performerId: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: margaret.id,
        eventType: 'MEDICATION_PRESCRIBED',
        summary: 'Medication prescribed: Paracetamol 500mg QDS',
        detail: { prescriptionId: rx1.id } as any,
        recordedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });

    // Margaret — Amlodipine for hypertension
    const rx2 = await prisma.medicationRequest.create({
      data: {
        status: 'ACTIVE' as MedicationRequestStatus,
        priority: 'routine',
        dosageText: '1 tablet once daily in the morning',
        dose: '5mg',
        frequency: 'OD',
        route: 'ORAL' as MedicationRoute,
        startDate: new Date('2026-01-15'),
        reasonText: 'Hypertension',
        medicationId: amlodipine.id,
        patientId: margaret.id,
        prescriberId: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });

    await prisma.patientEvent.create({
      data: {
        patientId: margaret.id,
        eventType: 'MEDICATION_PRESCRIBED',
        summary: 'Medication prescribed: Amlodipine 5mg OD',
        detail: { prescriptionId: rx2.id } as any,
        recordedById: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  // Harold — Omeprazole + Lactulose
  if (harold && adminUser) {
    await prisma.medicationRequest.create({
      data: {
        status: 'ACTIVE' as MedicationRequestStatus,
        priority: 'routine',
        dosageText: '1 capsule once daily before breakfast',
        dose: '20mg',
        frequency: 'OD',
        route: 'ORAL' as MedicationRoute,
        startDate: new Date('2026-02-15'),
        reasonText: 'Gastro-oesophageal reflux',
        instructions: 'Take 30 minutes before food',
        medicationId: omeprazole.id,
        patientId: harold.id,
        prescriberId: adminUser.id,
        tenantId: sunriseCare.id,
      },
    });

    await prisma.medicationRequest.create({
      data: {
        status: 'ACTIVE' as MedicationRequestStatus,
        priority: 'routine',
        dosageText: '15ml twice daily',
        dose: '15ml',
        frequency: 'BD',
        route: 'ORAL' as MedicationRoute,
        startDate: new Date('2026-02-15'),
        reasonText: 'Constipation',
        medicationId: lactulose.id,
        patientId: harold.id,
        prescriberId: adminUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  // Dorothy — Morphine PRN (palliative)
  if (dorothy && nurseUser) {
    await prisma.medicationRequest.create({
      data: {
        status: 'DRAFT' as MedicationRequestStatus,
        priority: 'urgent',
        dosageText: '5mg every 4 hours as needed for pain',
        dose: '5mg',
        frequency: 'PRN',
        route: 'ORAL' as MedicationRoute,
        startDate: new Date('2026-03-10'),
        reasonText: 'Anticipatory prescribing — end of life pain management',
        instructions:
          'Administer when patient reports pain score > 4. Observe for respiratory depression.',
        asNeeded: true,
        asNeededReason: 'Pain score above 4',
        maxDosePerDay: '30mg',
        medicationId: morphine.id,
        patientId: dorothy.id,
        prescriberId: nurseUser.id,
        tenantId: sunriseCare.id,
      },
    });
  }

  console.log('  Created 5 prescriptions and 2 administrations for Sunrise Care patients');

  // ── Summary ──────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials (all passwords: Password123!):');
  console.log(
    '┌──────────────────────────────────────────────────┬─────────────┬──────────────────────┐',
  );
  console.log(
    '│ Email                                            │ Role        │ Tenant               │',
  );
  console.log(
    '├──────────────────────────────────────────────────┼─────────────┼──────────────────────┤',
  );
  console.log(
    '│ superadmin@care-solutions.local                  │ SUPER_ADMIN │ (cross-tenant)       │',
  );
  console.log(
    '│ admin@sunrise-care.local                         │ ADMIN       │ Sunrise Care Home    │',
  );
  console.log(
    '│ admin@oakwood-gp.local                           │ ADMIN       │ Oakwood GP Practice  │',
  );
  console.log(
    '│ nurse@sunrise-care.local                         │ NURSE       │ Sunrise Care Home    │',
  );
  console.log(
    '│ thomas.wells@sunrise-care.local                  │ CARER       │ Sunrise Care Home    │',
  );
  console.log(
    '│ sarah.donovan@sunrise-care.local                 │ CLINICIAN   │ Sunrise Care Home    │',
  );
  console.log(
    '│ james.okonkwo@sunrise-care.local                 │ NURSE       │ Sunrise Care Home    │',
  );
  console.log(
    '│ priya.sharma@sunrise-care.local                  │ CARER       │ Sunrise Care Home    │',
  );
  console.log(
    '│ richard.hargreaves@oakwood-gp.local              │ CLINICIAN   │ Oakwood GP Practice  │',
  );
  console.log(
    '│ catherine.bell@oakwood-gp.local                  │ CLINICIAN   │ Oakwood GP Practice  │',
  );
  console.log(
    '│ amir.patel@oakwood-gp.local                      │ CLINICIAN   │ Oakwood GP Practice  │',
  );
  console.log(
    '│ fiona.mcallister@oakwood-gp.local                │ NURSE       │ Oakwood GP Practice  │',
  );
  console.log(
    '│ lucy.chapman@oakwood-gp.local                    │ NURSE       │ Oakwood GP Practice  │',
  );
  console.log(
    '└──────────────────────────────────────────────────┴─────────────┴──────────────────────┘',
  );
  console.log(
    `\nPatients: ${sunrisePatients.length} in Sunrise Care, ${oakwoodPatients.length} in Oakwood GP`,
  );
  console.log('Practitioners: 5 in Sunrise Care, 5 in Oakwood GP');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
