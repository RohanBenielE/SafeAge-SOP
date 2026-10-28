
import React, { useState } from 'react';

import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const SCHEMES = {
  ayushman: {
    title: 'Ayushman Vay Vandana Card',
    category: 'Healthcare',
    benefit:
      'Health cover of up to ₹5 lakh per year under AB PM-JAY, subject to scheme rules.',
    eligibility:
      'Senior citizens aged 70 years or above, irrespective of income.',
    documents:
      'Aadhaar or other required identity details, age verification, and a mobile phone for registration/verification.',
    steps:
      'Register through the official beneficiary portal or Ayushman app, or ask an empanelled hospital for assistance.',
    url: 'https://beneficiary.nha.gov.in/',
  },

  pension: {
    title: 'Tamil Nadu Old Age Pension',
    category: 'Financial support',
    benefit:
      'Monthly pension for eligible beneficiaries. The published Tamil Nadu scheme table lists ₹1,200 per month for IGNOAPS; verify the current amount and rules before applying.',
    eligibility:
      'A preliminary match is shown for people aged 60+ who report financial vulnerability. Official criteria can also require destitution/BPL status and other conditions.',
    documents:
      'Applicant photo, Aadhaar, Aadhaar consent where required, ration/smart card or address proof, self-declaration, identity proof, and bank passbook. The authority may ask for additional documents.',
    steps:
      'Check the relevant pension scheme and submit an application through the authorised Tamil Nadu e-Sevai channel or local Revenue Administration office.',
    url: 'https://tnesevai.tn.gov.in/',
    infoUrl: 'https://www.cra.tn.gov.in/about_schemes.php',
  },

  vayoshri: {
    title: 'Rashtriya Vayoshri Yojana',
    category: 'Assistive devices',
    benefit:
      'Eligible seniors may receive assistive devices such as walking aids, hearing aids, wheelchairs or spectacles, depending on assessed needs and scheme availability.',
    eligibility:
      'A preliminary match requires age 60+, an age-related difficulty, and monthly income within the published ₹15,000 limit. BPL/category and other scheme conditions must be verified.',
    documents:
      'Aadhaar or accepted identity proof, income certificate/proof, relevant BPL or pension proof if required, and medical assessment/certificate where applicable.',
    steps:
      'Check current registration and assessment arrangements through ALIMCO and its official scheme information.',
    url: 'https://alimco.in/content/36_1_Schemes',
  },

  elderline: {
    title: 'Senior Citizen Helpline — Elderline',
    category: 'Support and guidance',
    benefit:
      'Call for senior citizen support and guidance. Availability and the type of assistance can depend on the service and location.',
    eligibility:
      'For senior citizens seeking assistance. It is a support service, not a pension or cash-benefit scheme.',
    documents:
      'No documents are needed just to call the helpline. Keep relevant details available if the operator needs them.',
    steps:
      'Call 14567 to ask for assistance or guidance.',
    url: null,
  },
};

async function openOfficialLink(url) {
  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert(
      'Could not open link',
      'Please open the official website in your browser.'
    );
  }
}

function Toggle({ label, value, onChange }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.toggle}
    >
      <Text style={styles.toggleIcon}>
        {value ? '☑' : '☐'}
      </Text>
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

