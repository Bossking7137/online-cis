export const HEADER = {
  company: 'AFRICA ORIGIN KHUMOETSILE PTY LTD',
  reg: 'REG NUMBER: BW00005267841',
  exemption: 'EXEMPTION NUMBER: 11/1/8 (01)',
  address: 'PLOT 688, KWHAI ROAD, GABORONE',
  contact: 'CONTACT NUMBER: 77 716 452',
  title: 'CLIENT INFORMATION SHEET',
};

export const CONSENT_TEXT =
  'I, {name}, duly authorised to represent the above mentioned company and in ' +
  'my personal capacity agree and authorise Africa Origin Khumoetsile to:';
export const CONSENT_BULLETS = [
  'Make inquiries from any bank, financial institution or approved credit reference bureau in Botswana or any mentioned referee to confirm any information provided by the borrower.',
  'Seek information from any Bank, financial institution or approved credit reference bureau when assessing the borrower at any time during the existence of the borrower’s account.',
  'Obtaining from, exchanging with, or disclosing all credit and fraud information relating to the credit application to the Credit Reference Databank, Banks, Financial Institutions or credit reference bureau.',
];

export const SECTIONS = [
  { id: 'ref', title: 'REFEREE DETAILS',
    note: 'Who referred you to Africa Origin? If none, write N/A.',
    fields: [
    { id: 'referee_name', label: "Referee's Full Names", type: 'text' },
    { id: 'referee_contact', label: "Referee's Contact Details", type: 'text' },
  ]},
  { id: 's1', title: 'SECTION 1: APPLICANT DETAILS', fields: [
    { id: 'business_name', label: 'Applicant name (Business)', type: 'text' },
    { id: 'uin', label: 'Registration number (UIN)', type: 'text', hint: 'CIPA Registration Number' },
    { id: 'business_address', label: 'Business postal address', type: 'textarea' },
    { id: 'consent', label: 'I have read and agree to the Borrower Reference Consent above', type: 'checkbox' },
    { id: 'auth_name', label: 'Borrower duly Authorised name', type: 'text' },
    { id: 'consent_date', label: 'Date (today — filled automatically)', type: 'date', readonly: true },
  ]},
  { id: 's2', title: 'SECTION 2: APPLICANT PERSONAL DETAILS', note: 'Director Details', fields: [
    { id: 'title', label: 'Title', type: 'choice', options: ['Mr','Mrs','Miss','Dr','Prof'] },
    { id: 'full_names', label: 'Full Names', type: 'text' },
    { id: 'marital_status', label: 'Marital Status', type: 'choice', options: ['Single','Married COP','Married OCOP','Divorced','Widowed'] },
    { id: 'maiden_name', label: 'Maiden name (Married Woman)', type: 'text' },
    { id: 'dob', label: 'Date of Birth', type: 'date' },
    { id: 'omang', label: 'Omang / passport', type: 'text' },
    { id: 'nationality', label: 'Nationality', type: 'text' },
  ]},
  { id: 's3', title: 'SECTION 3: APPLICANT CONTACT DETAILS', fields: [
    { id: 'cell', label: 'Cell no (also for notification)', type: 'tel' },
    { id: 'tel_work', label: 'Telephone (Work)', type: 'tel' },
    { id: 'tel_home', label: 'Telephone (Home)', type: 'tel' },
    { id: 'email', label: 'Email', type: 'email' },
    { id: 'res_address', label: 'Residential Address', type: 'textarea' },
    { id: 'occupancy', label: 'Owner / Tenant', type: 'choice', options: ['Owner','Tenant'] },
    { id: 'years_at_address', label: 'Years at address', type: 'text' },
    { id: 'months_at_address', label: 'Months at address', type: 'text' },
    { id: 'home_village', label: 'Home Village', type: 'text' },
    { id: 'ward', label: 'Ward', type: 'text' },
    { id: 'headman', label: 'Headman', type: 'text' },
  ]},
  { id: 's4', title: 'SECTION 4: APPLICANT BANK DETAILS', fields: [
    { id: 'account_name', label: 'Account Name (Business Name)', type: 'text' },
    { id: 'bank_name', label: 'Bank name', type: 'text' },
    { id: 'branch', label: 'Branch name & code', type: 'text' },
    { id: 'account_number', label: 'Account Number', type: 'text' },
    { id: 'account_type', label: 'Account type', type: 'choice', options: ['Current','Savings','Other'] },
  ]},
  { id: 's5', title: 'SECTION 5: NEXT OF KIN', fields: [
    // Next of Kin 1 (spouse if married)
    { id: 'nok1_name', label: 'Next of Kin 1 — Name (spouse if married)', type: 'text' },
    { id: 'nok1_relationship', label: 'NOK1 Relationship', type: 'text' },
    { id: 'nok1_employer', label: 'NOK1 Employer name', type: 'text' },
    { id: 'nok1_tel_work', label: 'NOK1 Telephone (Work)', type: 'tel' },
    { id: 'nok1_cell', label: 'NOK1 Cell', type: 'tel' },
    { id: 'nok1_address', label: 'NOK1 Residential Address', type: 'textarea' },
    { id: 'nok1_village', label: 'NOK1 Home village', type: 'text' },
    { id: 'nok1_headman', label: 'NOK1 Headman name', type: 'text' },
    // Next of Kin 2 (not living with you)
    { id: 'nok2_name', label: 'Next of Kin 2 — Name (not living with you)', type: 'text' },
    { id: 'nok2_relationship', label: 'NOK2 Relationship', type: 'text' },
    { id: 'nok2_employer', label: 'NOK2 Employer name', type: 'text' },
    { id: 'nok2_tel_work', label: 'NOK2 Telephone (Work)', type: 'tel' },
    { id: 'nok2_cell', label: 'NOK2 Cell', type: 'tel' },
    { id: 'nok2_address', label: 'NOK2 Residential Address', type: 'textarea' },
    { id: 'nok2_village', label: 'NOK2 Home village', type: 'text' },
    { id: 'nok2_headman', label: 'NOK2 Headman name', type: 'text' },
  ]},
  { id: 'bo', title: 'BENEFICIAL OWNER DETAILS',
    note: 'Identify every individual who ultimately owns or controls the customer, directly or indirectly.',
    fields: [
    // Beneficial Owner 1
    { id: 'bo1_name', label: 'Beneficial Owner 1 — Full Name', type: 'text' },
    { id: 'bo1_dob', label: 'BO1 Date of Birth', type: 'date' },
    { id: 'bo1_nationality', label: 'BO1 Nationality', type: 'text' },
    { id: 'bo1_omang', label: 'BO1 Omang / Passport No.', type: 'text' },
    { id: 'bo1_address', label: 'BO1 Residential Address', type: 'textarea' },
    { id: 'bo1_direct_pct', label: 'BO1 Direct Ownership %', type: 'text' },
    { id: 'bo1_indirect_pct', label: 'BO1 Indirect Ownership %', type: 'text' },
    { id: 'bo1_control', label: 'BO1 Nature of control', type: 'choice', options: ['Shares','Voting','Other'] },
    // Beneficial Owner 2
    { id: 'bo2_name', label: 'Beneficial Owner 2 — Full Name', type: 'text' },
    { id: 'bo2_dob', label: 'BO2 Date of Birth', type: 'date' },
    { id: 'bo2_nationality', label: 'BO2 Nationality', type: 'text' },
    { id: 'bo2_omang', label: 'BO2 Omang / Passport No.', type: 'text' },
    { id: 'bo2_address', label: 'BO2 Residential Address', type: 'textarea' },
    { id: 'bo2_direct_pct', label: 'BO2 Direct Ownership %', type: 'text' },
    { id: 'bo2_indirect_pct', label: 'BO2 Indirect Ownership %', type: 'text' },
    { id: 'bo2_control', label: 'BO2 Nature of control', type: 'choice', options: ['Shares','Voting','Other'] },
  ]},
  { id: 'pep', title: 'POLITICALLY EXPOSED PERSON (PEP) DECLARATION', fields: [
    { id: 'pep_status', label: 'Are you a Politically Exposed Person (PEP)?', type: 'choice', options: ['Yes','No'] },
    { id: 'pep_name', label: 'If YES — Name', type: 'text' },
    { id: 'pep_position', label: 'Public Position / Function', type: 'text' },
    { id: 'pep_country', label: 'Country / Jurisdiction', type: 'text' },
    { id: 'pep_relationship', label: 'Relationship to Customer', type: 'text' },
  ]},
];

export const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);
const _byId = new Map(ALL_FIELDS.map(f => [f.id, f]));
export const fieldById = (id) => _byId.get(id);