function SchemeCard({ scheme, matched }) {
  return (
    <View style={styles.schemeCard}>
      <Text style={styles.category}>{scheme.category}</Text>

      <Text style={styles.schemeTitle}>{scheme.title}</Text>

      <View style={styles.status}>
        <Text style={styles.statusText}>
          {matched
            ? 'Potential match — verify eligibility'
            : 'Support information'}
        </Text>
      </View>

      <Text style={styles.label}>Benefits</Text>
      <Text style={styles.body}>{scheme.benefit}</Text>

      <Text style={styles.label}>Eligibility</Text>
      <Text style={styles.body}>{scheme.eligibility}</Text>

      <Text style={styles.label}>Documents to prepare</Text>
      <Text style={styles.body}>{scheme.documents}</Text>

      <Text style={styles.label}>How to proceed</Text>
      <Text style={styles.body}>{scheme.steps}</Text>

      {scheme.url ? (
        <Pressable
          style={styles.primaryButton}
          onPress={() => openOfficialLink(scheme.url)}
        >
          <Text style={styles.primaryButtonText}>
            Open official website
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.primaryButton}
          onPress={() => openOfficialLink('tel:14567')}
        >
          <Text style={styles.primaryButtonText}>
            Call 14567
          </Text>
        </Pressable>
      )}

      {scheme.infoUrl ? (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => openOfficialLink(scheme.infoUrl)}
        >
          <Text style={styles.secondaryButtonText}>
            Read scheme details
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function GovernmentSchemes() {
  const [age, setAge] = useState('');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [income, setIncome] = useState('');
  const [financiallyVulnerable, setFinanciallyVulnerable] =
    useState(false);
  const [ageRelatedDifficulty, setAgeRelatedDifficulty] =
    useState(false);
  const [searched, setSearched] = useState(false);

  const ageNumber = Number(age);
  const incomeNumber = Number(income);

  const validAge =
    age.trim() !== '' &&
    Number.isFinite(ageNumber) &&
    ageNumber >= 0 &&
    ageNumber <= 120;

  const validIncome =
    income.trim() !== '' &&
    Number.isFinite(incomeNumber) &&
    incomeNumber >= 0;

  const isTamilNadu =
    stateName.trim().toLowerCase() === 'tamil nadu';

  const matches = [];

  if (searched && validAge && ageNumber >= 70) {
    matches.push({
      scheme: SCHEMES.ayushman,
      matched: true,
    });
  }

  if (
    searched &&
    validAge &&
    ageNumber >= 60 &&
    isTamilNadu &&
    financiallyVulnerable
  ) {
    matches.push({
      scheme: SCHEMES.pension,
      matched: true,
    });
  }

  if (
    searched &&
    validAge &&
    ageNumber >= 60 &&
    validIncome &&
    incomeNumber <= 15000 &&
    ageRelatedDifficulty
  ) {
    matches.push({
      scheme: SCHEMES.vayoshri,
      matched: true,
    });
  }

  // Always provide the helpline as an information option.
  matches.push({
    scheme: SCHEMES.elderline,
    matched: false,
  });

  const findSchemes = () => {
    if (!validAge) {
      Alert.alert(
        'Enter a valid age',
        'Enter an age between 0 and 120.'
      );
      return;
    }

    if (!stateName.trim()) {
      Alert.alert('Enter state', 'Enter the senior citizen’s state.');
      return;
    }

    if (income.trim() !== '' && !validIncome) {
      Alert.alert(
        'Check monthly income',
        'Enter a valid non-negative monthly income.'
      );
      return;
    }

    setSearched(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🏛️ Smart Scheme Finder</Text>

      <Text style={styles.intro}>
        Find government schemes that may suit the senior’s
        circumstances. Final eligibility is decided by the
        responsible government authority.
      </Text>

      <Text style={styles.label}>Senior citizen’s age</Text>
      <TextInput
        value={age}
        onChangeText={(value) => {
          setAge(value);
          setSearched(false);
        }}
        keyboardType="number-pad"
        placeholder="Enter age in years"
        style={styles.input}
        maxLength={3}
      />

      <Text style={styles.label}>State / Union Territory</Text>
      <TextInput
        value={stateName}
        onChangeText={(value) => {
          setStateName(value);
          setSearched(false);
        }}
        placeholder="e.g. Tamil Nadu"
        style={styles.input}
      />

      <Text style={styles.label}>
        Monthly income in rupees (optional unless checking RVY)
      </Text>
      <TextInput
        value={income}
        onChangeText={(value) => {
          setIncome(value);
          setSearched(false);
        }}
        keyboardType="numeric"
        placeholder="e.g. 12000"
        style={styles.input}
      />

      <Toggle
        label="The senior is financially vulnerable / may meet pension criteria"
        value={financiallyVulnerable}
        onChange={(value) => {
          setFinanciallyVulnerable(value);
          setSearched(false);
        }}
      />

      <Toggle
        label="The senior has an age-related difficulty, such as vision, hearing or mobility"
        value={ageRelatedDifficulty}
        onChange={(value) => {
          setAgeRelatedDifficulty(value);
          setSearched(false);
        }}
      />

      <Pressable
        style={styles.primaryButton}
        onPress={findSchemes}
      >
        <Text style={styles.primaryButtonText}>
          Find Potential Schemes
        </Text>
      </Pressable>

      {searched ? (
        <View style={styles.results}>
          <Text style={styles.resultsHeading}>
            Suggested schemes and services
          </Text>

          {matches.map(({ scheme, matched }) => (
            <SchemeCard
              key={scheme.title}
              scheme={scheme}
              matched={matched}
            />
          ))}

          <Text style={styles.disclaimer}>
            This is a preliminary information tool, not an
            official eligibility decision. Scheme rules,
            documents, funding and application availability can
            change. Confirm with the official portal or office
            before applying.
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          Enter the details and tap “Find Potential Schemes”.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DCE6F2',
    borderRadius: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#12355E',
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    color: '#52657A',
    marginTop: 8,
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#26496D',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B6C8DD',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    color: '#172B4D',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  toggleIcon: {
    fontSize: 21,
    color: '#105CC5',
  },
  toggleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  primaryButton: {
    backgroundColor: '#105CC5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#105CC5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#105CC5',
    fontWeight: '700',
  },
  results: {
    marginTop: 20,
  },
  resultsHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#12355E',
    marginBottom: 8,
  },
  schemeCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE6F2',
    marginTop: 12,
  },
  category: {
    fontSize: 12,
    fontWeight: '800',
    color: '#105CC5',
    textTransform: 'uppercase',
  },
  schemeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#153B67',
    marginTop: 5,
  },
  status: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F2FF',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 9,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    lineHeight: 19,
  },
});
